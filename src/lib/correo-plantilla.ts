/**
 * Plantilla HTML del correo de presupuesto.
 * Se construye con estilos en línea (los clientes de correo no
 * respetan hojas de estilo externas) y usa la apariencia configurada:
 * logotipo y color distintivo del documento de presupuesto.
 */

import { formatearMoneda } from "@/lib/productos-utils";
import {
  calcularTotalesPresupuesto,
  formatearFechaISO,
} from "@/lib/presupuestos-utils";
import type { Configuracion, Presupuesto } from "@/lib/types";

type DatosPresupuesto = {
  cliente: {
    razonSocial: string;
    rfc: string;
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    ciudad: string;
    estado: string;
  };
  fecha: string;
  observaciones: string | null;
  items: Array<{
    descripcion: string;
    codigoSat: string | null;
    unidad: string | null;
    cantidad: number;
    precioUnitario: number;
    importe: number;
    ivaTasa: number;
  }>;
};

type DatosConfiguracion = Pick<
  Configuracion,
  | "nombreComercial"
  | "razonLegal"
  | "rfc"
  | "direccion"
  | "telefono"
  | "email"
  | "logo"
  | "presupuestoColor"
  | "presupuestoLogo"
>;

/** Escapa texto plano para incrustarlo en HTML de forma segura. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Folio legible del presupuesto: PTO-XXXXXX (últimos 6 del id). */
export function folioPresupuesto(id: string): string {
  return `PTO-${id.slice(-6).toUpperCase()}`;
}

/** Asunto por defecto del correo de presupuesto. */
export function asuntoPorDefecto(
  presupuesto: DatosPresupuesto & { id: string },
  config: DatosConfiguracion
): string {
  return `Presupuesto ${folioPresupuesto(presupuesto.id)} - ${config.nombreComercial}`;
}

export function crearHtmlPresupuesto(
  presupuesto: DatosPresupuesto & { id: string },
  config: DatosConfiguracion,
  mensajePersonal?: string
): string {
  const color = config.presupuestoColor || "#1D4ED8";
  const logo = config.presupuestoLogo ?? config.logo ?? null;
  const folio = folioPresupuesto(presupuesto.id);
  const { subtotal, ivaPorTasa, total } = calcularTotalesPresupuesto(
    presupuesto.items
  );

  const lineaDireccionCliente = `${presupuesto.cliente.calle} ${presupuesto.cliente.numero}, ${presupuesto.cliente.colonia}, C.P. ${presupuesto.cliente.codigoPostal}, ${presupuesto.cliente.ciudad}, ${presupuesto.cliente.estado}`;

  const filasItems = presupuesto.items
    .map(
      (item, indice) => `
      <tr style="background:${indice % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${escapar(item.descripcion)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;text-align:center;">${item.cantidad}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;text-align:center;">${escapar(item.unidad ?? "—")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;text-align:right;">${formatearMoneda(item.precioUnitario)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;text-align:right;font-weight:bold;">${formatearMoneda(item.importe)}</td>
      </tr>`
    )
    .join("");

  const filasIva = ivaPorTasa
    .map(
      (linea) => `
      <tr>
        <td style="padding:4px 10px;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;text-align:right;">IVA ${linea.tasa}%</td>
        <td style="padding:4px 10px;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;text-align:right;">${formatearMoneda(linea.importe)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:96%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

        <!-- Encabezado -->
        <tr>
          <td style="background:${color};padding:20px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  ${
                    logo
                      ? `<img src="${logo}" alt="Logotipo ${escapar(config.nombreComercial)}" width="64" style="display:block;max-height:64px;max-width:64px;border:0;background:#ffffff;border-radius:6px;padding:4px;" />`
                      : ""
                  }
                </td>
                <td style="vertical-align:middle;text-align:right;color:#ffffff;">
                  <p style="margin:0;font-size:18px;font-weight:bold;">${escapar(config.nombreComercial)}</p>
                  <p style="margin:2px 0 0;font-size:11px;">RFC: ${escapar(config.rfc)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Folio y fecha -->
        <tr>
          <td style="padding:18px 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:20px;font-weight:bold;color:${color};">PRESUPUESTO</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#475569;">Folio: <strong>${folio}</strong></p>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <p style="margin:0;font-size:13px;color:#475569;">Fecha: <strong>${formatearFechaISO(presupuesto.fecha)}</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${
          mensajePersonal
            ? `<tr><td style="padding:14px 24px 0;">
                 <p style="margin:0;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#713f12;font-style:italic;">${escapar(mensajePersonal)}</p>
               </td></tr>`
            : ""
        }

        <!-- Datos del cliente -->
        <tr><td style="padding:16px 24px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#64748b;">CLIENTE</p>
          <p style="margin:0;font-size:15px;font-weight:bold;color:#0f172a;">${escapar(presupuesto.cliente.razonSocial)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#475569;">RFC: ${escapar(presupuesto.cliente.rfc)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#475569;">${escapar(lineaDireccionCliente)}</p>
        </td></tr>

        <!-- Partidas -->
        <tr><td style="padding:16px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <tr style="background:${color};">
              <th style="padding:9px 10px;font-size:11px;color:#ffffff;text-align:left;">DESCRIPCIÓN</th>
              <th style="padding:9px 10px;font-size:11px;color:#ffffff;text-align:center;">CANT.</th>
              <th style="padding:9px 10px;font-size:11px;color:#ffffff;text-align:center;">UNIDAD</th>
              <th style="padding:9px 10px;font-size:11px;color:#ffffff;text-align:right;">P. UNIT.</th>
              <th style="padding:9px 10px;font-size:11px;color:#ffffff;text-align:right;">IMPORTE</th>
            </tr>
            ${filasItems || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#64748b;font-size:13px;">Sin partidas registradas.</td></tr>`}
          </table>
        </td></tr>

        <!-- Totales -->
        <tr><td style="padding:14px 24px 0;">
          <table role="presentation" width="260" cellpadding="0" cellspacing="0" style="width:260px;margin-left:auto;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <tr>
              <td style="padding:6px 10px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;text-align:right;"><strong>SUB TOTAL</strong></td>
              <td style="padding:6px 10px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;text-align:right;width:110px;">${formatearMoneda(subtotal)}</td>
            </tr>
            ${filasIva}
            <tr>
              <td style="padding:9px 10px;font-size:14px;color:#ffffff;background:${color};text-align:right;"><strong>TOTAL</strong></td>
              <td style="padding:9px 10px;font-size:14px;color:#ffffff;background:${color};text-align:right;"><strong>${formatearMoneda(total)}</strong></td>
            </tr>
          </table>
        </td></tr>

        <!-- Observaciones -->
        ${
          presupuesto.observaciones
            ? `<tr><td style="padding:14px 24px 0;">
                 <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#64748b;">OBSERVACIONES</p>
                 <p style="margin:0;font-size:12px;color:#334155;">${escapar(presupuesto.observaciones)}</p>
               </td></tr>`
            : ""
        }

        <!-- Pie -->
        <tr><td style="padding:22px 24px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px;" />
          <p style="margin:0;font-size:11px;color:#64748b;text-align:center;line-height:1.6;">
            ${escapar(config.razonLegal)} · ${escapar(config.direccion)}<br />
            Tel. ${escapar(config.telefono)} · ${escapar(config.email)}<br />
            Este correo fue generado por el Administrador de Presupuestos.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
