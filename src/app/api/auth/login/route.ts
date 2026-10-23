import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  NOMBRE_COOKIE,
  crearToken,
  opcionesCookie,
  type RolUsuario,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations/usuario";

/**
 * POST /api/auth/login
 * Valida credenciales contra la tabla Usuario (hash bcrypt) y deja
 * la cookie de sesión firmada. El mensaje de error es intencionalmente
 * genérico para no revelar si existe el usuario.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Capture su usuario y contraseña" },
        { status: 400 }
      );
    }

    const { usuario, password } = parsed.data;
    const usuarioBD = await db.usuario.findUnique({
      where: { usuario: usuario.toLowerCase() },
    });

    if (!usuarioBD || !usuarioBD.activo) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const coincide = await bcrypt.compare(password, usuarioBD.passwordHash);
    if (!coincide) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const token = crearToken({
      uid: usuarioBD.id,
      usuario: usuarioBD.usuario,
      nombre: usuarioBD.nombre,
      rol: usuarioBD.rol as RolUsuario,
    });

    const respuesta = NextResponse.json({
      usuario: {
        id: usuarioBD.id,
        usuario: usuarioBD.usuario,
        nombre: usuarioBD.nombre,
        rol: usuarioBD.rol,
      },
    });
    respuesta.cookies.set(NOMBRE_COOKIE, token, opcionesCookie());
    return respuesta;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión. Intente nuevamente." },
      { status: 500 }
    );
  }
}
