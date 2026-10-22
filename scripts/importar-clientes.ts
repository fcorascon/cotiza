/**
 * Importación de clientes desde upload/clientes.csv al modelo Cliente.
 *
 * Reglas de mapeo:
 * - razonSocial: si personafisica=1 se usa `nombre`; si no, `razonsocial` (respaldo `nombre`).
 * - rfc / telefono / email: se copian tal cual (trim; email en minúsculas).
 * - La dirección del CSV es texto libre (direccion, ciudad, codpostal, provincia);
 *   el modelo la guarda estructurada (calle/numero/colonia/CP/ciudad/estado),
 *   por lo que cada fila se descompone con la tabla `direcciones` (mapeo manual
 *   fila por fila, revisable). Los interiores (LOCAL/PISO/INTERIOR) se conservan
 *   junto al número para no perder información.
 * - Se omiten las filas con debaja=1 (bajas del sistema origen).
 * - createdAt conserva la fecha de alta original del sistema origen.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

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

type Direccion = {
  calle: string;
  numero: string;
  colonia: string;
  codigoPostal: string;
  ciudad: string;
  estado: string;
};

const VACIA: Direccion = {
  calle: "",
  numero: "",
  colonia: "",
  codigoPostal: "",
  ciudad: "",
  estado: "",
};

/** Descomposición manual de la columna `direccion` por codcliente. */
const direcciones: Record<string, Direccion> = {
  "8": { calle: "INDEPENDENCIA", numero: "1944, LOCAL 1", colonia: "", codigoPostal: "21040", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "10": { ...VACIA },
  "7": { calle: "PASEO DE LA REFORMA", numero: "135", colonia: "ALCALDIA CUAUHTEMOC", codigoPostal: "06030", ciudad: "", estado: "CIUDAD DE MÉXICO" },
  "17": { calle: "CALLE PERON", numero: "504", colonia: "EL DURAZNAL", codigoPostal: "37320", ciudad: "LEON", estado: "GUANAJUATO" },
  "22": { calle: "KM 10.5 CARRT SAN LUIS", numero: "S/N", colonia: "", codigoPostal: "21378", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "14": { calle: "BLVD. VENUSTIANO CARRANZA", numero: "951", colonia: "", codigoPostal: "21259", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "20": { calle: "", numero: "", colonia: "", codigoPostal: "", ciudad: "MATAMOROS", estado: "TAMAULIPAS" },
  "13": { ...VACIA },
  "16": { calle: "ALVARO OBREGON", numero: "800", colonia: "PRIMERA SECCION", codigoPostal: "21100", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "4": { ...VACIA },
  "6": { calle: "VENUSTIANO CARRANZA", numero: "951, PISO 8, INTERIOR 101", colonia: "", codigoPostal: "21259", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "11": { calle: "SECRETARIA GENERAL SECCIÓN II-61", numero: "", colonia: "", codigoPostal: "", ciudad: "", estado: "" },
  "5": { calle: "CARPINTEROS", numero: "1920", colonia: "BUROCRATAS", codigoPostal: "21020", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "19": { calle: "Playa Ancón", numero: "122", colonia: "Desarrollo San Pablo", codigoPostal: "76125", ciudad: "Querétaro", estado: "QUERÉTARO" },
  "12": { calle: "CARR. A SAN LUIS KM 10.5", numero: "S/N", colonia: "", codigoPostal: "21394", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "2": { calle: "PIONEROS Y HEROES", numero: "995", colonia: "CENTRO CIVICO", codigoPostal: "21000", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "9": { calle: "MI CASA NUEVA", numero: "25", colonia: "LA RESIDENCIA", codigoPostal: "21000", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "3": { calle: "KM 10.5 CARRT A SAN LUIS", numero: "S/N", colonia: "PARQUE INDUSTRIAL LAS CALIFORNIAS", codigoPostal: "21394", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "21": { calle: "KM 10.5 CARRETERA SAN LUIS", numero: "S/N", colonia: "PARQUE INDUSTRIAL LAS CALIFORNIAS", codigoPostal: "21384", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "18": { calle: "Arcadia", numero: "94", colonia: "El Greco", codigoPostal: "84066", ciudad: "Nogales", estado: "SONORA" },
  "15": { calle: "BLVD GOBERNADOR BRAULIO MALDONADO", numero: "1149", colonia: "", codigoPostal: "21390", ciudad: "Mexicali", estado: "BAJA CALIFORNIA" },
  "24": { calle: "MADRE SELVA", numero: "1287", colonia: "LAS FLORES", codigoPostal: "21330", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
  "25": { calle: "NOVENA", numero: "1533", colonia: "ZONA DORADA", codigoPostal: "21376", ciudad: "MEXICALI", estado: "BAJA CALIFORNIA" },
};

async function main() {
  const bruto = parsearCSV(readFileSync("/home/z/my-project/upload/clientes.csv", "utf8"));
  const encabezados = bruto[0];
  const filas = bruto
    .slice(1)
    .filter((f) => f.some((celda) => celda.trim() !== ""))
    .map((f) =>
      Object.fromEntries(encabezados.map((h, i) => [h.trim(), (f[i] ?? "").trim()]))
    );

  console.log(`CSV leído: ${filas.length} filas de datos.`);

  const previos = await prisma.cliente.findMany({ select: { rfc: true } });
  const rfcExistentes = new Set(previos.map((c) => c.rfc).filter(Boolean));

  let importados = 0;
  const omitidos: string[] = [];

  for (const f of filas) {
    if (f.debaja === "1") {
      omitidos.push(`${f.nombre} (codcliente ${f.codcliente}) — dado de baja en el sistema origen`);
      continue;
    }
    const dir = direcciones[f.codcliente];
    if (!dir) {
      omitidos.push(`${f.nombre} (codcliente ${f.codcliente}) — sin mapeo de dirección`);
      continue;
    }
    const razonSocial = (
      f.personafisica === "1" ? f.nombre : f.razonsocial || f.nombre
    ).trim();
    const rfc = f.rfc.trim().toUpperCase();
    if (rfc && rfcExistentes.has(rfc)) {
      omitidos.push(`${razonSocial} — RFC ${rfc} ya existe en la BD`);
      continue;
    }
    if (rfc) rfcExistentes.add(rfc);

    const fechaAlta = f.fechaalta ? new Date(`${f.fechaalta}T12:00:00.000Z`) : null;

    await prisma.cliente.create({
      data: {
        razonSocial,
        rfc,
        ...dir,
        telefono: f.telefono.trim(),
        email: f.email.trim().toLowerCase(),
        ...(fechaAlta ? { createdAt: fechaAlta } : {}),
      },
    });
    importados++;
    console.log(`✓ ${razonSocial} | RFC: ${rfc || "—"} | ${dir.ciudad || "—"} | alta: ${f.fechaalta || "—"}`);
  }

  const total = await prisma.cliente.count();
  console.log(`\nImportados: ${importados} | Omitidos: ${omitidos.length} | Total en BD: ${total}`);
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
