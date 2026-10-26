import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesionRequest } from "@/lib/auth";
import { claveCatalogo } from "@/lib/google-sheets";
import { ID_INTEGRACION } from "@/lib/google-sheets-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/google-sheets/enviar
 * Empuja los productos de la base de datos hacia la hoja de cálculo
 * a través del Apps Script Web App configurado. La hoja es el destino:
 * filas nuevas se agregan y las existentes se actualizan si cambiaron;
 * nunca elimina filas de la hoja.
 */
export async function POST(request: NextRequest) {
  if (!obtenerSesionRequest(request)) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  try {
    const configuracion = await db.integracionSheets.findUnique({
      where: { id: ID_INTEGRACION },
    });

    const scriptUrl = configuracion?.appsScriptUrl?.trim();
    if (!scriptUrl) {
      return NextResponse.json(
        {
          error:
            "Primero guarda la URL del Apps Script (campo «App Script URL»). " +
            "Se copia al publicar la aplicación web de Google Apps Script.",
        },
        { status: 400 }
      );
    }

    const productos = await db.producto.findMany({
      orderBy: { descripcion: "asc" },
      include: {
        unidad: true,
        categoria: true,
        iva: true,
      },
    });

    if (productos.length === 0) {
      return NextResponse.json(
        { error: "No hay productos para enviar." },
        { status: 400 }
      );
    }

    const carga = {
      action: "sync",
      productos: productos.map((producto) => ({
        descripcion: producto.descripcion,
        unidad: producto.unidad?.unidad ?? "",
        categoria: producto.categoria?.categoria ?? "",
        iva: producto.iva?.tasa ?? 0,
        costo: producto.costo,
        margen: producto.margen,
        subtotal: producto.subtotal,
        notas: producto.notas ?? "",
        codigoSat: producto.codigoSat,
        clave: claveCatalogo(producto.descripcion),
      })),
    };

    let respuesta: Response;
    try {
      respuesta = await fetch(scriptUrl, {
        method: "POST",
        redirect: "follow",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(carga),
        signal: AbortSignal.timeout(300_000),
      });
    } catch (error) {
      const detalle =
        error instanceof Error ? error.message : "error de red desconocido";
      return NextResponse.json(
        {
          error: `No fue posible comunicarse con el Apps Script (${detalle}).`,
        },
        { status: 502 }
      );
    }

    const texto = await respuesta.text();
    let resultado: {
      ok?: boolean;
      creados?: number;
      actualizados?: number;
      sinCambios?: number;
      errores?: number;
      advertencias?: string[];
      error?: string;
    } | null = null;
    try {
      resultado = JSON.parse(texto);
    } catch {
      resultado = null;
    }

    if (!respuesta.ok || !resultado || resultado.ok !== true) {
      const detalle = resultado?.error ?? (texto || "").slice(0, 300);
      return NextResponse.json(
        {
          error:
            `El Apps Script respondió con un problema` +
            (detalle ? `: ${detalle}` : "."),
        },
        { status: 502 }
      );
    }

    const resumen = {
      creados: resultado.creados ?? 0,
      actualizados: resultado.actualizados ?? 0,
      sinCambios: resultado.sinCambios ?? 0,
      errores: resultado.errores ?? 0,
      advertencias: resultado.advertencias ?? [],
    };

    const hoy = new Date();
    await db.integracionSheets.update({
      where: { id: ID_INTEGRACION },
      data: {
        ultimoEnvio: hoy,
        ultimoResumenEnvio: JSON.stringify(resumen),
      },
    });

    return NextResponse.json({ ok: true, resumen, ultimoEnvio: hoy });
  } catch (error) {
    console.error("POST /api/google-sheets/enviar error:", error);
    return NextResponse.json(
      { error: "Error al enviar el catálogo a Google Sheets" },
      { status: 500 }
    );
  }
}
