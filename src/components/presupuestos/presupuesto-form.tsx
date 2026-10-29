"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  calcularTotalesPresupuesto,
  fechaHoyISO,
  redondear2,
} from "@/lib/presupuestos-utils";
import { formatearMoneda } from "@/lib/productos-utils";
import type {
  Cliente,
  Presupuesto,
  ProductoCombobox,
  SeccionApp,
} from "@/lib/types";

type PresupuestoFormProps = {
  editing: Presupuesto | null;
  onSaved: () => void;
  onCancelEdit: () => void;
  clientes: Cliente[];
  cargandoCatalogos: boolean;
  onIrA: (seccion: SeccionApp) => void;
};

/** Partida temporal mientras se captura (cantidad como texto para edición fluida). */
type PartidaTemporal = {
  clave: string;
  productoId: string | null;
  descripcion: string;
  codigoSat: string | null;
  unidad: string | null;
  cantidadTexto: string;
  precioUnitario: number;
  ivaTasa: number;
};

type ErroresFormulario = {
  clienteId?: string;
  fecha?: string;
  items?: string;
};

/** Clave estable sin depender de crypto.randomUUID (funciona en cualquier navegador). */
let contadorClaves = 0;
function nuevaClave(): string {
  contadorClaves += 1;
  return `${Date.now()}-${contadorClaves}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convierte la cantidad capturada como texto a número (NaN si es inválida). */
function cantidadANumero(texto: string): number {
  const normalizado = texto.trim().replace(",", ".");
  if (normalizado.length === 0) return NaN;
  return Number(normalizado);
}

/**
 * Aviso que se muestra cuando un catálogo necesario (clientes o
 * productos) aún no tiene registros, con acceso directo a la sección.
 */
function AvisoCatalogoVacio({
  mensaje,
  destino,
  etiquetaBoton,
  onIrA,
}: {
  mensaje: string;
  destino: SeccionApp;
  etiquetaBoton: string;
  onIrA: (seccion: SeccionApp) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <span className="min-w-0 flex-1">{mensaje}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 border-amber-400 px-2 text-xs text-amber-900 hover:bg-amber-100"
        onClick={() => onIrA(destino)}
      >
        {etiquetaBoton}
      </Button>
    </div>
  );
}

function MensajeError({ children }: { children: string }) {
  return <p className="text-sm font-medium text-destructive">{children}</p>;
}

export function PresupuestoForm({
  editing,
  onSaved,
  onCancelEdit,
  clientes,
  cargandoCatalogos,
  onIrA,
}: PresupuestoFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  // Datos generales
  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState(fechaHoyISO);
  const [observaciones, setObservaciones] = useState("");

  // Selector de productos (combobox con búsqueda en el servidor)
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [resultadosProducto, setResultadosProducto] = useState<
    ProductoCombobox[]
  >([]);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [productoElegido, setProductoElegido] = useState<ProductoCombobox | null>(
    null
  );
  const [cantidadNueva, setCantidadNueva] = useState("1");
  const [errorCantidadNueva, setErrorCantidadNueva] = useState<string | null>(
    null
  );

  // Partidas del presupuesto
  const [items, setItems] = useState<PartidaTemporal[]>([]);
  const [errores, setErrores] = useState<ErroresFormulario>({});

  // Al seleccionar un presupuesto para editar, se carga completo.
  useEffect(() => {
    if (editing) {
      setClienteId(editing.clienteId);
      setFecha(editing.fecha);
      setObservaciones(editing.observaciones ?? "");
      setItems(
        editing.items.map((item) => ({
          clave: item.id,
          productoId: item.productoId,
          descripcion: item.descripcion,
          codigoSat: item.codigoSat,
          unidad: item.unidad,
          cantidadTexto: String(item.cantidad),
          precioUnitario: item.precioUnitario,
          ivaTasa: item.ivaTasa,
        }))
      );
      setProductoElegido(null);
      setCantidadNueva("1");
      setErrores({});
      setErrorCantidadNueva(null);
    }
  }, [editing]);

  /*
   * Catálogo completo en el selector: al abrir se descarga una sola vez
   * (limite=todos) y el filtrado se hace en el navegador conforme se
   * escribe, sin consultas al servidor por tecla.
   */
  useEffect(() => {
    if (!selectorAbierto || resultadosProducto.length > 0) return;
    let vigente = true;
    setBuscandoProducto(true);
    fetch("/api/productos?vista=combobox&limite=todos", { cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        if (vigente && Array.isArray(datos)) {
          setResultadosProducto(datos);
        }
      })
      .catch(() => {
        if (vigente) setResultadosProducto([]);
      })
      .finally(() => {
        if (vigente) setBuscandoProducto(false);
      });
    return () => {
      vigente = false;
    };
  }, [busquedaProducto, selectorAbierto, resultadosProducto.length]);

  // Totales en vivo: sub total + IVA (por tasa) + total.
  const totales = useMemo(
    () =>
      calcularTotalesPresupuesto(
        items.map((item) => ({
          cantidad:
            Number.isFinite(cantidadANumero(item.cantidadTexto)) &&
            cantidadANumero(item.cantidadTexto) > 0
              ? cantidadANumero(item.cantidadTexto)
              : 0,
          precioUnitario: item.precioUnitario,
          ivaTasa: item.ivaTasa,
        }))
      ),
    [items]
  );

  const clienteNombre = clientes.find((c) => c.id === clienteId)?.razonSocial;

  function limpiarFormulario() {
    setClienteId("");
    setFecha(fechaHoyISO());
    setObservaciones("");
    setItems([]);
    setProductoElegido(null);
    setBusquedaProducto("");
    setCantidadNueva("1");
    setErrores({});
    setErrorCantidadNueva(null);
  }

  function handleCancel() {
    limpiarFormulario();
    onCancelEdit();
  }

  function agregarProducto() {
    if (!productoElegido) return;
    const cantidad = cantidadANumero(cantidadNueva);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setErrorCantidadNueva("Ingrese una cantidad mayor a 0");
      return;
    }
    setErrorCantidadNueva(null);
    setItems((previo) => [
      ...previo,
      {
        clave: nuevaClave(),
        productoId: productoElegido.id,
        descripcion: productoElegido.descripcion,
        codigoSat: productoElegido.codigoSat,
        unidad: productoElegido.unidad,
        cantidadTexto: String(cantidad),
        precioUnitario: productoElegido.subtotal,
        ivaTasa: productoElegido.tasa,
      },
    ]);
    setProductoElegido(null);
    setBusquedaProducto("");
    setCantidadNueva("1");
    setErrores((previo) => ({ ...previo, items: undefined }));
  }

  function quitarPartida(clave: string) {
    setItems((previo) => previo.filter((item) => item.clave !== clave));
  }

  function cambiarCantidad(clave: string, texto: string) {
    setItems((previo) =>
      previo.map((item) =>
        item.clave === clave ? { ...item, cantidadTexto: texto } : item
      )
    );
  }

  function validarFormulario(): ErroresFormulario {
    const erroresLocales: ErroresFormulario = {};
    if (!clienteId) {
      erroresLocales.clienteId = "Seleccione un cliente";
    }
    if (!fecha) {
      erroresLocales.fecha = "Seleccione una fecha";
    }
    if (items.length === 0) {
      erroresLocales.items =
        "Agregue al menos un producto al presupuesto";
    } else {
      const indiceInvalido = items.findIndex((item) => {
        const cantidad = cantidadANumero(item.cantidadTexto);
        return !Number.isFinite(cantidad) || cantidad <= 0;
      });
      if (indiceInvalido >= 0) {
        erroresLocales.items = `La cantidad de "${items[indiceInvalido].descripcion}" debe ser mayor a 0`;
      }
    }
    return erroresLocales;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const erroresLocales = validarFormulario();
    setErrores(erroresLocales);
    const hayErrores = Object.values(erroresLocales).some(Boolean);
    if (hayErrores) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: Object.values(erroresLocales).find(Boolean) ?? "Revise los datos del presupuesto.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        clienteId,
        fecha,
        observaciones: observaciones.trim(),
        items: items.map((item) => ({
          productoId: item.productoId,
          descripcion: item.descripcion,
          codigoSat: item.codigoSat,
          unidad: item.unidad,
          cantidad: cantidadANumero(item.cantidadTexto),
          precioUnitario: item.precioUnitario,
          ivaTasa: item.ivaTasa,
        })),
      };

      const url = editing ? `/api/presupuestos/${editing.id}` : "/api/presupuestos";
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setErrores(data.fieldErrors as ErroresFormulario);
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar el presupuesto",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Presupuesto actualizado" : "Presupuesto registrado",
        description: `El presupuesto para "${clienteNombre}" se guardó correctamente por ${formatearMoneda(totales.total)}.`,
      });

      limpiarFormulario();
      onSaved();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description:
          "No fue posible comunicar con el servidor. Intente nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isEditing ? (
            <>
              <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
              Editar presupuesto
            </>
          ) : (
            <>
              <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
              Registrar presupuesto
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando el presupuesto de "${editing?.cliente.razonSocial}" del ${editing?.fecha.split("-").reverse().join("/")}.`
            : "Seleccione el cliente, la fecha y agregue los productos del catálogo."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          {/* ── Datos generales ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-2">
              <Label htmlFor="cliente-presupuesto">Cliente</Label>
              <Select
                value={clienteId}
                onValueChange={(valor) => {
                  setClienteId(valor);
                  setErrores((previo) => ({ ...previo, clienteId: undefined }));
                }}
              >
                <SelectTrigger id="cliente-presupuesto" className="w-full">
                  <SelectValue placeholder="Seleccione el cliente">
                    {
                      clientes.find(
                        (cliente) => cliente.id === clienteId
                      )?.razonSocial
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errores.clienteId && <MensajeError>{errores.clienteId}</MensajeError>}
              {!cargandoCatalogos && clientes.length === 0 && (
                <AvisoCatalogoVacio
                  mensaje="Aún no hay clientes registrados."
                  destino="clientes"
                  etiquetaBoton="Ir a Clientes"
                  onIrA={onIrA}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-presupuesto">Fecha</Label>
              <Input
                id="fecha-presupuesto"
                type="date"
                value={fecha}
                onChange={(event) => {
                  setFecha(event.target.value);
                  setErrores((previo) => ({ ...previo, fecha: undefined }));
                }}
                className="tabular-nums"
              />
              {errores.fecha && <MensajeError>{errores.fecha}</MensajeError>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="observaciones-presupuesto">
                Observaciones{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Textarea
                id="observaciones-presupuesto"
                placeholder="Aclaraciones u observaciones para el cliente (condiciones, vigencia, entrega)…"
                rows={2}
                maxLength={1000}
                className="resize-none"
                value={observaciones}
                onChange={(event) =>
                  setObservaciones(event.target.value.toUpperCase())
                }
              />
            </div>
          </div>

          {/* ── Productos ───────────────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-start">
              <div className="space-y-2">
                <Label htmlFor="producto-presupuesto">Producto</Label>
                <Popover
                  open={selectorAbierto}
                  onOpenChange={(abierto) => {
                    setSelectorAbierto(abierto);
                    if (abierto) {
                      // Al abrir se muestra el inicio del catálogo.
                      setBusquedaProducto("");
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="producto-presupuesto"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={selectorAbierto}
                      aria-label="Buscar y seleccionar producto"
                      className="w-full justify-between font-normal"
                    >
                      <span className="min-w-0 truncate">
                        {productoElegido
                          ? productoElegido.descripcion
                          : cargandoCatalogos
                            ? "Cargando…"
                            : "Seleccione o busque un producto"}
                      </span>
                      <ChevronsUpDown
                        className="ml-2 h-4 w-4 shrink-0 opacity-50"
                        aria-hidden="true"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Buscar por descripción…"
                        value={busquedaProducto}
                        onValueChange={setBusquedaProducto}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {buscandoProducto
                            ? "Buscando…"
                            : busquedaProducto.trim()
                              ? `Sin resultados para «${busquedaProducto.trim()}».`
                              : "Sin productos en el catálogo."}
                        </CommandEmpty>
                        <CommandGroup>
                          {resultadosProducto.map((producto) => (
                            <CommandItem
                              key={producto.id}
                              value={producto.descripcion}
                              onSelect={() => {
                                setProductoElegido(producto);
                                setErrorCantidadNueva(null);
                                setSelectorAbierto(false);
                              }}
                              className="gap-2"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {producto.descripcion}
                              </span>
                              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                {formatearMoneda(producto.subtotal)} · IVA{" "}
                                {producto.tasa}%
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {buscandoProducto && resultadosProducto.length > 0 && (
                          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                            Buscando…
                          </div>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!cargandoCatalogos &&
                  selectorAbierto &&
                  !buscandoProducto &&
                  resultadosProducto.length === 0 &&
                  !busquedaProducto.trim() && (
                    <AvisoCatalogoVacio
                      mensaje="Aún no hay productos en el catálogo."
                      destino="productos"
                      etiquetaBoton="Ir a Productos"
                      onIrA={onIrA}
                    />
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad-presupuesto">Cantidad</Label>
                <Input
                  id="cantidad-presupuesto"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={cantidadNueva}
                  onChange={(event) => {
                    setCantidadNueva(event.target.value);
                    setErrorCantidadNueva(null);
                  }}
                  className="tabular-nums"
                  aria-label="Cantidad del producto a agregar"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={agregarProducto}
                  disabled={!productoElegido}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Agregar
                </Button>
              </div>
            </div>

            {errorCantidadNueva && (
              <MensajeError>{errorCantidadNueva}</MensajeError>
            )}

            {/* Datos del producto seleccionado (fotografía que se agregará) */}
            {productoElegido && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-mono" title="Código SAT">
                  Cód. SAT: {productoElegido.codigoSat}
                </span>
                <span>Unidad: {productoElegido.unidad}</span>
                <span className="tabular-nums">
                  Precio unitario:{" "}
                  <strong className="text-foreground">
                    {formatearMoneda(productoElegido.subtotal)}
                  </strong>
                </span>
                <span>IVA: {productoElegido.tasa}%</span>
              </div>
            )}

            {errores.items && <MensajeError>{errores.items}</MensajeError>}

            {/* Partidas del presupuesto */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <ReceiptText
                  className="mb-2 h-8 w-8 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">
                  Aún no ha agregado productos
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Seleccione un producto del catálogo, indique la cantidad y
                  presione &quot;Agregar&quot; para formar el presupuesto.
                </p>
              </div>
            ) : (
              <>
                {/* Tabla (tableta / escritorio) */}
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[38%]">Producto</TableHead>
                        <TableHead className="w-[14%]">Cantidad</TableHead>
                        <TableHead className="w-[16%] whitespace-nowrap px-2 text-right">
                          P. unitario
                        </TableHead>
                        <TableHead className="w-[8%] px-2 text-right">
                          IVA
                        </TableHead>
                        <TableHead className="w-[16%] whitespace-nowrap px-2 text-right">
                          Importe
                        </TableHead>
                        <TableHead className="w-[8%] text-right">
                          <span className="sr-only">Quitar</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const cantidad = cantidadANumero(item.cantidadTexto);
                        const importe =
                          Number.isFinite(cantidad) && cantidad > 0
                            ? redondear2(cantidad * item.precioUnitario)
                            : 0;
                        return (
                          <TableRow key={item.clave}>
                            <TableCell className="align-top">
                              <span
                                className="block truncate font-medium"
                                title={item.descripcion}
                              >
                                {item.descripcion}
                              </span>
                              <p
                                className="truncate font-mono text-xs text-muted-foreground"
                                title={
                                  item.codigoSat
                                    ? `Código SAT: ${item.codigoSat}`
                                    : undefined
                                }
                              >
                                {item.codigoSat ? `Cód. SAT: ${item.codigoSat}` : ""}
                                {item.codigoSat && item.unidad ? " · " : ""}
                                {item.unidad ?? ""}
                              </p>
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                value={item.cantidadTexto}
                                onChange={(event) =>
                                  cambiarCantidad(item.clave, event.target.value)
                                }
                                className="h-8 w-20 tabular-nums"
                                aria-label={`Cantidad de ${item.descripcion}`}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm tabular-nums">
                              {formatearMoneda(item.precioUnitario)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm tabular-nums text-muted-foreground">
                              {item.ivaTasa}%
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm font-semibold tabular-nums">
                              {formatearMoneda(importe)}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => quitarPartida(item.clave)}
                                aria-label={`Quitar ${item.descripcion}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Tarjetas (móvil) */}
                <div className="space-y-3 sm:hidden">
                  {items.map((item) => {
                    const cantidad = cantidadANumero(item.cantidadTexto);
                    const importe =
                      Number.isFinite(cantidad) && cantidad > 0
                        ? redondear2(cantidad * item.precioUnitario)
                        : 0;
                    return (
                      <div
                        key={item.clave}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium"
                              title={item.descripcion}
                            >
                              {item.descripcion}
                            </p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {item.codigoSat ? `Cód. SAT: ${item.codigoSat}` : ""}
                              {item.codigoSat && item.unidad ? " · " : ""}
                              {item.unidad ?? ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => quitarPartida(item.clave)}
                            aria-label={`Quitar ${item.descripcion}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`cantidad-${item.clave}`}
                              className="text-xs text-muted-foreground"
                            >
                              Cantidad
                            </Label>
                            <Input
                              id={`cantidad-${item.clave}`}
                              type="number"
                              min="0"
                              step="any"
                              inputMode="decimal"
                              value={item.cantidadTexto}
                              onChange={(event) =>
                                cambiarCantidad(item.clave, event.target.value)
                              }
                              className="h-8 w-20 tabular-nums"
                              aria-label={`Cantidad de ${item.descripcion}`}
                            />
                          </div>
                          <p className="text-right text-sm tabular-nums">
                            <span className="text-xs text-muted-foreground">
                              {formatearMoneda(item.precioUnitario)} c/u · IVA{" "}
                              {item.ivaTasa}%
                            </span>
                            <span className="block font-semibold">
                              {formatearMoneda(importe)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Totales: SUB TOTAL + IVA + TOTAL ──────────────── */}
                <div
                  className="ml-auto w-full max-w-xs space-y-1.5 rounded-lg border bg-muted/40 p-4"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SUB TOTAL</span>
                    <span className="font-medium tabular-nums">
                      {formatearMoneda(totales.subtotal)}
                    </span>
                  </div>
                  {totales.ivaPorTasa.length > 1 ? (
                    totales.ivaPorTasa.map((linea) => (
                      <div
                        key={linea.tasa}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          IVA {linea.tasa}%
                        </span>
                        <span className="tabular-nums">
                          {formatearMoneda(linea.importe)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        IVA
                        {totales.ivaPorTasa.length === 1
                          ? ` (${totales.ivaPorTasa[0].tasa}%)`
                          : ""}
                      </span>
                      <span className="tabular-nums">
                        {formatearMoneda(totales.iva)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-semibold">TOTAL</span>
                    <span className="text-xl font-bold tabular-nums text-primary">
                      {formatearMoneda(totales.total)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Acciones ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={submitting} className="sm:flex-1">
              {submitting ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  {isEditing ? "Guardar cambios" : "Guardar presupuesto"}
                </>
              )}
            </Button>
            {isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancelar edición
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
