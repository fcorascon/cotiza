import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extraerGid, extraerIdHoja, esSelectorHojaValido, type CampoColumna } from "@/lib/google-sheets";

/** Identificador del registro único de la integración. */
export const ID_INTEGRACION = "principal";

/** Etiqueta visible para cada campo del catálogo. */
export const ETIQUETAS_COLUMNA: Record<CampoColumna, string> = {
  descripcion: "Descripción",
  codigoSat: "Código SAT",
  unidad: "Unidad",
  categoria: "Categoría",
  iva: "IVA",
  costo: "Costo",
  margen: "Margen %",
  subtotal: "Precio de venta",
  notas: "Notas",
};

export type HojaResuelta =
  | { ok: true; url: string; gid: string; idHoja: string }
  | { ok: false; error: string; status: number };

/**
 * Resuelve el enlace/gid a usar: lo enviado en la petición o lo guardado
 * previamente. Devuelve un error legible cuando no hay enlace válido.
 */
export async function resolverHoja(
  _request: NextRequest,
  body: { url?: unknown; gid?: unknown }
): Promise<HojaResuelta> {
  const guardada = await db.integracionSheets.findUnique({
    where: { id: ID_INTEGRACION },
  });

  const url =
    typeof body.url === "string" && body.url.trim()
      ? body.url.trim()
      : guardada?.url ?? "";
  const gid =
    typeof body.gid === "string" && body.gid.trim()
      ? body.gid.trim()
      : guardada?.gid || extraerGid(url) || "";

  if (gid && !esSelectorHojaValido(gid)) {
    return {
      ok: false,
      status: 400,
      error:
        "La pestaña debe ser un gid numérico o el nombre de la pestaña " +
        "(por ejemplo: productos).",
    };
  }

  const idHoja = extraerIdHoja(url);
  if (!idHoja) {
    return {
      ok: false,
      status: 400,
      error:
        "Configura el enlace de la hoja de Google Sheets. " +
        "Debe contener /spreadsheets/d/<ID>.",
    };
  }

  return { ok: true, url, gid, idHoja };
}
