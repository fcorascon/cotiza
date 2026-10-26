import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesionRequest } from "@/lib/auth";
import {
  analizarFilas,
  aplicarUnidades,
  claveCatalogo,
  descargarCsv,
  descargarMapaUnidades,
} from "@/lib/google-sheets";
import { ID_INTEGRACION, resolverHoja } from "@/lib/google-sheets-server";

export const dynamic = "force-dynamic";

type ProductoActual = {
  id: string;
  codigoSat: string;
  descripcion: string;
  unidadId: string;
  categoriaId: string;
  ivaId: string;
  costo: number;
  margen: number;
  subtotal: number;
  notas: string | null;
};

function mismoMonto(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * POST /api/google-sheets/importar
 * Importa (crea o actualiza) el catálogo de productos desde la hoja pública.
 * Nunca elimina productos. Las unidades, categorías y tasas de IVA que no
 * existan se crean automáticamente.
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

    // La pestaña de productos puede traer solo el id de unidad (idunidad);
    // en ese caso se resuelve con la pestaña "unidades" del mismo libro.
    if (
      analisis.filasValidas.some(
        (fila) => !fila.unidad || /^\d+$/.test(fila.unidad)
      )
    ) {
      const mapaUnidadesHoja = await descargarMapaUnidades(hoja.idHoja);
      aplicarUnidades(analisis, mapaUnidadesHoja);
    } else {
      aplicarUnidades(analisis, new Map());
    }

    if (analisis.columnas.descripcion === null) {
      return NextResponse.json(
        {
          error:
            "No se encontró la columna de descripción en la hoja. " +
            "Verifica los encabezados (DESCRIPCIÓN, PRODUCTO o NOMBRE).",
          encabezados: analisis.encabezados,
        },
        { status: 400 }
      );
    }

    if (analisis.filasValidas.length === 0) {
      return NextResponse.json(
        {
          error: "No hay filas válidas para importar.",
          erroresMuestra: analisis.errores.slice(0, 8),
        },
        { status: 400 }
      );
    }

    const [unidadesDb, categoriasDb, ivasDb, productosDb] = await Promise.all([
      db.unidad.findMany({ select: { id: true, unidad: true } }),
      db.categoria.findMany({ select: { id: true, categoria: true } }),
      db.iva.findMany({ select: { id: true, tasa: true } }),
      db.producto.findMany({
        select: {
          id: true,
          codigoSat: true,
          descripcion: true,
          unidadId: true,
          categoriaId: true,
          ivaId: true,
          costo: true,
          margen: true,
          subtotal: true,
          notas: true,
        },
      }),
    ]);

    const mapaUnidades = new Map<string, string>();
    for (const unidad of unidadesDb) {
      mapaUnidades.set(claveCatalogo(unidad.unidad), unidad.id);
    }
    const mapaCategorias = new Map<string, string>();
    for (const categoria of categoriasDb) {
      mapaCategorias.set(claveCatalogo(categoria.categoria), categoria.id);
    }
    const mapaIvas = new Map<number, string>();
    for (const iva of ivasDb) mapaIvas.set(iva.tasa, iva.id);

    const catalogosNuevos = {
      unidades: [] as string[],
      categorias: [] as string[],
      ivas: [] as number[],
    };

    async function obtenerUnidad(nombre: string): Promise<string> {
      const clave = claveCatalogo(nombre || "PZA") || "PZA";
      const existente = mapaUnidades.get(clave);
      if (existente) return existente;
      const creada = await db.unidad.create({ data: { unidad: clave } });
      mapaUnidades.set(clave, creada.id);
      catalogosNuevos.unidades.push(clave);
      return creada.id;
    }

    async function obtenerCategoria(nombre: string): Promise<string> {
      const clave = claveCatalogo(nombre || "SIN CATEGORIA") || "SIN CATEGORIA";
      const existente = mapaCategorias.get(clave);
      if (existente) return existente;
      const creada = await db.categoria.create({ data: { categoria: clave } });
      mapaCategorias.set(clave, creada.id);
      catalogosNuevos.categorias.push(clave);
      return creada.id;
    }

    async function obtenerIva(tasa: number): Promise<string> {
      const clave = Number.isFinite(tasa) ? tasa : 0;
      const existente = mapaIvas.get(clave);
      if (existente) return existente;
      const creada = await db.iva.create({ data: { tasa: clave } });
      mapaIvas.set(clave, creada.id);
      catalogosNuevos.ivas.push(clave);
      return creada.id;
    }

    const porDescripcion = new Map<string, ProductoActual>();
    const porSatDescripcion = new Map<string, ProductoActual>();
    for (const producto of productosDb) {
      const descripcion = claveCatalogo(producto.descripcion);
      const claveSat = `${producto.codigoSat.toUpperCase()}|${descripcion}`;
      const actual: ProductoActual = { ...producto };
      if (!porDescripcion.has(descripcion)) {
        porDescripcion.set(descripcion, actual);
      }
      porSatDescripcion.set(claveSat, actual);
    }

    let creados = 0;
    let actualizados = 0;
    let sinCambios = 0;
    let omitidos = 0;
    let costosConservados = 0;
    const errores: { fila: number; mensaje: string }[] = [];
    const advertencias = [...analisis.advertencias];
    const vistos = new Map<string, number>();

    for (const fila of analisis.filasValidas) {
      try {
        const claveDescripcion = claveCatalogo(fila.descripcion);
        if (vistos.has(claveDescripcion)) {
          omitidos++;
          advertencias.push(
            `Fila ${fila.fila}: descripción repetida en la hoja ` +
              `(ya importada en la fila ${vistos.get(claveDescripcion)}); se omitió.`
          );
          continue;
        }
        vistos.set(claveDescripcion, fila.fila);

        const unidadId = await obtenerUnidad(fila.unidad);
        const categoriaId = await obtenerCategoria(fila.categoria);
        const ivaId = await obtenerIva(fila.iva);

        const existente =
          porSatDescripcion.get(`${fila.codigoSat}|${claveDescripcion}`) ??
          porDescripcion.get(claveDescripcion);

        // La hoja no trae códigos SAT ("referencia" es una clave interna):
        // se conserva el código SAT ya curado del producto existente.
        const codigoSat = existente
          ? existente.codigoSat || fila.codigoSat
          : fila.codigoSat;

        // Precios: la hoja suele traer costo 0 con precio de venta. En ese
        // caso se conserva el costo capturado en la app y se deduce el
        // margen a partir del precio de la hoja.
        let costo = fila.costo;
        let margen = fila.margen;
        let subtotal = fila.subtotal;

        if (existente && fila.costo === 0) {
          if (existente.costo > 0) {
            costo = existente.costo;
            if (fila.subtotal > 0) {
              margen =
                Math.round((fila.subtotal / existente.costo - 1) * 10000) /
                100;
              subtotal = fila.subtotal;
              costosConservados++;
            } else {
              margen = existente.margen;
              subtotal = existente.subtotal;
            }
          } else if (fila.subtotal === 0) {
            costo = existente.costo;
            margen = existente.margen;
            subtotal = existente.subtotal;
          }
        }

        const datos = {
          codigoSat,
          descripcion: fila.descripcion,
          unidadId,
          categoriaId,
          ivaId,
          costo,
          margen,
          subtotal,
          notas: fila.notas,
        };

        if (!existente) {
          const nuevo = await db.producto.create({ data: datos });
          const actual: ProductoActual = { id: nuevo.id, ...datos };
          porDescripcion.set(claveDescripcion, actual);
          porSatDescripcion.set(`${codigoSat}|${claveDescripcion}`, actual);
          creados++;
        } else {
          const igual =
            existente.codigoSat === datos.codigoSat &&
            existente.unidadId === datos.unidadId &&
            existente.categoriaId === datos.categoriaId &&
            existente.ivaId === datos.ivaId &&
            mismoMonto(existente.costo, datos.costo) &&
            mismoMonto(existente.margen, datos.margen) &&
            mismoMonto(existente.subtotal, datos.subtotal) &&
            (existente.notas ?? null) === (datos.notas ?? null);

          if (igual) {
            sinCambios++;
          } else {
            await db.producto.update({
              where: { id: existente.id },
              data: datos,
            });
            Object.assign(existente, datos);
            actualizados++;
          }
        }

        for (const advertencia of fila.advertencias) {
          advertencias.push(`Fila ${fila.fila}: ${advertencia}`);
        }
      } catch (error) {
        errores.push({
          fila: fila.fila,
          mensaje:
            error instanceof Error
              ? error.message
              : "Error inesperado al importar la fila.",
        });
      }
    }

    if (costosConservados > 0) {
      advertencias.push(
        `${costosConservados} producto(s) existentes se actualizaron con el ` +
          "precio de la hoja conservando el costo capturado en la aplicación."
      );
    }

    const resumen = {
      totalFilas: analisis.totalFilas,
      validas: analisis.filasValidas.length,
      creados,
      actualizados,
      sinCambios,
      omitidos,
      costosConservados,
      errores: errores.length,
      advertencias: advertencias.slice(0, 50),
      catalogos: catalogosNuevos,
    };

    const ahora = new Date();
    await db.integracionSheets.upsert({
      where: { id: ID_INTEGRACION },
      create: {
        id: ID_INTEGRACION,
        url: hoja.url,
        gid: hoja.gid,
        ultimaImportacion: ahora,
        ultimoResumen: JSON.stringify(resumen),
      },
      update: {
        url: hoja.url,
        gid: hoja.gid,
        ultimaImportacion: ahora,
        ultimoResumen: JSON.stringify(resumen),
      },
    });

    return NextResponse.json({
      ok: true,
      resumen,
      erroresMuestra: errores.slice(0, 10),
    });
  } catch (error) {
    console.error("POST /api/google-sheets/importar error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al importar el catálogo desde Google Sheets.",
      },
      { status: 500 }
    );
  }
}
