import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesionRequest } from "@/lib/auth";
import {
  analizarFilas,
  aplicarUnidades,
  claveCatalogo,
  descargarCsv,
  descargarMapaUnidades,
  type CampoColumna,
} from "@/lib/google-sheets";
import {
  ETIQUETAS_COLUMNA,
  resolverHoja,
} from "@/lib/google-sheets-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/google-sheets/probar
 * Descarga la hoja y devuelve una vista previa de lo que se importaría.
 * No modifica la base de datos.
 */
export async function POST(request: NextRequest) {
  if (!obtenerSesionRequest(request)) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      url?: unknown;
      gid?: unknown;
    };

    const hoja = await resolverHoja(request, body);
    if (!hoja.ok) {
      return NextResponse.json({ error: hoja.error }, { status: hoja.status });
    }

    let csv: string;
    try {
      csv = await descargarCsv(hoja.idHoja, hoja.gid);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No fue posible descargar la hoja.",
        },
        { status: 422 }
      );
    }

    const analisis = analizarFilas(csv);

    // Resuelve unidades cuando la hoja solo trae el id (idunidad).
    if (
      analisis.filasValidas.some(
        (fila) => !fila.unidad || /^\d+$/.test(fila.unidad)
      )
    ) {
      const mapaUnidades = await descargarMapaUnidades(hoja.idHoja);
      aplicarUnidades(analisis, mapaUnidades);
    } else {
      aplicarUnidades(analisis, new Map());
    }

    // Compara con el catálogo actual para informar cuántos son nuevos.
    const productosDb = await db.producto.findMany({
      select: { descripcion: true },
    });
    const existentes = new Set(
      productosDb.map((producto) => claveCatalogo(producto.descripcion))
    );
    const vistas = new Set<string>();
    let nuevos = 0;
    let coincidencias = 0;
    let repetidas = 0;
    for (const fila of analisis.filasValidas) {
      const clave = claveCatalogo(fila.descripcion);
      if (vistas.has(clave)) {
        repetidas++;
        continue;
      }
      vistas.add(clave);
      if (existentes.has(clave)) coincidencias++;
      else nuevos++;
    }

    return NextResponse.json({
      ok: true,
      idHoja: hoja.idHoja,
      gid: hoja.gid,
      encabezados: analisis.encabezados,
      columnas: (Object.keys(ETIQUETAS_COLUMNA) as CampoColumna[]).map(
        (campo) => ({
          campo,
          etiqueta: ETIQUETAS_COLUMNA[campo],
          encabezado: analisis.columnasUsadas[campo] ?? null,
        })
      ),
      totalFilas: analisis.totalFilas,
      validas: analisis.filasValidas.length,
      coincidencias,
      nuevos,
      repetidas,
      errores: analisis.errores.length,
      erroresMuestra: analisis.errores.slice(0, 8),
      advertencias: analisis.advertencias,
      ejemplos: analisis.filasValidas.slice(0, 6).map((fila) => ({
        fila: fila.fila,
        descripcion: fila.descripcion,
        codigoSat: fila.codigoSat,
        unidad: fila.unidad || "(sin unidad)",
        categoria: fila.categoria || "(sin categoría)",
        iva: fila.iva,
        costo: fila.costo,
        margen: fila.margen,
        subtotal: fila.subtotal,
      })),
    });
  } catch (error) {
    console.error("POST /api/google-sheets/probar error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al leer la hoja de cálculo.",
      },
      { status: 500 }
    );
  }
}
