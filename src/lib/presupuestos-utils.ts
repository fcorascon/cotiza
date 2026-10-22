/**
 * Utilidades compartidas para la sección de presupuestos:
 * redondeo monetario, cálculo de totales (sub total + IVA + total)
 * y formato de fechas capturadas como texto ISO (YYYY-MM-DD).
 */

/**
 * Redondea un monto a 2 decimales de forma estable
 * (evita el clásico error de coma flotante 0.1 + 0.2).
 */
export function redondear2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export type LineaIvaPorTasa = {
  tasa: number;
  importe: number;
};

export type TotalesPresupuesto = {
  subtotal: number;
  iva: number;
  total: number;
  ivaPorTasa: LineaIvaPorTasa[];
};

/**
 * Calcula los totales del presupuesto a partir de sus partidas:
 *  - importe      = cantidad × precio unitario (por partida)
 *  - IVA por tasa = importe × tasa / 100  (cada producto trae su propia tasa)
 *  - SUB TOTAL    = suma de importes
 *  - IVA          = suma de IVA por tasa
 *  - TOTAL        = SUB TOTAL + IVA
 */
export function calcularTotalesPresupuesto(
  items: Array<{ cantidad: number; precioUnitario: number; ivaTasa: number }>
): TotalesPresupuesto {
  let sumaImportes = 0;
  const acumuladoPorTasa = new Map<number, number>();

  for (const item of items) {
    const importe = redondear2(item.cantidad * item.precioUnitario);
    const ivaImporte = redondear2((importe * item.ivaTasa) / 100);
    sumaImportes += importe;
    acumuladoPorTasa.set(
      item.ivaTasa,
      (acumuladoPorTasa.get(item.ivaTasa) ?? 0) + ivaImporte
    );
  }

  const subtotal = redondear2(sumaImportes);
  const ivaPorTasa: LineaIvaPorTasa[] = Array.from(acumuladoPorTasa.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tasa, importe]) => ({ tasa, importe: redondear2(importe) }));
  const iva = redondear2(
    ivaPorTasa.reduce((suma, linea) => suma + linea.importe, 0)
  );

  return { subtotal, iva, total: redondear2(subtotal + iva), ivaPorTasa };
}

/**
 * Formatea una fecha capturada como texto ISO ("2026-01-15") a
 * "15/01/2026" sin usar objetos Date, para evitar desfases de
 * zona horaria en fechas sin hora.
 */
export function formatearFechaISO(fecha: string): string {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const [anio, mes, dia] = partes;
  if (anio.length !== 4 || mes.length !== 2 || dia.length !== 2) return fecha;
  return `${dia}/${mes}/${anio}`;
}

/** Devuelve la fecha de hoy como texto ISO (YYYY-MM-DD) en zona local. */
export function fechaHoyISO(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
