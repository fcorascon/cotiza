"use client";

import { formatearFechaISO } from "@/lib/presupuestos-utils";
import type { Configuracion, Presupuesto } from "@/lib/types";

const formatearCantidad = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

type ReciboMercanciasDocumentoProps = {
  presupuesto: Presupuesto;
  configuracion: Configuracion | null;
};

/**
 * Recibo de mercancía sin valores monetarios: lista las partidas con
 * cantidad, unidad y código SAT, y cierra con el número de artículos y
 * el espacio de nombre y firma de quien recibe.
 */
export function ReciboMercanciasDocumento({
  presupuesto,
  configuracion,
}: ReciboMercanciasDocumentoProps) {
  const color = configuracion?.presupuestoColor || "#1D4ED8";
  const logo =
    configuracion?.presupuestoLogo ?? configuracion?.logo ?? null;

  const { items } = presupuesto;
  const totalArticulos = items.reduce((suma, item) => suma + item.cantidad, 0);
  const folio = `RCM-${presupuesto.id.slice(-6).toUpperCase()}`;
  const empresa = {
    nombre: configuracion?.nombreComercial ?? "Mi empresa",
    rfc: configuracion?.rfc ?? "",
    direccion: configuracion?.direccion ?? "",
    telefono: configuracion?.telefono ?? "",
    email: configuracion?.email ?? "",
  };

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
            <p className="whitespace-nowrap text-base font-bold leading-tight">
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
            className="text-base font-bold uppercase tracking-wide"
            style={{ color }}
          >
            Recibo de mercancía
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
        <p className="mt-1 text-sm font-semibold">
          {presupuesto.cliente.razonSocial}
        </p>
        <p className="text-xs text-neutral-600">
          {presupuesto.cliente.ciudad}, {presupuesto.cliente.estado}
          {presupuesto.cliente.telefono
            ? ` · Tel: ${presupuesto.cliente.telefono}`
            : ""}
        </p>
      </section>

      {/* Mercancía recibida: cantidad, unidad y código SAT (sin montos) */}
      <section className="mt-6">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr style={{ backgroundColor: color, color: "#ffffff" }}>
              <th className="w-[12%] px-1.5 py-2 text-left text-[11px] font-semibold uppercase sm:w-[10%] sm:px-2">
                Cantidad
              </th>
              <th className="w-[14%] px-1.5 py-2 text-left text-[11px] font-semibold uppercase sm:w-[12%] sm:px-2">
                Unidad
              </th>
              <th className="w-[24%] px-1.5 py-2 text-left text-[11px] font-semibold uppercase sm:w-[22%] sm:px-2">
                Código SAT
              </th>
              <th className="w-[50%] px-1.5 py-2 text-left text-[11px] font-semibold uppercase sm:px-2">
                Artículo
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="break-inside-avoid border-b border-neutral-200 text-[13px]"
              >
                <td className="px-1.5 py-2 align-top tabular-nums sm:px-2">
                  {formatearCantidad.format(item.cantidad)}
                </td>
                <td className="px-1.5 py-2 align-top sm:px-2">
                  {item.unidad ?? "—"}
                </td>
                <td className="px-1.5 py-2 align-top tabular-nums sm:px-2">
                  {item.codigoSat ?? "—"}
                </td>
                <td className="px-1.5 py-2 align-top sm:px-2">
                  <p className="font-medium leading-snug">{item.descripcion}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Número total de artículos recibidos */}
      <section className="mt-5 text-sm">
        <p>
          <span className="font-semibold">Número de artículos: </span>
          <span className="tabular-nums">
            {formatearCantidad.format(totalArticulos)}
          </span>
        </p>
      </section>

      {/* Nombre y firma de quien recibe */}
      <section className="mt-10 break-inside-avoid">
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="text-center">
            <div className="mx-auto w-full max-w-[240px] border-t border-neutral-500 pt-1 text-xs text-neutral-600">
              Nombre de quien recibe
            </div>
          </div>
          <div className="text-center">
            <div className="mx-auto w-full max-w-[240px] border-t border-neutral-500 pt-1 text-xs text-neutral-600">
              Firma de quien recibe
            </div>
          </div>
        </div>
      </section>

      {/* Pie del documento */}
      <footer className="mt-8 border-t border-neutral-200 pt-4 text-center">
        <p className="text-xs text-neutral-500">
          Documento sin valores monetarios · Recibo de mercancía {folio}
        </p>
      </footer>
    </div>
  );
}
