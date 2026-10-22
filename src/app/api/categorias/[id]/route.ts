import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { categoriaSchema } from "@/lib/validations/categoria";

type RouteContext = { params: Promise<{ id: string }> };

function normalizar(valor: string) {
  return valor.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * PUT /api/categorias/[id]
 * Renombra una categoría. Evita duplicados con otras categorías.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.categoria.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La categoría solicitada no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = categoriaSchema.safeParse(body);

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

    const nueva = parsed.data.categoria;
    const otras = await db.categoria.findMany({ where: { id: { not: id } } });
    const duplicada = otras.some(
      (c) => normalizar(c.categoria) === normalizar(nueva)
    );
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La categoría "${nueva}" ya pertenece a otro registro.`,
          fieldErrors: { categoria: "Esta categoría ya existe" },
        },
        { status: 409 }
      );
    }

    const categoria = await db.categoria.update({
      where: { id },
      data: { categoria: nueva },
    });
    return NextResponse.json(categoria);
  } catch (error) {
    console.error("PUT /api/categorias/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la categoría" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categorias/[id]
 * Elimina una categoría del catálogo.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.categoria.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "La categoría solicitada no existe" },
        { status: 404 }
      );
    }

    await db.categoria.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la categoría porque está siendo utilizada por uno o más productos",
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/categorias/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar la categoría" },
      { status: 500 }
    );
  }
}
