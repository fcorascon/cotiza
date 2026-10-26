/**
 * Importación del catálogo de productos desde Google Sheets.
 *
 * La hoja debe estar compartida como "Cualquier persona con el enlace: Lector".
 * Se descarga el CSV que Google publica para la pestaña indicada (gid) y se
 * detectan las columnas por su encabezado, aceptando variantes habituales en
 * español (Descripción/Producto, Costo/Precio, Margen/Utilidad, etc.).
 *
 * Este módulo no depende de Prisma ni de Next: solo descarga y normaliza.
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export const CAMPOS_COLUMNA = [
  "descripcion",
  "codigoSat",
  "unidad",
  "categoria",
  "iva",
  "costo",
  "margen",
  "subtotal",
  "notas",
] as const;

export type CampoColumna = (typeof CAMPOS_COLUMNA)[number];

export type MapeoColumnas = Record<CampoColumna, number | null>;

export type FilaCatalogo = {
  /** Número de fila en la hoja (incluye encabezado, 1-based). */
  fila: number;
  descripcion: string;
  codigoSat: string;
  unidad: string;
  categoria: string;
  iva: number;
  costo: number;
  margen: number;
  subtotal: number;
  notas: string | null;
  advertencias: string[];
};

export type ErrorFila = { fila: number; mensaje: string };

export type AnalisisHoja = {
  encabezados: string[];
  columnas: MapeoColumnas;
  columnasUsadas: Partial<Record<CampoColumna, string>>;
  totalFilas: number;
  filasValidas: FilaCatalogo[];
  errores: ErrorFila[];
  advertencias: string[];
};

/* ------------------------------------------------------------------ */
/* Enlaces                                                            */
/* ------------------------------------------------------------------ */

/** Extrae el ID del documento de un enlace de Google Sheets (o del ID pelado). */
export function extraerIdHoja(urlOGid: string): string | null {
  const texto = (urlOGid ?? "").trim();
  if (!texto) return null;
  const enUrl = texto.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (enUrl) return enUrl[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(texto)) return texto;
  return null;
}

/** Extrae el gid (pestaña) del enlace; cadena vacía si no se indica. */
export function extraerGid(url: string): string {
  const texto = (url ?? "").trim();
  const conGid = texto.match(/[?&#]gid=(\d+)/);
  return conGid ? conGid[1] : "";
}

/**
 * Valida el selector de pestaña: un gid numérico o el nombre de la pestaña
 * (por ejemplo, "productos"). Las hojas aceptan ambos en el CSV.
 */
export function esSelectorHojaValido(valor: string): boolean {
  const texto = (valor ?? "").trim();
  if (!texto) return true;
  if (/^\d+$/.test(texto)) return true;
  return /^[\p{L}0-9 _.-]{1,60}$/u.test(texto);
}

/** Construye las URLs candidatas para descargar la hoja como CSV. */
export function construirUrlsCsv(idHoja: string, gidONombre: string): string[] {
  // gviz acepta gid numérico o el nombre de la pestaña (&sheet=productos).
  const selector = !gidONombre
    ? ""
    : /^\d+$/.test(gidONombre)
      ? `&gid=${encodeURIComponent(gidONombre)}`
      : `&sheet=${encodeURIComponent(gidONombre)}`;
  return [
    `https://docs.google.com/spreadsheets/d/${idHoja}/gviz/tq?tqx=out:csv${selector}`,
    `https://docs.google.com/spreadsheets/d/${idHoja}/export?format=csv${selector}`,
  ];
}

/* ------------------------------------------------------------------ */
/* Descarga                                                           */
/* ------------------------------------------------------------------ */

/**
 * Descarga el CSV de la hoja. Lanza un error con mensaje claro cuando la
 * hoja no es pública o no existe.
 */
export async function descargarCsv(
  idHoja: string,
  gid: string
): Promise<string> {
  const urls = construirUrlsCsv(idHoja, gid);
  let ultimoDetalle = "";

  for (const url of urls) {
    try {
      const respuesta = await fetch(url, {
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SuncatcherPresupuestos/1.0; +https://localhost)",
          Accept: "text/csv,text/plain,*/*",
        },
        signal: AbortSignal.timeout(20_000),
      });

      const ubicacion = respuesta.url || "";
      if (ubicacion.includes("accounts.google.com")) {
        throw new Error(
          "La hoja no es pública. Ábrela en Google Sheets → Compartir → " +
            '"Cualquier persona con el enlace" → Lector.'
        );
      }

      if (!respuesta.ok) {
        if (respuesta.status === 401 || respuesta.status === 403) {
          throw new Error(
            "La hoja no es pública. En Google Sheets abre Compartir → Acceso " +
              'general → "Cualquier persona con el enlace" → Lector y vuelve a intentar.'
          );
        }
        ultimoDetalle = `HTTP ${respuesta.status}`;
        continue;
      }

      const texto = await respuesta.text();
      const recortado = texto.trimStart();
      if (
        recortado.startsWith("<!DOCTYPE") ||
        recortado.startsWith("<html") ||
        recortado.startsWith("<HTML")
      ) {
        throw new Error(
          "Google devolvió una página de inicio de sesión. Verifica que la " +
            "hoja esté compartida como \"Cualquier persona con el enlace: Lector\"."
        );
      }

      if (!texto.trim()) {
        throw new Error("La hoja está vacía o la pestaña indicada no existe.");
      }

      return texto;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        ultimoDetalle = "tiempo de espera agotado";
        continue;
      }
      if (error instanceof Error) {
        // Los errores de "no pública" son definitivos: no probar la otra URL.
        if (error.message.includes("no es pública")) throw error;
        ultimoDetalle = error.message;
      }
    }
  }

  throw new Error(
    "No fue posible descargar la hoja de cálculo" +
      (ultimoDetalle ? ` (${ultimoDetalle})` : "") +
      ". Verifica el enlace, el gid de la pestaña y que la hoja sea pública."
  );
}

