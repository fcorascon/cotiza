import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presupuestoSchema } from "@/lib/validations/presupuesto";
import {
  calcularTotalesPresupuesto,
  redondear2,
} from "@/lib/presupuestos-utils";

type RouteContext = { params: Promise<{ id: string }> };

/** Datos completos del cliente (necesarios para el documento impreso). */
const SELECCION_CLIENTE = {
  id: true,
  razonSocial: true,
  rfc: true,
  calle: true,
  numero: true,
  colonia: true,
  codigoPostal: true,
  ciudad: true,
  estado: true,
  telefono: true,
  email: true,
} as const;

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
 * GET /api/presupuestos/[id]
 * Devuelve un presupuesto completo (cliente + partidas) para su
 * visualización o edición.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const presupuesto = await db.presupuesto.findUnique({
      where: { id },
      include: INCLUYIR_PRESUPUESTO,
    });
    if (!presupuesto) {
      return NextResponse.json(
        { error: "El presupuesto solicitado no existe" },
        { status: 404 }
      );
    }
    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error("GET /api/presupuestos/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener el presupuesto" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/presupuestos/[id]
 * Actualiza un presupuesto existente: reemplaza todas sus partidas y
 * recalcula importes, IVA y totales en el servidor.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.presupuesto.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El presupuesto solicitado no existe" },
        { status: 404 }
      );
    }

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

    const presupuesto = await db.presupuesto.update({
      where: { id },
      data: {
        clienteId: parsed.data.clienteId,
        fecha: parsed.data.fecha,
        observaciones: parsed.data.observaciones,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
        items: {
          deleteMany: {},
          create: itemsData,
        },
      },
      include: INCLUYIR_PRESUPUESTO,
    });
    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error("PUT /api/presupuestos/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el presupuesto" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presupuestos/[id]
 * Elimina un presupuesto y sus partidas (borrado en cascada).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existente = await db.presupuesto.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        { error: "El presupuesto solicitado no existe" },
        { status: 404 }
      );
    }

    await db.presupuesto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/presupuestos/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el presupuesto" },
      { status: 500 }
    );
  }
}
