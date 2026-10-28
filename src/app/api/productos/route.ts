import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productoSchema } from "@/lib/validations/producto";
import { calcularSubtotal } from "@/lib/productos-utils";

const INCLUYIR_RELACIONES = {
  unidad: true,
  categoria: true,
  iva: true,
} as const;

/**
 * Verifica que las relaciones seleccionadas existan en los catálogos.
 * Devuelve un mapa de errores por campo, o null si todo es válido.
 */
async function validarRelaciones(data: {
  unidadId: string;
  categoriaId: string;
  ivaId: string;
}): Promise<Record<string, string> | null> {
  const fieldErrors: Record<string, string> = {};

  const [unidad, categoria, iva] = await Promise.all([
    db.unidad.findUnique({ where: { id: data.unidadId } }),
    db.categoria.findUnique({ where: { id: data.categoriaId } }),
    db.iva.findUnique({ where: { id: data.ivaId } }),
  ]);

  if (!unidad) fieldErrors.unidadId = "La unidad seleccionada no existe";
  if (!categoria)
    fieldErrors.categoriaId = "La categoría seleccionada no existe";
  if (!iva) fieldErrors.ivaId = "La tasa de IVA seleccionada no existe";

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * GET /api/productos
 * - Sin parámetros: lista completa en formato LIGERO para la grid y el
 *   formulario de productos (sin marcas de tiempo; relaciones reducidas a
 *   los campos que la interfaz muestra).
 * - ?vista=combobox: formato compacto para el selector del presupuesto
 *   (id, descripción, código SAT, subtotal, unidad y tasa), con búsqueda
 *   opcional por descripción (?busqueda=texto) y tope de resultados
 *   (?limite=30, máx. 100; use limite=todos para el catálogo completo).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("vista") === "combobox") {
      const busqueda = (searchParams.get("busqueda") ?? "").trim();
      const limiteSolicitado = (searchParams.get("limite") ?? "30").trim();

      // Con limite=todos se devuelve el catálogo completo (sin tope).
      const sinTope = limiteSolicitado.toLowerCase() === "todos";
      const numero = Number(limiteSolicitado);
      const limite = sinTope
        ? undefined
        : Number.isFinite(numero) && numero > 0
          ? Math.min(Math.floor(numero), 100)
          : 30;

      const productos = await db.producto.findMany({
        where: busqueda
          ? { descripcion: { contains: busqueda } }
          : undefined,
        select: {
          id: true,
          descripcion: true,
          codigoSat: true,
          subtotal: true,
          unidad: { select: { unidad: true } },
          iva: { select: { tasa: true } },
        },
        orderBy: { descripcion: "asc" },
        take: limite,
      });

      const compactos = productos.map((producto) => ({
        id: producto.id,
        descripcion: producto.descripcion,
        codigoSat: producto.codigoSat,
        subtotal: producto.subtotal,
        unidad: producto.unidad.unidad,
        tasa: producto.iva.tasa,
      }));
      return NextResponse.json(compactos);
    }

    const productos = await db.producto.findMany({
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
        unidad: { select: { id: true, unidad: true } },
        categoria: { select: { id: true, categoria: true } },
        iva: { select: { id: true, tasa: true } },
      },
      orderBy: { descripcion: "asc" },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error("GET /api/productos error:", error);
    return NextResponse.json(
      { error: "Error al obtener los productos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productos
 * Crea un producto. El subtotal se calcula automáticamente a partir
 * del costo y el margen de ganancia (subtotal = costo × (1 + margen/100)).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = productoSchema.safeParse(body);

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

    const costo = Number(parsed.data.costo);
    const margen = Number(parsed.data.margen);
    if (Number.isNaN(costo) || Number.isNaN(margen)) {
      const fieldErrors: Record<string, string> = {};
      if (Number.isNaN(costo)) fieldErrors.costo = "Ingrese un costo válido";
      if (Number.isNaN(margen)) fieldErrors.margen = "Ingrese un margen válido";
      return NextResponse.json(
        { error: "Datos inválidos", fieldErrors },
        { status: 400 }
      );
    }

    const erroresRelacion = await validarRelaciones({
      unidadId: parsed.data.unidadId,
      categoriaId: parsed.data.categoriaId,
      ivaId: parsed.data.ivaId,
    });
    if (erroresRelacion) {
      return NextResponse.json(
        { error: "Datos inválidos", fieldErrors: erroresRelacion },
        { status: 400 }
      );
    }

    const producto = await db.producto.create({
      data: {
        codigoSat: parsed.data.codigoSat,
        descripcion: parsed.data.descripcion,
        unidadId: parsed.data.unidadId,
        categoriaId: parsed.data.categoriaId,
        ivaId: parsed.data.ivaId,
        costo,
        margen,
        subtotal: calcularSubtotal(costo, margen),
        notas: parsed.data.notas || null,
      },
      include: INCLUYIR_RELACIONES,
    });
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("POST /api/productos error:", error);
    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}
