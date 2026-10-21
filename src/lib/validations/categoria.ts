import { z } from "zod";

/**
 * Esquema de validación para el catálogo de Categorías.
 * El nombre se normaliza (espacios internos colapsados).
 */
export const categoriaSchema = z.object({
  categoria: z
    .string()
    .trim()
    .min(3, "La categoría debe tener al menos 3 caracteres")
    .max(80, "La categoría no puede exceder 80 caracteres")
    .transform((valor) => valor.replace(/\s+/g, " ")),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;
