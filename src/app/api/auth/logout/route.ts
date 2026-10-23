import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, opcionesCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Cierra la sesión eliminando la cookie firmada.
 */
export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(NOMBRE_COOKIE, "", {
    ...opcionesCookie(),
    maxAge: 0,
  });
  return respuesta;
}
