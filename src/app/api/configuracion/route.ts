import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { configuracionSchema } from "@/lib/validations/configuracion";
import { CONFIGURACION_DEFAULTS } from "@/lib/configuracion-defaults";

const CONFIG_ID = "principal";

/**
 * Obtiene la configuración única; si no existe, la crea con los
 * valores iniciales de la empresa.
 */
async function obtenerConfiguracion() {
  const existente = await db.configuracion.findUnique({
    where: { id: CONFIG_ID },
  });
  if (existente) return existente;
  return db.configuracion.create({
    data: { id: CONFIG_ID, ...CONFIGURACION_DEFAULTS },
  });
}

/**
 * GET /api/configuracion
 * Devuelve la configuración del sistema. Nunca expone smtpPassword.
 */
export async function GET() {
  try {
    const config = await obtenerConfiguracion();
    const { smtpPassword: _omitida, ...publica } = config;
    return NextResponse.json(publica);
  } catch (error) {
    console.error("GET /api/configuracion error:", error);
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/configuracion
 * Actualiza la configuración. La contraseña SMTP solo se reemplaza
 * cuando se envía un valor no vacío (campo de escritura privada).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = configuracionSchema.safeParse(body);

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

    const datos = parsed.data;
    await obtenerConfiguracion(); // asegura que exista el registro

    const passwordNueva = (datos.smtpPassword ?? "").trim();
    const data = {
      nombreComercial: datos.nombreComercial,
      razonLegal: datos.razonLegal,
      rfc: datos.rfc,
      direccion: datos.direccion,
      telefono: datos.telefono,
      email: datos.email,
      logo: datos.logo ?? null,
      smtpHost: datos.smtpHost,
      smtpPuerto: Number(datos.smtpPuerto),
      smtpCifrado: datos.smtpCifrado,
      smtpUsuario: datos.smtpUsuario,
      ...(passwordNueva ? { smtpPassword: passwordNueva } : {}),
      presupuestoColor: datos.presupuestoColor,
      presupuestoFila: datos.presupuestoFila,
      presupuestoLogo: datos.presupuestoLogo ?? null,
      reciboColor: datos.reciboColor,
      reciboFila: datos.reciboFila,
      reciboLogo: datos.reciboLogo ?? null,
    };

    const config = await db.configuracion.update({
      where: { id: CONFIG_ID },
      data,
    });

    const { smtpPassword: _omitida, ...publica } = config;
    return NextResponse.json(publica);
  } catch (error) {
    console.error("PUT /api/configuracion error:", error);
    return NextResponse.json(
      { error: "Error al guardar la configuración" },
      { status: 500 }
    );
  }
}
