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

/**
 * Convierte un monto a su representación en letras (español, México),
 * con formato "CIENTO VEINTE PESOS 34/100 M.N.".
 */
export function numeroALetras(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) valor = 0;

  const entero = Math.floor(valor + 1e-9);
  const centavos = Math.round((valor - entero) * 100);

  const unidades = [
    "",
    "UN",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
  ];
  const especiales: Record<number, string> = {
    10: "DIEZ",
    11: "ONCE",
    12: "DOCE",
    13: "TRECE",
    14: "CATORCE",
    15: "QUINCE",
    16: "DIECISÉIS",
    17: "DIECISIETE",
    18: "DIECIOCHO",
    19: "DIECINUEVE",
    20: "VEINTE",
    21: "VEINTIÚN",
    22: "VEINTIDÓS",
    23: "VEINTITRÉS",
    24: "VEINTICUATRO",
    25: "VEINTICINCO",
    26: "VEINTISÉIS",
    27: "VEINTISIETE",
    28: "VEINTIOCHO",
    29: "VEINTINUEVE",
  };
  const decenas = [
    "",
    "",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  function menor100(n: number): string {
    if (n === 0) return "";
    if (n < 10) return unidades[n];
    if (n in especiales) return especiales[n];
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return decenas[d];
    return `${decenas[d]} Y ${unidades[u]}`;
  }

  function menor1000(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c === 0) return menor100(resto);
    const parteCentenas = centenas[c];
    const parteResto = menor100(resto);
    return parteResto ? `${parteCentenas} ${parteResto}` : parteCentenas;
  }

  function convertir(n: number): string {
    if (n === 0) return "CERO";
    const partes: string[] = [];
    const millones = Math.floor(n / 1_000_000);
    const miles = Math.floor((n % 1_000_000) / 1_000);
    const resto = n % 1_000;

    if (millones > 0) {
      const textoMillones = menor1000(millones);
      partes.push(
        millones === 1 ? `${textoMillones} MILLÓN` : `${textoMillones} MILLONES`
      );
    }
    if (miles > 0) {
      const textoMiles = menor1000(miles);
      if (miles === 1) partes.push("MIL");
      else partes.push(`${textoMiles} MIL`);
    }
    if (resto > 0) {
      partes.push(menor1000(resto));
    }
    return partes.join(" ").trim();
  }

  const palabras = convertir(entero);
  const moneda = entero === 1 ? "PESO" : "PESOS";
  return `${palabras} ${moneda} ${String(centavos).padStart(2, "0")}/100 M.N.`;
}

/** Devuelve la fecha de hoy como texto ISO (YYYY-MM-DD) en zona local. */
export function fechaHoyISO(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
