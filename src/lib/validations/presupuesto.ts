import { z } from "zod";

/**
 * Esquema de validación para la sección de presupuestos.
 *
 * Cada partida (item) se recibe como una "fotografía" del producto del
 * catálogo (descripción, código SAT, unidad, precio unitario y tasa de
 * IVA congelados al momento de la captura), más la cantidad solicitada.
 * El servidor recalcula siempre el importe y los totales; el precio
 * unitario NUNCA se modifica en el servidor para que un cambio posterior
 * en el costo/margen del producto no altere presupuestos ya emitidos.
 */
const itemPresupuestoSchema = z.object({
  productoId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),

  descripcion: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\s+/g, " ").toUpperCase())
    .refine((valor) => valor.length > 0, "El producto de la partida es requerido")
    .refine(
      (valor) => valor.length <= 200,
      "La descripción de la partida no puede exceder 200 caracteres"
    ),

  codigoSat: z
    .string()
    .trim()
    .max(20, "El código SAT no puede exceder 20 caracteres")
    .transform((valor) => valor.toUpperCase())
    .nullable()
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),

  unidad: z
    .string()
    .trim()
    .max(60, "La unidad no puede exceder 60 caracteres")
    .transform((valor) => valor.toUpperCase())
    .nullable()
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),

  cantidad: z
    .number({
      message: "La cantidad debe ser un número válido",
    })
    .positive("La cantidad debe ser mayor a 0")
    .max(99999999, "La cantidad excede el máximo permitido"),

  precioUnitario: z
    .number({
      message: "El precio unitario debe ser un número válido",
    })
    .min(0, "El precio unitario no puede ser negativo")
    .max(99999999, "El precio unitario excede el máximo permitido"),

  ivaTasa: z
    .number({
      message: "La tasa de IVA debe ser un número válido",
    })
    .min(0, "La tasa de IVA no puede ser negativa")
    .max(100, "La tasa de IVA no puede exceder 100%"),
});

export const presupuestoSchema = z.object({
  clienteId: z
    .string({ message: "Seleccione un cliente" })
    .trim()
    .refine((valor) => valor.length > 0, "Seleccione un cliente"),

  fecha: z
    .string({ message: "Seleccione una fecha válida" })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha válida"),

  observaciones: z
    .string({ message: "Las observaciones deben ser texto" })
    .trim()
    .transform((valor) => valor.replace(/\s+/g, " ").toUpperCase())
    .refine(
      (valor) => valor.length <= 1000,
      "Las observaciones no pueden exceder 1000 caracteres"
    )
    .optional()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),

  items: z
    .array(itemPresupuestoSchema, {
      message: "Las partidas del presupuesto son requeridas",
    })
    .min(1, "Agregue al menos un producto al presupuesto"),
});

export type PresupuestoInput = z.infer<typeof presupuestoSchema>;
