import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validations/cliente";

/**
 * GET /api/clientes?q=<texto>
 * Lista todos los clientes. Si se envía `q`, filtra por razón social,
 * RFC, ciudad o estado (búsqueda insensible a mayúsculas).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const clientes = await db.cliente.findMany({
      where: q
        ? {
            OR: [
              { razonSocial: { contains: q } },
              { rfc: { contains: q } },
              { ciudad: { contains: q } },
              { estado: { contains: q } },
              { colonia: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("GET /api/clientes error:", error);
    return NextResponse.json(
      { error: "Error al obtener los clientes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes
 * Crea un nuevo cliente. Valida el cuerpo con el esquema zod y
 * rechaza RFC duplicados.
 */
export async function POST(request: NextRequest) {
  try {
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
    const duplicado = await db.cliente.findFirst({ where: { rfc } });
    if (duplicado) {
      return NextResponse.json(
        {
          error: `Ya existe un cliente registrado con el RFC ${rfc}.`,
          fieldErrors: { rfc: "Este RFC ya está registrado" },
        },
        { status: 409 }
      );
    }

    const cliente = await db.cliente.create({ data: parsed.data });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("POST /api/clientes error:", error);
    return NextResponse.json(
      { error: "Error al crear el cliente" },
      { status: 500 }
    );
  }
}
