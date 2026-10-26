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

function resumenPublico(fila: {
  url: string;
  gid: string;
  ultimaImportacion: Date | null;
  ultimoResumen: string | null;
}) {
  let resumen: ResumenImportacion | null = null;
  if (fila.ultimoResumen) {
    try {
      resumen = JSON.parse(fila.ultimoResumen) as ResumenImportacion;
    } catch {
      resumen = null;
    }
  }
  return {
    url: fila.url,
    gid: fila.gid,
    ultimaImportacion: fila.ultimaImportacion,
    ultimoResumen: resumen,
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
        ultimaImportacion: null,
        ultimoResumen: null,
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
    };

    const url = typeof body.url === "string" ? body.url.trim() : "";
    let gid = typeof body.gid === "string" ? body.gid.trim() : "";

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

    if (!gid) gid = extraerGid(url);

    const fila = await db.integracionSheets.upsert({
      where: { id: ID },
      create: { id: ID, url, gid },
      update: { url, gid },
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