/* ------------------------------------------------------------------ */
/* CSV                                                                */
/* ------------------------------------------------------------------ */

/** Detecta el delimitador más probable (coma o punto y coma). */
function detectarDelimitador(texto: string): string {
  const primeraLinea = texto.split(/\r?\n/, 1)[0] ?? "";
  let comas = 0;
  let puntoYComas = 0;
  let entreComillas = false;
  for (const caracter of primeraLinea) {
    if (caracter === '"') entreComillas = !entreComillas;
    else if (!entreComillas && caracter === ",") comas++;
    else if (!entreComillas && caracter === ";") puntoYComas++;
  }
  return puntoYComas > comas ? ";" : ",";
}

/**
 * Parser CSV con soporte de comillas, comillas escapadas ("") y saltos de
 * línea dentro de campos. Devuelve una matriz de celdas.
 */
export function parsearCsv(texto: string): string[][] {
  const limpio = texto.replace(/^\uFEFF/, "");
  const delimitador = detectarDelimitador(limpio);

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;

  const cerrarCelda = () => {
    fila.push(celda);
    celda = "";
  };
  const cerrarFila = () => {
    cerrarCelda();
    filas.push(fila);
    fila = [];
  };

  for (let i = 0; i < limpio.length; i++) {
    const caracter = limpio[i];

    if (entreComillas) {
      if (caracter === '"') {
        if (limpio[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === delimitador) {
      cerrarCelda();
    } else if (caracter === "\n") {
      cerrarFila();
    } else if (caracter === "\r") {
      if (limpio[i + 1] === "\n") i++;
      cerrarFila();
    } else {
      celda += caracter;
    }
  }

  if (celda.length > 0 || fila.length > 0) cerrarFila();

  return filas;
}

/* ------------------------------------------------------------------ */
/* Normalización                                                      */
/* ------------------------------------------------------------------ */

/** Quita acentos, colapsa espacios y pasa a minúsculas (para encabezados). */
export function normalizarEncabezado(valor: string): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/** Texto de catálogo: mayúsculas y espacios colapsados (como en los formularios). */
function normalizarTextoCatalogo(valor: string): string {
  return (valor ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Valores que las hojas usan como "vacío" y no deben crear catálogos. */
const VALORES_VACIOS = new Set([
  "NULL",
  "N/A",
  "NA",
  "-",
  "--",
  "0",
  "SIN DATO",
  "SIN DATOS",
]);

/** Normaliza un valor de catálogo tratando NULL/N/A como vacío. */
function valorCatalogo(valor: string): string {
  const texto = normalizarTextoCatalogo(valor);
  return VALORES_VACIOS.has(texto) ? "" : texto;
}

const ALIAS_COLUMNAS: Record<CampoColumna, string[]> = {
  descripcion: [
    "descripcion",
    "descripcion del producto",
    "descripcion producto",
    "producto",
    "nombre",
    "nombre del producto",
    "articulo",
    "concepto",
  ],
  codigoSat: [
    "codigo sat",
    "clave sat",
    "clave prodserv",
    "codigo producto",
    "referencia",
    "codigo",
    "clave",
    "sku",
  ],
  unidad: ["unidad", "unidad de medida", "unidad medida", "um", "u m", "medida"],
  categoria: [
    "categoria",
    "grupo",
    "familia",
    "linea",
    "departamento",
    "tipo",
  ],
  iva: ["iva", "tasa iva", "tasa de iva", "iva %", "porcentaje iva", "impuesto"],
  costo: [
    "costo",
    "costo unitario",
    "precio costo",
    "costo de compra",
    "precio de compra",
    "costo proveedor",
    "precio proveedor",
  ],
  margen: [
    "margen",
    "margen %",
    "margen de ganancia",
    "utilidad",
    "utilidad %",
    "porcentaje utilidad",
    "markup",
  ],
  subtotal: [
    "precio",
    "precio unitario",
    "precio venta",
    "precio de venta",
    "precio publico",
    "precio al publico",
    "precio lista",
    "pvp",
    "subtotal",
  ],
  notas: ["notas", "nota", "observaciones", "comentario", "comentarios"],
};

/**
 * Detecta qué columna corresponde a cada campo del catálogo.
 * Primero busca coincidencias exactas y después por contenido del encabezado.
 */
export function detectarColumnas(encabezados: string[]): {
  columnas: MapeoColumnas;
  usadas: Partial<Record<CampoColumna, string>>;
} {
  const normalizados = encabezados.map(normalizarEncabezado);
  const columnas: MapeoColumnas = {
    descripcion: null,
    codigoSat: null,
    unidad: null,
    categoria: null,
    iva: null,
    costo: null,
    margen: null,
    subtotal: null,
    notas: null,
  };
  const usadas: Partial<Record<CampoColumna, string>> = {};
  const columnasUsadas = new Set<number>();

  // Pasada 1: coincidencia exacta.
  for (const campo of CAMPOS_COLUMNA) {
    const alias = ALIAS_COLUMNAS[campo];
    for (let i = 0; i < normalizados.length; i++) {
      if (columnasUsadas.has(i)) continue;
      if (alias.includes(normalizados[i])) {
        columnas[campo] = i;
        usadas[campo] = encabezados[i];
        columnasUsadas.add(i);
        break;
      }
    }
  }

  // Pasada 2: el encabezado contiene el alias (solo campos aún sin asignar).
  for (const campo of CAMPOS_COLUMNA) {
    if (columnas[campo] !== null) continue;
    const alias = ALIAS_COLUMNAS[campo];
    for (let i = 0; i < normalizados.length; i++) {
      if (columnasUsadas.has(i)) continue;
      const encabezado = normalizados[i];
      if (!encabezado) continue;
      if (alias.some((a) => encabezado === a || encabezado.includes(a))) {
        columnas[campo] = i;
        usadas[campo] = encabezados[i];
        columnasUsadas.add(i);
        break;
      }
    }
  }

  return { columnas, usadas };
}

/* ------------------------------------------------------------------ */
/* Números                                                            */
/* ------------------------------------------------------------------ */

/** Convierte montos escritos como texto ("$1,234.50", "1.5", "1,5") a número. */
export function parsearNumero(valor: string): number {
  let texto = (valor ?? "").trim();
  if (!texto) return NaN;

  texto = texto.replace(/[$\s]/g, "").replace(/MXN|USD/gi, "");
  const negativo = texto.startsWith("(") && texto.endsWith(")");
  if (negativo) texto = texto.slice(1, -1);
  texto = texto.replace(/[^0-9.,-]/g, "");
  if (!texto) return NaN;

  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/,/g, "");
  } else if (texto.includes(",")) {
    // "1,234" → separador de miles; "12,5" → coma decimal.
    texto = /^-?\d{1,3}(,\d{3})+$/.test(texto)
      ? texto.replace(/,/g, "")
      : texto.replace(",", ".");
  }

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return NaN;
  return negativo ? -numero : numero;
}

/** Convierte la tasa de IVA ("16", "16%", "0.16", "EXENTO") a porcentaje. */
export function parsearIva(valor: string): number {
  const texto = (valor ?? "").trim().toUpperCase();
  if (!texto) return NaN;
  if (
    texto.includes("EXENT") ||
    texto === "N/A" ||
    texto === "NA" ||
    texto.includes("NO APLICA")
  ) {
    return 0;
  }
  const numero = parsearNumero(texto.replace("%", ""));
  if (!Number.isFinite(numero)) return NaN;
  // 0.16 representa fracción; 16 ya es porcentaje. El 1 exacto se deja como 1%.
  const porcentaje = numero > 0 && numero < 1 ? numero * 100 : numero;
  return Math.round(porcentaje * 100) / 100;
}

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Código SAT genérico ("No existe en el catálogo") para filas sin código. */
export const CODIGO_SAT_GENERICO = "01010101";

/* ------------------------------------------------------------------ */
/* Análisis de filas                                                  */
/* ------------------------------------------------------------------ */

/**
 * Convierte las filas crudas de la hoja en registros de catálogo.
 * No toca la base de datos: solo normaliza, calcula precios y acumula errores.
 */
export function analizarFilas(textoCsv: string): AnalisisHoja {
  const filas = parsearCsv(textoCsv);

  // Busca la primera fila con contenido (la hoja puede tener filas vacías).
  let indiceEncabezado = -1;
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].some((celda) => (celda ?? "").trim() !== "")) {
      indiceEncabezado = i;
      break;
    }
  }

  if (indiceEncabezado === -1) {
    throw new Error("La hoja no contiene datos.");
  }

  const encabezados = filas[indiceEncabezado].map((h) => (h ?? "").trim());
  const { columnas, usadas } = detectarColumnas(encabezados);

  const errores: ErrorFila[] = [];
  const advertencias: string[] = [];
  const filasValidas: FilaCatalogo[] = [];
  let totalFilas = 0;
  let sinCodigoSat = 0;
  let sinPrecio = 0;
  let precioComoCosto = 0;
  let truncadas = 0;

  const valor = (fila: string[], campo: CampoColumna): string => {
    const indice = columnas[campo];
    if (indice === null) return "";
    return (fila[indice] ?? "").trim();
  };

  for (let i = indiceEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.every((celda) => (celda ?? "").trim() === "")) continue;

    totalFilas++;
    const numeroFila = i + 1;

    const descripcion = normalizarTextoCatalogo(valor(fila, "descripcion"));
    if (descripcion.length < 3) {
      errores.push({
        fila: numeroFila,
        mensaje: "Sin descripción (mínimo 3 caracteres).",
      });
      continue;
    }

    if (descripcion.length > 200) {
      errores.push({
        fila: numeroFila,
        mensaje: "La descripción excede 200 caracteres.",
      });
      continue;
    }

    // Código SAT: se sanea; si falta o es inválido se usa el genérico.
    let codigoSat = (valor(fila, "codigoSat") || "")
      .replace(/\s+/g, " ")
      .toUpperCase()
      .replace(/[^A-Z0-9.\-]/g, "");
    if (codigoSat.length > 20) codigoSat = codigoSat.slice(0, 20);
    if (codigoSat.length < 3) {
      codigoSat = CODIGO_SAT_GENERICO;
      sinCodigoSat++;
    }

    const unidad = valorCatalogo(valor(fila, "unidad"));
    const categoria = valorCatalogo(valor(fila, "categoria"));
    const ivaTexto = valor(fila, "iva");
    const iva = parsearIva(ivaTexto);
    const notasTexto = valorCatalogo(valor(fila, "notas"));

    const costoNum = parsearNumero(valor(fila, "costo"));
    const margenNum = parsearNumero(valor(fila, "margen"));
    const precioNum = parsearNumero(valor(fila, "subtotal"));

    // Un costo en 0 significa "sin costo capturado" (no un costo real).
    const costoValido = Number.isFinite(costoNum) && costoNum > 0;
    let costo = costoValido ? costoNum : 0;
    let margen = Number.isFinite(margenNum) ? margenNum : 0;
    let subtotal = 0;
    const advertenciasFila: string[] = [];
    let precioCalculado = false;

    if (costoValido && Number.isFinite(margenNum)) {
      subtotal = redondear2(costo * (1 + margen / 100));
      precioCalculado = true;
    } else if (costoValido && Number.isFinite(precioNum)) {
      // Precio de venta sin margen explícito: se deduce el margen.
      margen = redondear2((precioNum / costo - 1) * 100);
      subtotal = redondear2(precioNum);
      precioCalculado = true;
    } else if (!costoValido && Number.isFinite(precioNum) && precioNum > 0) {
      // Solo hay precio de venta: se usa como costo con margen 0.
      costo = redondear2(precioNum);
      margen = 0;
      subtotal = costo;
      precioComoCosto++;
      precioCalculado = true;
    } else if (costoValido) {
      subtotal = redondear2(costo);
      margen = 0;
      precioCalculado = true;
    }

    if (!precioCalculado) {
      sinPrecio++;
      costo = 0;
      margen = 0;
      subtotal = 0;
      advertenciasFila.push("Sin costo ni precio: se importó en $0.");
    }

    if (costoValido && Number.isFinite(precioNum) && Number.isFinite(margenNum)) {
      const precioHoja = redondear2(precioNum);
      if (precioHoja > 0 && Math.abs(precioHoja - subtotal) > 0.5) {
        advertenciasFila.push(
          `El precio de la hoja ($${precioHoja}) difiere del calculado ($${subtotal}); ` +
            "se usó costo + margen."
        );
      }
    }

    if (descripcion.length > 200) truncadas++;

    filasValidas.push({
      fila: numeroFila,
      descripcion,
      codigoSat,
      unidad,
      categoria,
      iva: Number.isFinite(iva) ? iva : 0,
      costo: redondear2(costo),
      margen: redondear2(margen),
      subtotal: redondear2(subtotal),
      notas: notasTexto ? notasTexto.slice(0, 500) : null,
      advertencias: advertenciasFila,
    });
  }

  if (columnas.descripcion === null) {
    errores.unshift({
      fila: indiceEncabezado + 1,
      mensaje:
        "No se encontró la columna de descripción. Encabezados esperados: " +
        "DESCRIPCIÓN (o PRODUCTO / NOMBRE / ARTÍCULO).",
    });
  }

  if (columnas.costo === null && columnas.subtotal === null) {
    advertencias.push(
      "No se encontró columna de costo ni de precio: los productos se " +
        "importarán con costo $0."
    );
  }

  if (sinCodigoSat > 0) {
    advertencias.push(
      `${sinCodigoSat} fila(s) sin código SAT válido; se usó el genérico ${CODIGO_SAT_GENERICO}.`
    );
  }
  if (precioComoCosto > 0) {
    advertencias.push(
      `${precioComoCosto} fila(s) solo tenían precio de venta; se usó como costo con margen 0%.`
    );
  }
  if (sinPrecio > 0) {
    advertencias.push(`${sinPrecio} fila(s) sin costo ni precio (importadas en $0).`);
  }
  if (truncadas > 0) {
    advertencias.push(`${truncadas} descripción(es) exceden 200 caracteres.`);
  }

  return {
    encabezados,
    columnas,
    columnasUsadas: usadas,
    totalFilas,
    filasValidas,
    errores: errores.slice(0, 100),
    advertencias,
  };
}

