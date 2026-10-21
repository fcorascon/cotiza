import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoriaSchema } from "@/lib/validations/categoria";

/** Normaliza un nombre de categoría para comparaciones (minúsculas, 1 espacio). */
function normalizar(valor: string) {
  return valor.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * GET /api/categorias
 * Lista todas las categorías ordenadas alfabéticamente.
 */
export async function GET() {
  try {
    const categorias = await db.categoria.findMany({
      orderBy: { categoria: "asc" },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error("GET /api/categorias error:", error);
    return NextResponse.json(
      { error: "Error al obtener las categorías" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categorias
 * Crea una categoría. Rechaza duplicados (comparación sin distinción
 * de mayúsculas) porque el catálogo no admite categorías repetidas.
 */
export async function POST(request: NextRequest) {
  try {
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
    const existentes = await db.categoria.findMany();
    const duplicada = existentes.some(
      (c) => normalizar(c.categoria) === normalizar(nueva)
    );
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La categoría "${nueva}" ya está registrada en el catálogo.`,
          fieldErrors: { categoria: "Esta categoría ya existe" },
        },
        { status: 409 }
      );
    }

    const categoria = await db.categoria.create({
      data: { categoria: nueva },
    });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    console.error("POST /api/categorias error:", error);
    return NextResponse.json(
      { error: "Error al crear la categoría" },
      { status: 500 }
    );
  }
}
