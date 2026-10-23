"use client";

/**
 * Respaldo de sesión en el cliente.
 *
 * La vía principal de sesión es la cookie HttpOnly firmada. Sin embargo,
 * algunos navegadores bloquean o descartan cookies cuando la aplicación
 * corre embebida en un iframe (p. ej. una vista previa) o con ajustes de
 * privacidad estrictos. Para que la sesión siga funcionando en esos
 * entornos, el token también se guarda en localStorage y se envía en la
 * petición mediante el encabezado "x-sesion"; el servidor lo acepta como
 * respaldo cuando la cookie no viaja.
 */

const CLAVE_TOKEN = "sn_sesion_token";

/** Guarda el token de sesión en localStorage (ignora fallos del almacenamiento). */
export function guardarTokenSesion(token: string) {
  try {
    window.localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    // localStorage puede estar bloqueado; la cookie sigue siendo la vía principal.
  }
}

/** Recupera el token de sesión guardado, o null si no existe. */
export function obtenerTokenSesion(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

/** Elimina el token de sesión guardado. */
export function limpiarTokenSesion() {
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Nada que limpiar si el almacenamiento está bloqueado.
  }
}

/**
 * Encabezados de sesión para fetch: incluye "x-sesion" solo si hay token
 * guardado. Se combina con los demás encabezados de la petición.
 */
export function cabeceraSesion(): Record<string, string> {
  const token = obtenerTokenSesion();
  return token ? { "x-sesion": token } : {};
}