/* ------------------------------------------------------------------ */
/* Catálogos auxiliares (unidades)                                    */
/* ------------------------------------------------------------------ */

/**
 * Clave de comparación de catálogos: mayúsculas, sin acentos y con
 * espacios simples. Permite emparejar "PAPELERIA" (hoja) con
 * "PAPELERÍA" (app) sin crear duplicados.
 */
export function claveCatalogo(valor: string): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Equivalencias entre las unidades de la hoja y las de la aplicación. */
const EQUIVALENCIAS_UNIDAD: Record<string, string> = {
  CJA: "CAJA",
  CAJA: "CAJA",
  MIL: "MILLAR",
  MILLAR: "MILLAR",
  PZA: "PZA",
  PIEZA: "PZA",
  PAQ: "PAQ",
  PAQUETE: "PAQ",
  KG: "KG",
  KGS: "KG",
  KILO: "KG",
  KILOS: "KG",
  LT: "LT",
  L: "LT",
  LITRO: "LT",
  LITROS: "LT",
};

/** Normaliza el nombre de una unidad a la nomenclatura de la app. */
export function normalizarUnidad(valor: string): string {
  const clave = claveCatalogo(valor);
  if (!clave) return "";
  return EQUIVALENCIAS_UNIDAD[clave] ?? clave;
}

