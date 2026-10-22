import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unidadSchema } from "@/lib/validations/unidad";

/** Normaliza un nombre de unidad para comparaciones (minúsculas, 1 espacio). */
function normalizar(valor: string) {
  return valor.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * GET /api/unidades
 * Lista todas las unidades ordenadas alfabéticamente.
 */
export async function GET() {
  try {
    const unidades = await db.unidad.findMany({
      orderBy: { unidad: "asc" },
    });
    return NextResponse.json(unidades);
  } catch (error) {
    console.error("GET /api/unidades error:", error);
    return NextResponse.json(
      { error: "Error al obtener las unidades" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unidades
 * Crea una unidad. Rechaza duplicados (comparación sin distinción
 * de mayúsculas) porque el catálogo no admite unidades repetidas.
 */
export async function POST(request: NextRequest) {
  try {
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
    const existentes = await db.unidad.findMany();
    const duplicada = existentes.some(
      (u) => normalizar(u.unidad) === normalizar(nueva)
    );
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La unidad "${nueva}" ya está registrada en el catálogo.`,
          fieldErrors: { unidad: "Esta unidad ya existe" },
        },
        { status: 409 }
      );
    }

    const unidad = await db.unidad.create({ data: { unidad: nueva } });
    return NextResponse.json(unidad, { status: 201 });
  } catch (error) {
    console.error("POST /api/unidades error:", error);
    return NextResponse.json(
      { error: "Error al crear la unidad" },
      { status: 500 }
    );
  }
}
