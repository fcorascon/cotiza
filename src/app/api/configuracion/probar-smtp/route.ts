import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { smtpPruebaSchema } from "@/lib/validations/configuracion";

const CONFIG_ID = "principal";

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
      return mensaje || "Error desconocido durante la prueba de conexión.";
  }
}

/**
 * POST /api/configuracion/probar-smtp
 * Verifica la conexión con el servidor SMTP usando los datos actuales
 * del formulario. Si se indica un correo de destino, además envía un
 * mensaje de prueba. La contraseña vacía reutiliza la almacenada.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = smtpPruebaSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "general");
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return NextResponse.json(
        { ok: false, error: "Datos inválidos", fieldErrors },
        { status: 400 }
      );
    }

    const { host, puerto, cifrado, usuario, password, destino } = parsed.data;

    // Si el formulario no trae contraseña, se usa la almacenada.
    let contrasena = password ?? "";
    if (!contrasena) {
      const config = await db.configuracion.findUnique({
        where: { id: CONFIG_ID },
      });
      contrasena = config?.smtpPassword ?? "";
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(puerto),
      secure: cifrado === "SSL",
      requireTLS: cifrado === "TLS",
      auth: contrasena ? { user: usuario, pass: contrasena } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    // 1) Verificación de conexión y credenciales.
    try {
      await transporter.verify();
    } catch (error) {
      return NextResponse.json({
        ok: false,
        etapa: "conexion",
        message: describirError(error),
      });
    }

    // 2) Envío de correo de prueba (opcional).
    if (destino) {
      try {
        const info = await transporter.sendMail({
          from: usuario,
          to: destino,
          subject: "Prueba de conexión SMTP",
          text: "Este es un mensaje de prueba generado por el Administrador de Presupuestos para verificar la conexión con su servidor de correo.",
        });
        return NextResponse.json({
          ok: true,
          message: `Conexión exitosa. Correo de prueba enviado a ${destino} (ID: ${info.messageId}).`,
        });
      } catch (error) {
        return NextResponse.json({
          ok: false,
          etapa: "envio",
          message: `La conexión fue exitosa, pero no se pudo enviar el correo de prueba: ${describirError(error)}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Conexión exitosa con el servidor SMTP.",
    });
  } catch (error) {
    console.error("POST /api/configuracion/probar-smtp error:", error);
    return NextResponse.json(
      { ok: false, message: "Error interno al probar la conexión SMTP." },
      { status: 500 }
    );
  }
}