/**
 * Lee una pestaña de catálogo de unidades (columnas idunidad/unidad) y
 * devuelve un mapa id → nombre.
 */
export function parsearCatalogoUnidades(textoCsv: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const filas = parsearCsv(textoCsv);

  let indiceEncabezado = -1;
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].some((celda) => (celda ?? "").trim() !== "")) {
      indiceEncabezado = i;
      break;
    }
  }
  if (indiceEncabezado === -1) return mapa;

  const encabezados = filas[indiceEncabezado].map(normalizarEncabezado);
  let colId = encabezados.findIndex(
    (h) => h === "idunidad" || h === "id" || h === "clave"
  );
  let colNombre = encabezados.findIndex(
    (h) => h === "unidad" || h === "nombre" || h === "descripcion"
  );

  // Pestaña de una sola columna: cada fila es el nombre de una unidad.
  if (colNombre === -1 && encabezados.length === 1) {
    colId = -1;
    colNombre = 0;
  }
  if (colNombre === -1) return mapa;

  for (let i = indiceEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila) continue;
    const nombre = (fila[colNombre] ?? "").trim();
    if (!nombre) continue;
    const id = colId >= 0 ? (fila[colId] ?? "").trim() : nombre;
    if (id) mapa.set(id, nombre);
  }

  return mapa;
}

/**
 * Aplica el mapa id → unidad a las filas ya analizadas y normaliza las
 * equivalencias (CJA → CAJA, MIL → MILLAR…). Las filas sin unidad
 * quedan como "PZA".
 */
export function aplicarUnidades(
  analisis: AnalisisHoja,
  mapa: Map<string, string>
): void {
  for (const fila of analisis.filasValidas) {
    let nombre = fila.unidad.trim();
    if (!nombre || /^\d+$/.test(nombre)) {
      nombre = mapa.get(nombre) ?? (nombre ? "" : "PZA");
    }
    fila.unidad = normalizarUnidad(nombre);
  }
}

/**
 * Descarga la pestaña de unidades del mismo libro, si existe.
 * Devuelve un mapa vacío cuando la hoja no tiene esa pestaña.
 */
export async function descargarMapaUnidades(
  idHoja: string
): Promise<Map<string, string>> {
  for (const nombre of ["unidades", "unidad"]) {
    try {
      const csv = await descargarCsv(idHoja, nombre);
      const mapa = parsearCatalogoUnidades(csv);
      if (mapa.size > 0) return mapa;
    } catch {
      // La pestaña no existe o no es accesible: se intenta la siguiente.
    }
  }
  return new Map();
}
