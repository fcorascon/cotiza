import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { obtenerSesionAdmin } from "@/lib/auth";
import { actualizarUsuarioSchema } from "@/lib/validations/usuario";

type RouteContext = { params: Promise<{ id: string }> };

const seleccionPublica = {
  id: true,
  usuario: true,
  nombre: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Cuenta cuántos administradores activos hay además del registro dado. */
async function otrosAdminsActivos(idActual: string): Promise<number> {
  return db.usuario.count({
    where: { rol: "ADMIN", activo: true, id: { not: idActual } },
  });
}

/**
 * PUT /api/usuarios/[id] (solo ADMIN)
 * Actualiza datos, rol, estado y/o contraseña del usuario.
 * Reglas: un administrador no puede cambiar su propio rol/estado ni
 * eliminarse; siempre debe existir al menos un administrador activo.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const sesion = obtenerSesionAdmin(request);
  if (!sesion) {
    return NextResponse.json(
      { error: "Solo un administrador puede modificar usuarios" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const existente = await db.usuario.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El usuario solicitado no existe" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = actualizarUsuarioSchema.safeParse(body);

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

    const datos = parsed.data;

    // Nombre de cuenta duplicado (si viene y cambia).
    if (datos.usuario && datos.usuario !== existente.usuario) {
      const duplicado = await db.usuario.findUnique({
        where: { usuario: datos.usuario },
      });
      if (duplicado) {
        return NextResponse.json(
          {
            error: `El usuario "${datos.usuario}" ya existe.`,
            fieldErrors: { usuario: "Este nombre de cuenta ya está en uso" },
          },
          { status: 409 }
        );
      }
    }

    // Protección de la propia cuenta: no cambiar el propio rol/estado.
    const cambiaRol = datos.rol !== undefined && datos.rol !== existente.rol;
    const cambiaActivo =
      datos.activo !== undefined && datos.activo !== existente.activo;
    if (id === sesion.uid && (cambiaRol || cambiaActivo)) {
      return NextResponse.json(
        {
          error:
            "No puede cambiar su propio rol o estado. Solicite a otro administrador que lo haga.",
        },
        { status: 400 }
      );
    }

    // Protección del último administrador activo.
    if (
      existente.rol === "ADMIN" &&
      existente.activo &&
      ((cambiaRol && datos.rol === "USUARIO") || (cambiaActivo && !datos.activo))
    ) {
      const otros = await otrosAdminsActivos(id);
      if (otros === 0) {
        return NextResponse.json(
          {
            error:
              "Debe existir al menos un administrador activo en la aplicación",
          },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (datos.usuario !== undefined) data.usuario = datos.usuario;
    if (datos.nombre !== undefined) data.nombre = datos.nombre;
    if (datos.rol !== undefined) data.rol = datos.rol;
    if (datos.activo !== undefined) data.activo = datos.activo;
    if (datos.password !== undefined) {
      data.passwordHash = await bcrypt.hash(datos.password, 10);
    }

    const actualizado = await db.usuario.update({
      where: { id },
      data,
      select: seleccionPublica,
    });
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("PUT /api/usuarios/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/[id] (solo ADMIN)
 * Elimina un usuario. No se permite eliminar la propia cuenta ni al
 * último administrador activo.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const sesion = obtenerSesionAdmin(request);
  if (!sesion) {
    return NextResponse.json(
      { error: "Solo un administrador puede eliminar usuarios" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const existente = await db.usuario.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El usuario solicitado no existe" },
        { status: 404 }
      );
    }

    if (id === sesion.uid) {
      return NextResponse.json(
        { error: "No puede eliminar su propia cuenta mientras tiene la sesión abierta" },
        { status: 400 }
      );
    }

    if (existente.rol === "ADMIN" && existente.activo) {
      const otros = await otrosAdminsActivos(id);
      if (otros === 0) {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar al último administrador activo de la aplicación",
          },
          { status: 400 }
        );
      }
    }

    await db.usuario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/usuarios/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
