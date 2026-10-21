import { z } from "zod";

/**
 * Esquema de validación para el catálogo de tasas de IVA.
 * Se captura como texto para facilitar la edición en el formulario:
 * se eliminan espacios y el símbolo "%", se acepta coma decimal
 * y se convierte a número en el servidor.
 */
export const ivaSchema = z.object({
  tasa: z
    .string()
    .trim()
    .transform((valor) =>
      valor.replace(/%/g, "").replace(/\s+/g, "").replace(",", ".")
    )
    .refine((valor) => valor.length > 0, "La tasa de IVA es requerida")
    .refine(
      (valor) => /^\d{1,3}(\.\d{1,2})?$/.test(valor),
      "Ingrese un porcentaje válido (ej. 0, 8 o 16)"
    )
    .refine(
      (valor) => Number(valor) <= 100,
      "La tasa no puede exceder 100%"
    ),
});

export type IvaInput = z.infer<typeof ivaSchema>;
