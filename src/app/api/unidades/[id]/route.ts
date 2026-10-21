import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unidadSchema } from "@/lib/validations/unidad";

type RouteContext = { params: Promise<{ id: string }> };

function normalizar(valor: string) {
  return valor.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * PUT /api/unidades/[id]
 * Renombra una unidad. Evita duplicados con otras unidades.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.unidad.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La unidad solicitada no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = unidadSchema.safeParse(body);

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

    const nueva = parsed.data.unidad;
    const otras = await db.unidad.findMany({ where: { id: { not: id } } });
    const duplicada = otras.some(
      (u) => normalizar(u.unidad) === normalizar(nueva)
    );
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La unidad "${nueva}" ya pertenece a otro registro.`,
          fieldErrors: { unidad: "Esta unidad ya existe" },
        },
        { status: 409 }
      );
    }

    const unidad = await db.unidad.update({
      where: { id },
      data: { unidad: nueva },
    });
    return NextResponse.json(unidad);
  } catch (error) {
    console.error("PUT /api/unidades/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la unidad" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/unidades/[id]
 * Elimina una unidad del catálogo.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.unidad.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La unidad solicitada no existe" },
        { status: 404 }
      );
    }

    await db.unidad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/unidades/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar la unidad" },
      { status: 500 }
    );
  }
}
