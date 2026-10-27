import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DDL } from "./ddl";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────
 * RUTA TEMPORAL de instalación de la base Neon/Postgres.
 * Crea las tablas (DDL idempotente) y recibe los datos de la
 * base local SQLite para insertarlos en la nube.
 * ⚠️ Se elimina del código inmediatamente después de migrar.
 * ────────────────────────────────────────────────────────────── */

const CLAVE = "ins-nav-2026-" + "xKq7RV43mWJd2b";

/** Divide el DDL en instrucciones individuales. */
function sentenciasDDL(): string[] {
  return DDL.split(";")
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s
          .split(/\r?\n/)
          .every((linea) => linea.trim() === "" || linea.startsWith("--"))
    )
    .map((s) => {
      // Retira los comentarios de cabecera (se ignoran al ejecutar).
      const sinComentarios = s
        .split(/\r?\n/)
        .filter((linea) => !linea.trim().startsWith("--"))
        .join("\n")
        .trim();
      return sinComentarios;
    })
    .filter((s) => s.length > 0);
}

type Registro = Record<string, unknown>;

/** Convierte cadenas ISO en Date para Prisma. */
function convertir(obj: Registro): Registro {
  const salida: Registro = {};
  for (const [clave, valor] of Object.entries(obj)) {
    salida[clave] =
      typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)
        ? new Date(valor)
        : valor;
  }
  return salida;
}

async function contar() {
  const [usuarios, clientes, productos, presupuestos] = await Promise.all([
    db.usuario.count().catch(() => -1),
    db.cliente.count().catch(() => -1),
    db.producto.count().catch(() => -1),
    db.presupuesto.count().catch(() => -1),
  ]);
  return { usuarios, clientes, productos, presupuestos };
}

/** GET ?key=… — estado actual de la base en la nube. */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== CLAVE) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, documento: await contar() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/** POST ?key=… — crea tablas (si faltan) e inserta {datos}. */
export async function POST(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== CLAVE) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultado: Record<string, unknown> = {};
  const avisosTablas: string[] = [];

  try {
    for (const sentencia of sentenciasDDL()) {
      try {
        await db.$executeRawUnsafe(sentencia);
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        if (/already exists|duplicate/i.test(mensaje)) avisosTablas.push(mensaje.slice(0, 100));
        else throw error;
      }
    }
    resultado.tablas = "creadas/verificadas (" + avisosTablas.length + " ya existían)";

    const cuerpo = (await request.json().catch(() => null)) as {
      datos?: Record<string, Registro[]> | null;
    } | null;

    if (!cuerpo?.datos) {
      return NextResponse.json({ ok: true, ...resultado, conteo: await contar() });
    }

    const datos = cuerpo.datos;
    const resumen: Record<string, number> = {};

    const orden: Array<
      [string, (lotes: Registro[]) => Promise<number>]
    > = [
      ["usuarios", (l) => db.usuario.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["clientes", (l) => db.cliente.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["unidades", (l) => db.unidad.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["ivas", (l) => db.iva.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["categorias", (l) => db.categoria.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["productos", (l) => db.producto.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["configuracion", (l) => db.configuracion.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["presupuestos", (l) => db.presupuesto.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["presupuestosItems", (l) => db.presupuestoItem.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["enviosCorreo", (l) => db.envioCorreo.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
      ["integracionSheets", (l) => db.integracionSheets.createMany({ data: l as never, skipDuplicates: true }).then((r) => r.count)],
    ];

    for (const [clave, insertar] of orden) {
      const lista = datos[clave];
      if (!Array.isArray(lista)) {
        resumen[clave] = 0;
        continue;
      }
      const lotes = lista.map((registro) => convertir({ ...registro }));
      let insertados = 0;
      for (let i = 0; i < lotes.length; i += 100) {
        insertados += await insertar(lotes.slice(i, i + 100));
      }
      resumen[clave] = insertados;
    }

    return NextResponse.json({
      ok: true,
      ...resultado,
      resumen,
      conteo: await contar(),
    });
  } catch (error) {
    console.error("POST /api/instalar error:", error);
    return NextResponse.json(
      {
        ok: false,
        detalle: error instanceof Error ? error.message : String(error),
        ...resultado,
      },
      { status: 500 }
    );
  }
}
