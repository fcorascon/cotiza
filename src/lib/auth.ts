import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Sesión de la aplicación basada en cookie HttpOnly firmada (HMAC-SHA256).
 * El token tiene la forma: base64url(payload).base64url(firma)
 * y viaja en la cookie `sn_sesion`. No usa dependencias externas.
 */

export const NOMBRE_COOKIE = "sn_sesion";

/** Duración de la sesión: 7 días. */
const DURACION_MS = 7 * 24 * 60 * 60 * 1000;

const SECRETO =
  process.env.AUTH_SECRET ??
  "suncatcher-norte-secreto-local-desarrollo-cambiar-en-produccion";

export type RolUsuario = "ADMIN" | "USUARIO";

export interface SesionPayload {
  uid: string;
  usuario: string;
  nombre: string;
  rol: RolUsuario;
  exp: number;
}

/** Datos del usuario autenticado que consume el cliente. */
export interface SesionActiva {
  id: string;
  usuario: string;
  nombre: string;
  rol: RolUsuario;
}

export function crearToken(datos: Omit<SesionPayload, "exp">): string {
  const payload: SesionPayload = { ...datos, exp: Date.now() + DURACION_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = crypto
    .createHmac("sha256", SECRETO)
    .update(data)
    .digest("base64url");
  return `${data}.${firma}`;
}

export function verificarToken(
  token: string | undefined | null
): SesionPayload | null {
  if (!token) return null;
  const [data, firma] = token.split(".");
  if (!data || !firma) return null;

  const esperada = crypto
    .createHmac("sha256", SECRETO)
    .update(data)
    .digest("base64url");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SesionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    if (payload.rol !== "ADMIN" && payload.rol !== "USUARIO") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Sesión a partir de una petición (route handlers). */
export function obtenerSesionRequest(request: NextRequest): SesionPayload | null {
  // 1) Vía normal: cookie firmada.
  const porCookie = verificarToken(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (porCookie) return porCookie;

  // 2) Respaldo: algunos navegadores bloquean/rechazan cookies cuando la
  //    aplicación corre embebida (iframe) o con ajustes estrictos. En ese
  //    caso el cliente envía el mismo token por el encabezado "x-sesion".
  const porEncabezado = verificarToken(request.headers.get("x-sesion"));
  if (porEncabezado) return porEncabezado;

  return null;
}

/** Sesión desde componentes de servidor. */
export async function obtenerSesionServidor(): Promise<SesionPayload | null> {
  const store = await cookies();
  return verificarToken(store.get(NOMBRE_COOKIE)?.value);
}

/**
 * Devuelve la sesión solo si el usuario es administrador;
 * se usa para proteger las rutas de gestión de usuarios.
 */
export function obtenerSesionAdmin(request: NextRequest): SesionPayload | null {
  const sesion = obtenerSesionRequest(request);
  return sesion?.rol === "ADMIN" ? sesion : null;
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false, // app de red local sobre http
    path: "/",
    maxAge: DURACION_MS / 1000,
  };
}
