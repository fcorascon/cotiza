import { z } from "zod";

/** Logotipo: data URL de imagen, máx. ~2 MB una vez codificada. */
const logotipoSchema = z
  .string()
  .max(2_800_000, "El logotipo excede el tamaño máximo permitido (2 MB)")
  .refine(
    (valor) => valor.startsWith("data:image/"),
    "El archivo debe ser una imagen válida (PNG, JPG, SVG o WebP)"
  )
  .nullable()
  .optional();

/**
 * Esquema de validación para la Configuración del Sistema.
 * El puerto se captura como texto en el formulario y se convierte
 * a número en el servidor.
 */
export const configuracionSchema = z.object({
  // Datos de la empresa
  nombreComercial: z
    .string()
    .trim()
    .min(2, "El nombre comercial debe tener al menos 2 caracteres")
    .max(120, "El nombre comercial no puede exceder 120 caracteres"),
  razonLegal: z
    .string()
    .trim()
    .min(2, "La razón legal debe tener al menos 2 caracteres")
    .max(150, "La razón legal no puede exceder 150 caracteres"),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
      "RFC inválido. Ejemplo: CSN200210B44"
    ),
  direccion: z
    .string()
    .trim()
    .min(5, "La dirección es obligatoria")
    .max(200, "La dirección no puede exceder 200 caracteres"),
  telefono: z
    .string()
    .trim()
    .regex(
      /^[+\d][\d\s().-]{6,19}$/,
      "Teléfono inválido. Ejemplo: 686.4333453"
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo electrónico inválido")
    .max(150, "El correo no puede exceder 150 caracteres"),
  logo: logotipoSchema,

  // Servidor de correo (SMTP)
  smtpHost: z
    .string()
    .trim()
    .min(3, "El host SMTP es obligatorio")
    .max(150, "El host no puede exceder 150 caracteres"),
  smtpPuerto: z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, "El puerto debe ser un número")
    .refine(
      (valor) => Number(valor) >= 1 && Number(valor) <= 65535,
      "El puerto debe estar entre 1 y 65535"
    ),
  smtpCifrado: z.enum(["SSL", "TLS", "NINGUNA"], {
    message: "Seleccione un tipo de cifrado",
  }),
  smtpUsuario: z
    .string()
    .trim()
    .min(3, "El usuario / remitente es obligatorio")
    .max(150, "El usuario no puede exceder 150 caracteres"),
  smtpPassword: z
    .string()
    .max(150, "La contraseña no puede exceder 150 caracteres")
    .optional()
    .default(""),

  // Diseño de documentos
  presupuestoColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Seleccione un color válido"),
  presupuestoFila: z.enum(["normal", "grande"], {
    message: "Seleccione el tipo de fila",
  }),
  presupuestoLogo: logotipoSchema,
  reciboColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Seleccione un color válido"),
  reciboFila: z.enum(["normal", "grande"], {
    message: "Seleccione el tipo de fila",
  }),
  reciboLogo: logotipoSchema,
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;

/** Esquema para la prueba de conexión SMTP. */
export const smtpPruebaSchema = z.object({
  host: z.string().trim().min(3, "El host SMTP es obligatorio"),
  puerto: z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, "Puerto inválido")
    .refine(
      (valor) => Number(valor) >= 1 && Number(valor) <= 65535,
      "El puerto debe estar entre 1 y 65535"
    ),
  cifrado: z.enum(["SSL", "TLS", "NINGUNA"]),
  usuario: z.string().trim().min(3, "El usuario es obligatorio"),
  password: z.string().max(150).optional().default(""),
  destino: z
    .string()
    .trim()
    .email("Correo de destino inválido")
    .optional()
    .or(z.literal("")),
});

export type SmtpPruebaInput = z.infer<typeof smtpPruebaSchema>;
