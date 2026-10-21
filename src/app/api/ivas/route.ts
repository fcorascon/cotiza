import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ivaSchema } from "@/lib/validations/iva";

/**
 * Formatea una tasa numérica para mostrarla en mensajes (ej. 16 → "16%").
 */
function formatearTasa(tasa: number) {
  return `${tasa}%`;
}

/**
 * GET /api/ivas
 * Lista todas las tasas de IVA ordenadas de menor a mayor.
 */
export async function GET() {
  try {
    const ivas = await db.iva.findMany({
      orderBy: { tasa: "asc" },
    });
    return NextResponse.json(ivas);
  } catch (error) {
    console.error("GET /api/ivas error:", error);
    return NextResponse.json(
      { error: "Error al obtener las tasas de IVA" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ivas
 * Crea una tasa de IVA. Rechaza duplicados porque el catálogo
 * no admite la misma tasa dos veces.
 */
export async function POST(request: NextRequest) {
  try {
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

    const existentes = await db.iva.findMany();
    const duplicada = existentes.some((i) => i.tasa === tasa);
    if (duplicada) {
      return NextResponse.json(
        {
          error: `La tasa ${formatearTasa(tasa)} ya está registrada en el catálogo.`,
          fieldErrors: { tasa: "Esta tasa de IVA ya existe" },
        },
        { status: 409 }
      );
    }

    const iva = await db.iva.create({
      data: { tasa },
    });
    return NextResponse.json(iva, { status: 201 });
  } catch (error) {
    console.error("POST /api/ivas error:", error);
    return NextResponse.json(
      { error: "Error al crear la tasa de IVA" },
      { status: 500 }
    );
  }
}
