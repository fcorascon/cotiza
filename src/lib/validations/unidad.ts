import { z } from "zod";

/**
 * Esquema de validación para el catálogo de Unidades.
 * El nombre de la unidad se normaliza (espacios internos colapsados).
 */
export const unidadSchema = z.object({
  unidad: z
    .string()
    .trim()
    .min(2, "La unidad debe tener al menos 2 caracteres")
    .max(60, "La unidad no puede exceder 60 caracteres")
    .transform((valor) => valor.replace(/\s+/g, " ")),
});

export type UnidadInput = z.infer<typeof unidadSchema>;
