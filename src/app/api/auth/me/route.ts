import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NOMBRE_COOKIE, opcionesCookie, obtenerSesionRequest } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Devuelve el usuario de la sesión actual (datos frescos de la BD).
 * Si el token es inválido, el usuario ya no existe o fue desactivado,
 * responde 401 y limpia la cookie.
 */
export async function GET(request: NextRequest) {
  const sesion = obtenerSesionRequest(request);
  if (!sesion) {
    return NextResponse.json({ error: "Sesión no iniciada" }, { status: 401 });
  }

  try {
    const usuarioBD = await db.usuario.findUnique({
      where: { id: sesion.uid },
    });

    if (!usuarioBD || !usuarioBD.activo) {
      const respuesta = NextResponse.json(
        { error: "La sesión ya no es válida" },
        { status: 401 }
      );
      respuesta.cookies.set(NOMBRE_COOKIE, "", {
        ...opcionesCookie(),
        maxAge: 0,
      });
      return respuesta;
    }

    return NextResponse.json({
      usuario: {
        id: usuarioBD.id,
        usuario: usuarioBD.usuario,
        nombre: usuarioBD.nombre,
        rol: usuarioBD.rol,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Error al consultar la sesión" },
      { status: 500 }
    );
  }
}
