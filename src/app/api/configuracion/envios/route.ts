import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/configuracion/envios
 * Devuelve la bitácora de correos enviados (últimos 50), con el
 * cliente del presupuesto cuando el presupuesto sigue existiendo.
 */
export async function GET() {
  try {
    const envios = await db.envioCorreo.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        presupuesto: {
          select: { cliente: { select: { razonSocial: true } } },
        },
      },
    });
    return NextResponse.json(envios);
  } catch (error) {
    console.error("GET /api/configuracion/envios error:", error);
    return NextResponse.json(
      { error: "Error al obtener la bitácora de envíos" },
      { status: 500 }
    );
  }
}
