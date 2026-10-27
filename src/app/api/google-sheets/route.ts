import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesionRequest } from "@/lib/auth";
import { extraerGid, extraerIdHoja, esSelectorHojaValido } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

const ID = "principal";

type ResumenImportacion = {
  creados?: number;
  actualizados?: number;
  sinCambios?: number;
  omitidos?: number;
  errores?: number;
  totalFilas?: number;
  advertencias?: string[];
};

type ResumenEnvio = {
  creados?: number;
  actualizados?: number;
  sinCambios?: number;
  errores?: number;
  advertencias?: string[];
};

function resumenPublico(fila: {
  url: string;
  gid: string;
  appsScriptUrl: string;
  ultimaImportacion: Date | null;
  ultimoResumen: string | null;
  ultimoEnvio: Date | null;
  ultimoResumenEnvio: string | null;
}) {
  const parse = <T,>(texto: string | null): T | null => {
    if (!texto) return null;
    try {
      return JSON.parse(texto) as T;
    } catch {
      return null;
    }
  };
  return {
    url: fila.url,
    gid: fila.gid,
    appsScriptUrl: fila.appsScriptUrl,
    ultimaImportacion: fila.ultimaImportacion,
    ultimoResumen: parse<ResumenImportacion>(fila.ultimoResumen),
    ultimoEnvio: fila.ultimoEnvio,
    ultimoResumenEnvio: parse<ResumenEnvio>(fila.ultimoResumenEnvio),
  };
}

/** GET /api/google-sheets — configuración guardada de la integración. */
export async function GET(request: NextRequest) {
  if (!obtenerSesionRequest(request)) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }
  try {
    const fila = await db.integracionSheets.findUnique({ where: { id: ID } });
    if (!fila) {
      return NextResponse.json({
        url: "",
        gid: "",
        appsScriptUrl: "",
        ultimaImportacion: null,
        ultimoResumen: null,
        ultimoEnvio: null,
        ultimoResumenEnvio: null,
      });
    }
    return NextResponse.json(resumenPublico(fila));
  } catch (error) {
    console.error("GET /api/google-sheets error:", error);
    return NextResponse.json(
      { error: "Error al obtener la configuración de Google Sheets" },
      { status: 500 }
    );
  }
}

/** PUT /api/google-sheets — guarda el enlace y la pestaña de la hoja. */
export async function PUT(request: NextRequest) {
  const sesion = obtenerSesionRequest(request);
  if (!sesion) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      url?: unknown;
      gid?: unknown;
      appsScriptUrl?: unknown;
    };

    let url = typeof body.url === "string" ? body.url.trim() : "";
    let gid = typeof body.gid === "string" ? body.gid.trim() : "";
    const appsScriptUrl =
      typeof body.appsScriptUrl === "string" ? body.appsScriptUrl.trim() : "";

    // Sin url en la petición se conserva la guardada (para actualizar solo
    // la pestaña o la URL del Apps Script).
    let guardada: { url: string; gid: string } | null = null;
    if (!url || !gid) {
      guardada = await db.integracionSheets.findUnique({
        where: { id: ID },
        select: { url: true, gid: true },
      });
      if (!url) url = guardada?.url ?? "";
    }

    if (!extraerIdHoja(url)) {
      return NextResponse.json(
        {
          error:
            "El enlace no parece una hoja de Google Sheets válida. " +
            "Debe contener /spreadsheets/d/<ID>.",
        },
        { status: 400 }
      );
    }

    if (gid && !esSelectorHojaValido(gid)) {
      return NextResponse.json(
        {
          error:
            "La pestaña debe ser un gid numérico o el nombre de la pestaña " +
            "(por ejemplo: productos).",
        },
        { status: 400 }
      );
    }

    if (!gid) gid = guardada?.gid || extraerGid(url) || "";

    if (
      appsScriptUrl &&
      !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(
        appsScriptUrl
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La URL del Apps Script debe terminar en /exec " +
            "(la copia al publicar la aplicación web).",
        },
        { status: 400 }
      );
    }

    const fila = await db.integracionSheets.upsert({
      where: { id: ID },
      create: { id: ID, url, gid, appsScriptUrl },
      update: { url, gid, appsScriptUrl },
    });

    return NextResponse.json(resumenPublico(fila));
  } catch (error) {
    console.error("PUT /api/google-sheets error:", error);
    return NextResponse.json(
      { error: "Error al guardar la configuración de Google Sheets" },
      { status: 500 }
    );
  }
}
