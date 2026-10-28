"use client";

import {
  calcularTotalesPresupuesto,
  formatearFechaISO,
  numeroALetras,
} from "@/lib/presupuestos-utils";
import { formatearMoneda } from "@/lib/productos-utils";
import type { Configuracion, Presupuesto } from "@/lib/types";

const formatearCantidad = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

type PresupuestoDocumentoProps = {
  presupuesto: Presupuesto;
  configuracion: Configuracion | null;
};

/**
 * Documento formal del presupuesto, listo para imprimir o guardar como PDF.
 * Respeta el diseño definido en Configuración: color de acento
 * (presupuestoColor), tamaño de fila (presupuestoFila) y logotipo
 * (presupuestoLogo, con el logotipo de la empresa como alternativa).
 */
export function PresupuestoDocumento({
  presupuesto,
  configuracion,
}: PresupuestoDocumentoProps) {
  const color = configuracion?.presupuestoColor || "#1D4ED8";
  const filaGrande = configuracion?.presupuestoFila === "grande";
  const logo = configuracion?.presupuestoLogo ?? configuracion?.logo ?? null;

  const { cliente, items } = presupuesto;
  const { ivaPorTasa } = calcularTotalesPresupuesto(items);

  const empresa = {
    nombre: configuracion?.nombreComercial ?? "Mi empresa",
    razonLegal: configuracion?.razonLegal ?? "",
    rfc: configuracion?.rfc ?? "",
    direccion: configuracion?.direccion ?? "",
    telefono: configuracion?.telefono ?? "",
    email: configuracion?.email ?? "",
  };

  const folio = `PTO-${presupuesto.id.slice(-6).toUpperCase()}`;
  const lineasDireccionCliente = [
    `${cliente.calle} ${cliente.numero}`,
    cliente.colonia ? `Col. ${cliente.colonia}` : "",
    cliente.codigoPostal ? `C.P. ${cliente.codigoPostal}` : "",
  ].filter(Boolean);

  return (
    <div className="bg-white px-4 py-6 text-neutral-900 sm:px-10 sm:py-10">
      {/* Encabezado: empresa + título del documento */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {logo ? (
            <img
              src={logo}
              alt={`Logotipo de ${empresa.nombre}`}
              className="h-16 w-16 shrink-0 rounded-md object-contain"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md text-2xl font-bold text-white"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            >
              {empresa.nombre.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="break-words text-base font-bold leading-tight">
              {empresa.nombre}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              RFC: {empresa.rfc}
              {empresa.direccion ? ` · ${empresa.direccion}` : ""}
            </p>
            <p className="text-xs text-neutral-600">
              {[empresa.telefono, empresa.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
          <p
            className="text-lg font-bold uppercase tracking-wide"
            style={{ color }}
          >
            Presupuesto
          </p>
          <p className="mt-1 text-xs font-medium tabular-nums text-neutral-600">
            Folio: {folio}
          </p>
          <p className="text-xs tabular-nums text-neutral-600">
            Fecha: {formatearFechaISO(presupuesto.fecha)}
          </p>
        </div>
      </header>

      <div className="mt-4 h-1 rounded-full sm:mt-4" style={{ backgroundColor: color }} />

      {/* Datos del cliente */}
      <section className="mt-5 sm:mt-6">
        <p
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color }}
        >
          Cliente
        </p>
        <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <p className="font-semibold">{cliente.razonSocial}</p>
          <p className="tabular-nums sm:text-right">
            <span className="text-neutral-500">RFC: </span>
            {cliente.rfc}
          </p>
          <p className="text-neutral-700">
            {lineasDireccionCliente.join(", ")}
          </p>
          <p className="text-neutral-700 sm:text-right">
            {cliente.ciudad}, {cliente.estado}
          </p>
          <p className="tabular-nums text-neutral-700">
            <span className="text-neutral-500">Tel: </span>
            {cliente.telefono}
          </p>
          <p className="truncate text-neutral-700 sm:text-right">
            {cliente.email}
          </p>
        </div>
      </section>

      {/* Partidas */}
      <section className="mt-6">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr style={{ backgroundColor: color, color: "#ffffff" }}>
              <th className="w-[13%] px-1.5 py-2 text-left text-[11px] font-semibold uppercase sm:w-[12%] sm:px-2">
                Cantidad
              </th>
              <th className="w-[44%] px-1.5 py-2 text-[11px] font-semibold uppercase sm:w-[45%] sm:px-2">
                Producto
              </th>
              <th className="w-[16%] px-1.5 py-2 text-right text-[11px] font-semibold uppercase sm:w-[14%] sm:px-2">
                P. unitario
              </th>
              <th className="hidden w-[10%] px-1.5 py-2 text-right text-[11px] font-semibold uppercase sm:table-cell sm:px-2">
                IVA
              </th>
              <th className="w-[18%] px-1.5 py-2 text-right text-[11px] font-semibold uppercase sm:w-[14%] sm:px-2">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, indice) => (
              <tr
                key={item.id}
                className={`break-inside-avoid border-b border-neutral-200 ${
                  filaGrande ? "text-[15px]" : "text-[13px]"
                }`}
              >
                <td
                  className={`px-1.5 text-left align-top tabular-nums sm:px-2 ${
                    filaGrande ? "py-3.5" : "py-2"
                  }`}
                >
                  {formatearCantidad.format(item.cantidad)}
                </td>
                <td
                  className={`px-1.5 align-top sm:px-2 ${
                    filaGrande ? "py-3.5" : "py-2"
                  }`}
                >
                  <p className="font-medium leading-snug">{item.descripcion}</p>
                  <p className="text-[11px] text-neutral-500">
                    {[
                      item.unidad,
                      item.codigoSat ? `Cód. SAT ${item.codigoSat}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <span className="sm:hidden">
                      {" · IVA "+item.ivaTasa+"%"}
                    </span>
                  </p>
                </td>
                <td
                  className={`px-1.5 text-right align-top tabular-nums sm:px-2 ${
                    filaGrande ? "py-3.5" : "py-2"
                  }`}
                >
                  {formatearMoneda(item.precioUnitario)}
                </td>
                <td
                  className={`hidden px-1.5 text-right align-top tabular-nums sm:table-cell sm:px-2 ${
                    filaGrande ? "py-3.5" : "py-2"
                  }`}
                >
                  {item.ivaTasa}%
                </td>
                <td
                  className={`px-1.5 text-right align-top font-medium tabular-nums sm:px-2 ${
                    filaGrande ? "py-3.5" : "py-2"
                  }`}
                >
                  {formatearMoneda(item.importe)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totales */}
      <section className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-sm text-neutral-700">
          <p>
            <span className="font-semibold">Cantidad de artículos: </span>
            <span className="tabular-nums">
              {formatearCantidad.format(
                items.reduce((suma, item) => suma + item.cantidad, 0)
              )}
            </span>
          </p>
          <p className="mt-2 max-w-md text-xs uppercase leading-snug text-neutral-600">
            <span className="font-semibold">Total en letra: </span>
            {numeroALetras(presupuesto.total)}
          </p>
        </div>
        <div className="w-full max-w-xs text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-600">SUB TOTAL</span>
            <span className="font-medium tabular-nums">
              {formatearMoneda(presupuesto.subtotal)}
            </span>
          </div>
          {ivaPorTasa.length > 1 ? (
            ivaPorTasa.map((linea) => (
              <div
                key={linea.tasa}
                className="flex items-center justify-between py-1"
              >
                <span className="text-neutral-600">IVA {linea.tasa}%</span>
                <span className="tabular-nums">
                  {formatearMoneda(linea.importe)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-600">IVA</span>
              <span className="tabular-nums">
                {formatearMoneda(presupuesto.iva)}
              </span>
            </div>
          )}
          <div
            className="mt-2 flex items-center justify-between rounded px-3 py-2 text-base font-bold text-white"
            style={{ backgroundColor: color }}
          >
            <span>TOTAL</span>
            <span className="tabular-nums">
              {formatearMoneda(presupuesto.total)}
            </span>
          </div>
        </div>
      </section>

      {/* Observaciones */}
      {presupuesto.observaciones && (
        <section className="mt-6 break-inside-avoid">
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color }}
          >
            Observaciones
          </p>
          <p className="mt-1 whitespace-pre-line border-l-2 pl-3 text-sm text-neutral-700"
            style={{ borderColor: color }}
          >
            {presupuesto.observaciones}
          </p>
        </section>
      )}

      {/* Pie del documento */}
      <footer className="mt-8 border-t border-neutral-200 pt-4 text-center">
        <p className="text-sm font-medium" style={{ color }}>
          Gracias por su preferencia
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Precios en pesos mexicanos (MXN)
          {empresa.telefono ? ` · ${empresa.telefono}` : ""}
          {empresa.email ? ` · ${empresa.email}` : ""}
        </p>
      </footer>
    </div>
  );
}
