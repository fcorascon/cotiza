import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presupuestoSchema } from "@/lib/validations/presupuesto";
import {
  calcularTotalesPresupuesto,
  redondear2,
} from "@/lib/presupuestos-utils";

const SELECCION_CLIENTE = { id: true, razonSocial: true } as const;

const INCLUYIR_PRESUPUESTO = {
  cliente: { select: SELECCION_CLIENTE },
  items: { orderBy: { orden: "asc" } },
} as const;

/**
 * Convierte los errores de validación en un mapa campo → mensaje.
 * Para las partidas (items) se antepone el número de renglón cuando
 * el error pertenece a una partida concreta.
 */
function extraerFieldErrors(error: { issues: Array<{ path: unknown[]; message: string }> }): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "general");
    if (fieldErrors[campo]) continue;
    if (campo === "items" && typeof issue.path[1] === "number") {
      fieldErrors.items = `Partida ${issue.path[1] + 1}: ${issue.message}`;
    } else {
      fieldErrors[campo] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Construye las partidas definitivas a partir del cuerpo validado:
 * recalcula importe e IVA por partida (siempre en el servidor) y
 * asigna el orden de aparición.
 */
function construirItems(
  items: Array<{
    productoId: string | null;
    descripcion: string;
    codigoSat: string | null;
    unidad: string | null;
    cantidad: number;
    precioUnitario: number;
    ivaTasa: number;
  }>
) {
  return items.map((item, indice) => {
    const importe = redondear2(item.cantidad * item.precioUnitario);
    const ivaImporte = redondear2((importe * item.ivaTasa) / 100);
    return {
      productoId: item.productoId,
      descripcion: item.descripcion,
      codigoSat: item.codigoSat,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: redondear2(item.precioUnitario),
      importe,
      ivaTasa: item.ivaTasa,
      ivaImporte,
      orden: indice,
    };
  });
}

/**
 * Valida que el cliente y los productos referenciados existan.
 * Devuelve un mapa de errores por campo, o null si todo es válido.
 */
async function validarRelaciones(data: {
  clienteId: string;
  items: Array<{ productoId: string | null }>;
}): Promise<Record<string, string> | null> {
  const fieldErrors: Record<string, string> = {};

  const cliente = await db.cliente.findUnique({
    where: { id: data.clienteId },
    select: { id: true },
  });
  if (!cliente) {
    fieldErrors.clienteId = "El cliente seleccionado no existe";
  }

  const productoIds = Array.from(
    new Set(
      data.items
        .map((item) => item.productoId)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (productoIds.length > 0) {
    const encontrados = await db.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true },
    });
    if (encontrados.length !== productoIds.length) {
      fieldErrors.items =
        "Uno o más productos de la lista ya no existen en el catálogo. Elimínelos del presupuesto e inténtelo de nuevo.";
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * GET /api/presupuestos
 * Lista los presupuestos con su cliente y partidas, del más reciente al más antiguo.
 */
export async function GET() {
  try {
    const presupuestos = await db.presupuesto.findMany({
      include: INCLUYIR_PRESUPUESTO,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(presupuestos);
  } catch (error) {
    console.error("GET /api/presupuestos error:", error);
    return NextResponse.json(
      { error: "Error al obtener los presupuestos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/presupuestos
 * Crea un presupuesto con sus partidas. Los importes, el IVA y los
 * totales se calculan siempre en el servidor.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = presupuestoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", fieldErrors: extraerFieldErrors(parsed.error) },
        { status: 400 }
      );
    }

    const erroresRelacion = await validarRelaciones(parsed.data);
    if (erroresRelacion) {
      return NextResponse.json(
        { error: "Datos inválidos", fieldErrors: erroresRelacion },
        { status: 400 }
      );
    }

    const itemsData = construirItems(parsed.data.items);
    const totales = calcularTotalesPresupuesto(parsed.data.items);

    const presupuesto = await db.presupuesto.create({
      data: {
        clienteId: parsed.data.clienteId,
        fecha: parsed.data.fecha,
        observaciones: parsed.data.observaciones,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
        items: { create: itemsData },
      },
      include: INCLUYIR_PRESUPUESTO,
    });
    return NextResponse.json(presupuesto, { status: 201 });
  } catch (error) {
    console.error("POST /api/presupuestos error:", error);
    return NextResponse.json(
      { error: "Error al crear el presupuesto" },
      { status: 500 }
    );
  }
}
