import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validations/cliente";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/clientes/[id]
 * Actualiza un cliente existente. Valida el cuerpo y evita
 * duplicar el RFC de otro cliente.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.cliente.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El cliente solicitado no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = clienteSchema.safeParse(body);

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

    const rfc = parsed.data.rfc;
    const duplicado = await db.cliente.findFirst({
      where: { rfc, id: { not: id } },
    });
    if (duplicado) {
      return NextResponse.json(
        {
          error: `El RFC ${rfc} ya pertenece a otro cliente.`,
          fieldErrors: { rfc: "Este RFC ya está registrado" },
        },
        { status: 409 }
      );
    }

    const cliente = await db.cliente.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error("PUT /api/clientes/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el cliente" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clientes/[id]
 * Elimina un cliente por su id.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.cliente.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El cliente solicitado no existe" },
        { status: 404 }
      );
    }

    await db.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el cliente porque está siendo utilizado por uno o más presupuestos",
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/clientes/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el cliente" },
      { status: 500 }
    );
  }
}
