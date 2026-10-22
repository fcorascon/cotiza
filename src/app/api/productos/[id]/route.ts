import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productoSchema } from "@/lib/validations/producto";
import { calcularSubtotal } from "@/lib/productos-utils";

type RouteContext = { params: Promise<{ id: string }> };

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
 * PUT /api/productos/[id]
 * Actualiza un producto existente y recalcula el subtotal.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.producto.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El producto solicitado no existe" },
        { status: 404 }
      );
    }

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

    const producto = await db.producto.update({
      where: { id },
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
    return NextResponse.json(producto);
  } catch (error) {
    console.error("PUT /api/productos/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el producto" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productos/[id]
 * Elimina un producto del catálogo.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.producto.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El producto solicitado no existe" },
        { status: 404 }
      );
    }

    await db.producto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/productos/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el producto" },
      { status: 500 }
    );
  }
}
