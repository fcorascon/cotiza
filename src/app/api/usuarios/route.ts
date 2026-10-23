import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { obtenerSesionAdmin } from "@/lib/auth";
import { crearUsuarioSchema } from "@/lib/validations/usuario";

/**
 * GET /api/usuarios (solo ADMIN)
 * Lista todos los usuarios ordenados por nombre de cuenta.
 * Nunca incluye el hash de la contraseña.
 */
export async function GET(request: NextRequest) {
  const sesion = obtenerSesionAdmin(request);
  if (!sesion) {
    return NextResponse.json(
      { error: "Solo un administrador puede consultar los usuarios" },
      { status: 401 }
    );
  }

  try {
    const usuarios = await db.usuario.findMany({
      select: {
        id: true,
        usuario: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { usuario: "asc" },
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("GET /api/usuarios error:", error);
    return NextResponse.json(
      { error: "Error al obtener los usuarios" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/usuarios (solo ADMIN)
 * Crea un usuario. Rechaza nombres de cuenta duplicados.
 */
export async function POST(request: NextRequest) {
  const sesion = obtenerSesionAdmin(request);
  if (!sesion) {
    return NextResponse.json(
      { error: "Solo un administrador puede registrar usuarios" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = crearUsuarioSchema.safeParse(body);

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

    const { usuario, nombre, rol, activo, password } = parsed.data;

    const duplicado = await db.usuario.findUnique({ where: { usuario } });
    if (duplicado) {
      return NextResponse.json(
        {
          error: `El usuario "${usuario}" ya existe.`,
          fieldErrors: { usuario: "Este nombre de cuenta ya está en uso" },
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const creado = await db.usuario.create({
      data: { usuario, nombre, rol, activo, passwordHash },
      select: {
        id: true,
        usuario: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    console.error("POST /api/usuarios error:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 }
    );
  }
}
