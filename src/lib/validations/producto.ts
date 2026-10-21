import { z } from "zod";
import { normalizarNumeroTexto } from "@/lib/productos-utils";

/**
 * Esquema de validación para el catálogo de productos.
 * Los montos (costo y margen) se capturan como texto para facilitar
 * la edición en el formulario: se eliminan "$", espacios y separadores,
 * se acepta coma decimal y se convierten a número en el servidor.
 *
 * MARGEN = porcentaje de ganancia que se agrega al costo para obtener
 * el SUBTOTAL (subtotal = costo × (1 + margen / 100)), que se calcula
 * automáticamente y no se captura.
 */
export const productoSchema = z.object({
  codigoSat: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\s+/g, " ").toUpperCase())
    .refine(
      (valor) => valor.length >= 3,
      "El código SAT es requerido (mínimo 3 caracteres)"
    )
    .refine(
      (valor) => valor.length <= 20,
      "El código SAT no puede exceder 20 caracteres"
    )
    .refine(
      (valor) => /^[A-Z0-9.\-]+$/.test(valor),
      "El código solo puede contener letras, números, puntos y guiones"
    ),

  descripcion: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\s+/g, " ").toUpperCase())
    .refine(
      (valor) => valor.length >= 3,
      "La descripción es requerida (mínimo 3 caracteres)"
    )
    .refine(
      (valor) => valor.length <= 200,
      "La descripción no puede exceder 200 caracteres"
    ),

  unidadId: z
    .string()
    .trim()
    .refine((valor) => valor.length > 0, "Seleccione una unidad"),

  categoriaId: z
    .string()
    .trim()
    .refine((valor) => valor.length > 0, "Seleccione una categoría"),

  ivaId: z
    .string()
    .trim()
    .refine((valor) => valor.length > 0, "Seleccione la tasa de IVA"),

  costo: z
    .string()
    .trim()
    .transform((valor) => normalizarNumeroTexto(valor))
    .refine((valor) => valor.length > 0, "El costo es requerido")
    .refine(
      (valor) => /^\d+(\.\d{1,2})?$/.test(valor),
      "Ingrese un monto válido (ej. 150 o 150.50)"
    )
    .refine(
      (valor) => Number(valor) <= 99999999,
      "El costo excede el máximo permitido"
    ),

  margen: z
    .string()
    .trim()
    .transform((valor) => normalizarNumeroTexto(valor))
    .refine((valor) => valor.length > 0, "El margen es requerido")
    .refine(
      (valor) => /^\d+(\.\d{1,2})?$/.test(valor),
      "Ingrese un porcentaje válido (ej. 20 o 35.5)"
    )
    .refine(
      (valor) => Number(valor) <= 999,
      "El margen no puede exceder 999%"
    ),

  notas: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\s+/g, " ").toUpperCase())
    .refine(
      (valor) => valor.length <= 500,
      "Las notas no pueden exceder 500 caracteres"
    )
    .optional(),
});

export type ProductoInput = z.infer<typeof productoSchema>;
