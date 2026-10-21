import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ivaSchema } from "@/lib/validations/iva";

type RouteContext = { params: Promise<{ id: string }> };

function formatearTasa(tasa: number) {
  return `${tasa}%`;
}

/**
 * PUT /api/ivas/[id]
 * Actualiza una tasa de IVA. Evita duplicados con otras tasas.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.iva.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La tasa de IVA solicitada no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = ivaSchema.safeParse(body);

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

    const tasa = Number(parsed.data.tasa);
    if (Number.isNaN(tasa)) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          fieldErrors: { tasa: "Ingrese un porcentaje válido (ej. 16)" },
        },
        { status: 400 }
      );
    }

    const otras = await db.iva.findMany({ where: { id: { not: id } } });
    const duplicada = otras.some((i) => i.tasa === tasa);
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La tasa ${formatearTasa(tasa)} ya pertenece a otro registro.`,
          fieldErrors: { tasa: "Esta tasa de IVA ya existe" },
        },
        { status: 409 }
      );
    }

    const iva = await db.iva.update({
      where: { id },
      data: { tasa },
    });
    return NextResponse.json(iva);
  } catch (error) {
    console.error("PUT /api/ivas/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la tasa de IVA" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ivas/[id]
 * Elimina una tasa de IVA del catálogo.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.iva.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La tasa de IVA solicitada no existe" },
        { status: 404 }
      );
    }

    await db.iva.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ivas/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar la tasa de IVA" },
      { status: 500 }
    );
  }
}
