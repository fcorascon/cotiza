import { z } from "zod";

/**
 * Esquema de validación para Clientes.
 * RFC mexicano: 3-4 letras + 6 dígitos de fecha + homoclave de 3 caracteres (12-13 posiciones).
 */
export const clienteSchema = z.object({
  razonSocial: z
    .string()
    .trim()
    .min(3, "La razón social o nombre debe tener al menos 3 caracteres")
    .max(150, "La razón social no puede exceder 150 caracteres"),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
      "RFC inválido. Ejemplo: GODE561231GR8 (13 caracteres) o GABJ800101AB2 (12 caracteres)"
    ),
  calle: z
    .string()
    .trim()
    .min(3, "La calle es obligatoria")
    .max(120, "La calle no puede exceder 120 caracteres"),
  numero: z
    .string()
    .trim()
    .min(1, "El número exterior es obligatorio")
    .max(20, "El número no puede exceder 20 caracteres"),
  colonia: z
    .string()
    .trim()
    .min(3, "La colonia es obligatoria")
    .max(120, "La colonia no puede exceder 120 caracteres"),
  codigoPostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "El C.P. debe tener 5 dígitos"),
  ciudad: z
    .string()
    .trim()
    .min(2, "La ciudad es obligatoria")
    .max(120, "La ciudad no puede exceder 120 caracteres"),
  estado: z
    .string()
    .trim()
    .min(2, "El estado es obligatorio")
    .max(120, "El estado no puede exceder 120 caracteres"),
  telefono: z
    .string()
    .trim()
    .regex(
      /^[+\d][\d\s().-]{6,19}$/,
      "Teléfono inválido. Ejemplo: 664 123 4567"
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo electrónico inválido. Ejemplo: contacto@empresa.com")
    .max(150, "El correo no puede exceder 150 caracteres"),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
