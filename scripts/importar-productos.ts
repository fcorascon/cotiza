/**
 * Importación del catálogo desde upload/productos.csv al modelo Producto.
 *
 * Reglas de mapeo:
 * - codigoSat: columna `referencia` (sin espacios internos, mayúsculas).
 * - descripcion: columna `descripcion` (decodifica entidades HTML, colapsa
 *   espacios, mayúsculas — misma regla que las validaciones de la app).
 * - unidad: `idunidad` del sistema origen → catálogo de Unidades:
 *     1 → PZA, 2 → CAJA, 3 → RESMA (se crea si falta), 4 → PAQ, 6 → KG.
 * - categoria: `familia` (coincidencia sin acentos contra las categorías
 *   existentes); filas sin familia (NULL/vacía) → "SIN CATEGORIA" (se crea).
 * - iva: columna `iva` (tasa real: 0 u 8); se ignora `codimpuesto` por ser
 *   inconsistente en 1 fila (idproducto 347).
 * - costo / margen / subtotal:
 *     · margen se importa tal cual.
 *     · El precio de venta del origen es `precio` y coincide con
 *       costo × (1 + margen/100) en las filas con costo (solo 1 redondeo de
 *       centavo difiere). Para conservar el precio de venta REAL en las 562
 *       filas sin costo (costo=0), se deriva un costo implícito:
 *           costo = redondeo2(precio / (1 + margen/100))
 *       así el SUBTOTAL queda con el precio del origen (subtotal = precio).
 *     · Con costo>0 la derivación reproduce el costo original exacto.
 * - notas: columna `observaciones` (contiene referencias internas y notas
 *   reales del origen; se conservan tal cual, decodificadas y en mayúsculas).
 * - createdAt conserva `fechaalta`; updatedAt conserva `actualizado`.
 * - Re-ejecutable: omite filas cuyo par (codigoSat, descripcion) ya exista.
 *
 * Uso: bun scripts/importar-productos.ts [--dry]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

/** Parser CSV con soporte de comillas (RFC-4180 básico). */
function parsearCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let valor = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (entreComillas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          valor += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        valor += ch;
      }
    } else if (ch === '"') {
      entreComillas = true;
    } else if (ch === ",") {
      fila.push(valor);
      valor = "";
    } else if (ch === "\n") {
      fila.push(valor);
      filas.push(fila);
      fila = [];
      valor = "";
    } else if (ch !== "\r") {
      valor += ch;
    }
  }
  if (valor.length > 0 || fila.length > 0) {
    fila.push(valor);
    filas.push(fila);
  }
  return filas;
}

