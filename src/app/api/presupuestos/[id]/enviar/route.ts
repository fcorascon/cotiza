import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { envioCorreoSchema } from "@/lib/validations/configuracion";
import {
  asuntoPorDefecto,
  asuntoReciboPorDefecto,
  crearHtmlPresupuesto,
  crearHtmlReciboMercancias,
  folioPresupuesto,
} from "@/lib/correo-plantilla";

type RouteContext = { params: Promise<{ id: string }> };

const CONFIG_ID = "principal";

const SELECCION_CLIENTE = {
  id: true,
  razonSocial: true,
  rfc: true,
  calle: true,
  numero: true,
  colonia: true,
  codigoPostal: true,
  ciudad: true,
  estado: true,
  telefono: true,
  email: true,
} as const;

/** Mensaje legible según el código de error de nodemailer. */
function describirError(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const mensaje = err?.message ?? "";
  switch (err?.code) {
    case "EAUTH":
      return "El servidor rechazó las credenciales (usuario o contraseña incorrectos).";
    case "ETIMEDOUT":
      return "El servidor de correo no respondió (tiempo de espera agotado).";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "No fue posible resolver el host de correo. Verifique el nombre del servidor.";
    case "ECONNREFUSED":
      return "La conexión fue rechazada. Verifique el host y el puerto.";
    case "ECERT":
      return "El certificado SSL/TLS del servidor no es válido.";
    default:
      if (/getaddrinfo|ENOTFOUND/i.test(mensaje)) {
        return "No fue posible resolver el host de correo. Verifique el nombre del servidor.";
      }
      if (/timeout|ETIMEDOUT/i.test(mensaje)) {
        return "El servidor de correo no respondió (tiempo de espera agotado).";
      }
      if (/refused|ECONNREFUSED/i.test(mensaje)) {
        return "La conexión fue rechazada. Verifique el host y el puerto.";
      }
      return mensaje || "Error desconocido durante el envío del correo.";
  }
}

/**
 * POST /api/presupuestos/[id]/enviar
 * Envía el presupuesto por correo electrónico usando el servidor SMTP
 * configurado en la Configuración del sistema y registra el resultado
 * en la bitácora de envíos (EnvioCorreo).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = envioCorreoSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "general");
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return NextResponse.json(
        { error: "Datos inválidos", fieldErrors },
        { status: 400 }
      );
    }

    const { destino, asunto, mensaje } = parsed.data;
    /** Modo del correo: presupuesto con montos (default) o recibo de
     * mercancía sin valores monetarios. */
    const modo =
      typeof (body as { modo?: unknown }).modo === "string" &&
      (body as { modo: string }).modo.toLowerCase() === "recibo"
        ? "recibo"
        : "presupuesto";

    const presupuesto = await db.presupuesto.findUnique({
      where: { id },
      include: {
        cliente: { select: SELECCION_CLIENTE },
        items: { orderBy: { orden: "asc" } },
      },
    });
    if (!presupuesto) {
      return NextResponse.json(
        { error: "El presupuesto no existe" },
        { status: 404 }
      );
    }

    const config = await db.configuracion.findUnique({
      where: { id: CONFIG_ID },
    });
    if (!config) {
      return NextResponse.json(
        {
          error:
            "La configuración del sistema no existe. Entre a Configuración y guárdela primero.",
        },
        { status: 400 }
      );
    }

    if (!config.smtpHost || !config.smtpUsuario || !config.smtpPassword) {
      return NextResponse.json(
        {
          error:
            "El servidor de correo no está configurado. Complete los datos SMTP en la sección Configuración.",
        },
        { status: 400 }
      );
    }

    const esRecibo = modo === "recibo";
    const asuntoFinal =
      asunto ||
      (esRecibo
        ? asuntoReciboPorDefecto(presupuesto, config)
        : asuntoPorDefecto(presupuesto, config));
    const html = esRecibo
      ? crearHtmlReciboMercancias(presupuesto, config, mensaje || undefined)
      : crearHtmlPresupuesto(presupuesto, config, mensaje || undefined);

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPuerto,
      secure: config.smtpCifrado === "SSL",
      requireTLS: config.smtpCifrado === "TLS",
      auth: { user: config.smtpUsuario, pass: config.smtpPassword },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    try {
      const info = await transporter.sendMail({
        from: `"${config.nombreComercial}" <${config.smtpUsuario}>`,
        to: destino,
        subject: asuntoFinal,
        html,
        text: [
          esRecibo
            ? `RECIBO DE MERCANCÍA ${folioReciboMercancia(presupuesto.id)}`
            : `PRESUPUESTO ${folioPresupuesto(presupuesto.id)}`,
          `Cliente: ${presupuesto.cliente.razonSocial}`,
          `Fecha: ${presupuesto.fecha}`,
          "",
          ...(mensaje ? [mensaje, ""] : []),
          "Este mensaje continúa en formato HTML; ábralo con un cliente compatible.",
        ].join("\n"),
      });

      const envio = await db.envioCorreo.create({
        data: {
          presupuestoId: presupuesto.id,
          destino,
          asunto: asuntoFinal,
          estado: "ENVIADO",
          messageId: info.messageId,
        },
      });

      return NextResponse.json({
        ok: true,
        id: envio.id,
        message: `Correo enviado a ${destino} (ID: ${info.messageId}).`,
      });
    } catch (error) {
      const descripcion = describirError(error);

      await db.envioCorreo.create({
        data: {
          presupuestoId: presupuesto.id,
          destino,
          asunto: asuntoFinal,
          estado: "ERROR",
          error: descripcion.slice(0, 500),
        },
      });

      return NextResponse.json(
        { ok: false, error: `No se pudo enviar el correo: ${descripcion}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("POST /api/presupuestos/[id]/enviar error:", error);
    return NextResponse.json(
      { error: "Error interno al enviar el correo" },
      { status: 500 }
    );
  }
}
