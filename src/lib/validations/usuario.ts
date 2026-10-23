import { z } from "zod";

/**
 * Validaciones de usuarios y de inicio de sesión.
 * El "usuario" (nombre de cuenta) se normaliza a minúsculas en el servidor.
 */

export const ROLES_USUARIO = ["ADMIN", "USUARIO"] as const;

export const loginSchema = z.object({
  usuario: z
    .string()
    .trim()
    .min(1, "El usuario es obligatorio")
    .max(30, "El usuario no puede exceder 30 caracteres"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .max(72, "La contraseña no puede exceder 72 caracteres"),
});

const campoUsuario = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(30, "El usuario no puede exceder 30 caracteres")
  .regex(
    /^[a-z0-9._-]+$/,
    "El usuario solo puede contener letras, números, punto, guion y guion bajo (sin espacios ni acentos)"
  );

const campoNombre = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(80, "El nombre no puede exceder 80 caracteres");

const campoPassword = z
  .string()
  .min(4, "La contraseña debe tener al menos 4 caracteres")
  .max(72, "La contraseña no puede exceder 72 caracteres");

/** Crear usuario: todos los campos requeridos. */
export const crearUsuarioSchema = z.object({
  usuario: campoUsuario,
  nombre: campoNombre,
  rol: z.enum(ROLES_USUARIO, { message: "Seleccione un rol válido" }),
  activo: z.boolean({ message: "El estado es obligatorio" }),
  password: campoPassword,
});

/** Actualizar usuario: todos los campos opcionales; contraseña solo si se cambia. */
export const actualizarUsuarioSchema = z
  .object({
    usuario: campoUsuario.optional(),
    nombre: campoNombre.optional(),
    rol: z.enum(ROLES_USUARIO, { message: "Seleccione un rol válido" }).optional(),
    activo: z.boolean({ message: "El estado es obligatorio" }).optional(),
    password: campoPassword.optional(),
  })
  .refine(
    (datos) => Object.values(datos).some((valor) => valor !== undefined),
    { message: "No hay cambios por guardar" }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