/** Decodifica entidades HTML (&quot;, &#39;, &amp;, numéricas). */
function decodificarHTML(texto: string): string {
  return texto
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Limpieza estándar: entidades → espacios colapsados → mayúsculas. */
function limpiarTexto(valor: string): string {
  return decodificarHTML(valor).replace(/\s+/g, " ").trim().toUpperCase();
}

/** Valor vacío o literal "NULL" del origen → vacío. */
function valorReal(valor: string): string {
  const v = valor.trim();
  return !v || v === "NULL" ? "" : v;
}

function redondeo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Coincidencia de categorías sin acentos (PAPELERIA → PAPELERÍA). */
function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** idunidad del sistema origen → nombre de unidad en el catálogo. */
const MAPA_UNIDADES: Record<string, string> = {
  "1": "PZA",
  "2": "CAJA",
  "3": "RESMA",
  "4": "PAQ",
  "6": "KG",
};

async function main() {
  const bruto = parsearCSV(readFileSync("/home/z/my-project/upload/productos.csv", "utf8"));
  const encabezados = bruto[0];
  const filas = bruto
    .slice(1)
    .filter((f) => f.some((celda) => celda.trim() !== ""))
    .map((f) => Object.fromEntries(encabezados.map((h, i) => [h.trim(), (f[i] ?? "").trim()])));

  console.log(`CSV leído: ${filas.length} filas de datos.${DRY ? " (DRY-RUN: no se escribirá la BD)" : ""}`);

  // ── Catálogos ────────────────────────────────────────────────────────────
  const unidades = await prisma.unidad.findMany();
  const categorias = await prisma.categoria.findMany();
  const ivas = await prisma.iva.findMany();

  // Unidad faltante del mapeo (RESMA) y categoría para filas sin familia.
  const unidadesFaltantes = [...new Set(Object.values(MAPA_UNIDADES))].filter(
    (nombre) => !unidades.some((u) => u.unidad === nombre)
  );
  const categoriasExistentes = new Set(categorias.map((c) => sinAcentos(c.categoria)));
  const categoriasFaltantes = ["SIN CATEGORIA"].filter(
    (nombre) => !categoriasExistentes.has(sinAcentos(nombre))
  );

  if (!DRY) {
    for (const nombre of unidadesFaltantes) {
      const u = await prisma.unidad.create({ data: { unidad: nombre } });
      unidades.push(u);
      console.log(`+ Unidad creada: ${nombre}`);
    }
    for (const nombre of categoriasFaltantes) {
      const c = await prisma.categoria.create({ data: { categoria: nombre } });
      categorias.push(c);
      console.log(`+ Categoría creada: ${nombre}`);
    }
  }

  const unidadPorNombre = new Map(unidades.map((u) => [u.unidad, u.id]));
  const categoriaPorNombre = new Map(categorias.map((c) => [sinAcentos(c.categoria), c.id]));
  const ivaPorTasa = new Map(ivas.map((i) => [i.tasa, i.id]));

  // ── Deduplicación: par (codigoSat, descripcion) ─────────────────────────
  const previos = await prisma.producto.findMany({
    select: { codigoSat: true, descripcion: true },
  });
  const claveExistentes = new Set(previos.map((p) => `${p.codigoSat}|${p.descripcion}`));

  let importados = 0;
  const omitidos: string[] = [];
  const resumenUnidades = new Map<string, number>();
  const resumenCategorias = new Map<string, number>();
  let sinCostoOriginal = 0;
  let maxDrift = 0;

  for (const f of filas) {
    const idOrigen = f.idproducto;
    const codigoSat = f.referencia.replace(/\s+/g, "").toUpperCase();
    const descripcion = limpiarTexto(f.descripcion);
    if (codigoSat.length < 3 || descripcion.length < 3) {
      omitidos.push(`${idOrigen} — código o descripción demasiado cortos`);
      continue;
    }
    const clave = `${codigoSat}|${descripcion}`;
    if (claveExistentes.has(clave)) {
      omitidos.push(`${idOrigen} ${descripcion} — ya existe en la BD (${codigoSat})`);
      continue;
    }

    const nombreUnidad = MAPA_UNIDADES[f.idunidad];
    const unidadId = nombreUnidad ? unidadPorNombre.get(nombreUnidad) : undefined;
    if (!unidadId) {
      omitidos.push(`${idOrigen} ${descripcion} — idunidad desconocido: ${f.idunidad}`);
      continue;
    }

    const familia = limpiarTexto(valorReal(f.familia));
    const categoriaId = categoriaPorNombre.get(sinAcentos(familia || "SIN CATEGORIA"));
    if (!categoriaId) {
      omitidos.push(`${idOrigen} ${descripcion} — familia sin catálogo: ${familia || "(vacía)"}`);
      continue;
    }

    const tasa = Number(valorReal(f.iva));
    const ivaId = ivaPorTasa.get(tasa);
    if (ivaId === undefined) {
      omitidos.push(`${idOrigen} ${descripcion} — tasa de IVA sin catálogo: ${f.iva}`);
      continue;
    }

    const margen = Number(f.margen);
    const precio = Number(f.precio);
    const costoOrigen = Number(f.costo);
    // Costo implícito para conservar el precio de venta del origen.
    const costo = precio > 0 ? redondeo2(precio / (1 + margen / 100)) : 0;
    if (costoOrigen === 0 && precio > 0) sinCostoOriginal++;
    if (costoOrigen > 0 && Math.abs(costo - costoOrigen) > 0.005) {
      omitidos.push(`${idOrigen} ${descripcion} — costo derivado ${costo} difiere del origen ${costoOrigen}`);
      continue;
    }
    maxDrift = Math.max(maxDrift, Math.abs(costo * (1 + margen / 100) - precio));

    const notas = limpiarTexto(valorReal(f.observaciones));
    const fechaAlta = valorReal(f.fechaalta);
    const actualizado = valorReal(f.actualizado);

    resumenUnidades.set(nombreUnidad, (resumenUnidades.get(nombreUnidad) ?? 0) + 1);
    const nombreCategoria = familia || "SIN CATEGORIA";
    resumenCategorias.set(nombreCategoria, (resumenCategorias.get(nombreCategoria) ?? 0) + 1);

    if (!DRY) {
      await prisma.producto.create({
        data: {
          codigoSat,
          descripcion,
          unidadId,
          categoriaId,
          ivaId,
          costo,
          margen,
          subtotal: precio, // precio de venta del sistema origen
          ...(notas ? { notas } : {}),
          ...(fechaAlta ? { createdAt: new Date(`${fechaAlta}T12:00:00.000Z`) } : {}),
          ...(actualizado
            ? { updatedAt: new Date(`${actualizado.replace(" ", "T")}.000Z`) }
            : {}),
        },
      });
    }
    claveExistentes.add(clave);
    importados++;
  }

  const total = DRY ? previos.length : await prisma.producto.count();
  console.log(`\nImportados: ${importados} | Omitidos: ${omitidos.length} | Total en BD: ${total}`);
  console.log(`Productos con costo implícito derivado (costo=0 en origen): ${sinCostoOriginal}`);
  console.log(`Desviación máxima subtotal(fórmula) vs precio origen: $${maxDrift.toFixed(4)}`);
  console.log(
    "Unidades:",
    [...resumenUnidades.entries()].map(([k, v]) => `${k}=${v}`).join(", ")
  );
  console.log(
    "Categorías:",
    [...resumenCategorias.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", ")
  );
  if (omitidos.length) {
    console.log("Omitidos:");
    for (const o of omitidos) console.log(`  · ${o}`);
  }
}

main()
  .catch((e) => {
    console.error("ERROR EN IMPORTACIÓN:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
