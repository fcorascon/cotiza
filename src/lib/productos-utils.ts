/**
 * Utilidades compartidas para el catálogo de productos:
 * normalización de números capturados como texto, cálculo del
 * subtotal (costo + margen de ganancia) y formato de moneda/porcentaje.
 */

/**
 * Normaliza un monto capturado como texto:
 * elimina "$", espacios y separadores de miles, y acepta
 * coma como separador decimal (ej. "1,234.50" o "1,5" → 1.5).
 */
export function normalizarNumeroTexto(valor: string): string {
  let v = valor.replace(/[$%\s]/g, "");
  if (v.includes(",") && v.includes(".")) {
    v = v.replace(/,/g, "");
  } else {
    v = v.replace(",", ".");
  }
  return v;
}

/**
 * Convierte texto a número (NaN si el texto no representa un monto válido).
 */
export function textoANumero(valor: string): number {
  const normalizado = normalizarNumeroTexto(valor.trim());
  if (normalizado.length === 0) return NaN;
  return Number(normalizado);
}

/**
 * Calcula el subtotal de un producto:
 * SUBTOTAL = COSTO + MARGEN%  →  costo × (1 + margen / 100),
 * redondeado a 2 decimales.
 */
export function calcularSubtotal(costo: number, margen: number): number {
  return Math.round(costo * (1 + margen / 100) * 100) / 100;
}

const formatoMonedaMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** Formatea un monto como moneda MXN (ej. 1234.5 → "$1,234.50"). */
export function formatearMoneda(monto: number): string {
  return formatoMonedaMXN.format(monto);
}

/** Formatea un porcentaje (ej. 35 → "35%", 12.5 → "12.5%"). */
export function formatearPorcentaje(valor: number): string {
  return `${valor}%`;
}
