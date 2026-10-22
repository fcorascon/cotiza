"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  Loader2,
  Pencil,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  formatearFechaISO,
} from "@/lib/presupuestos-utils";
import { formatearMoneda } from "@/lib/productos-utils";
import { PresupuestoDocumento } from "@/components/presupuestos/presupuesto-documento";
import type { Configuracion, Presupuesto } from "@/lib/types";

type PresupuestosTableProps = {
  presupuestos: Presupuesto[];
  loading: boolean;
  editing: Presupuesto | null;
  configuracion: Configuracion | null;
  onEdit: (presupuesto: Presupuesto) => void;
  onChanged: () => void;
};

export function PresupuestosTable({
  presupuestos,
  loading,
  editing,
  configuracion,
  onEdit,
  onChanged,
}: PresupuestosTableProps) {
  const { toast } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [porEliminar, setPorEliminar] = useState<Presupuesto | null>(null);
  const [enVista, setEnVista] = useState<Presupuesto | null>(null);
  const [paraImprimir, setParaImprimir] = useState<Presupuesto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /*
   * Mientras la vista previa de impresión está abierta: bloquea el
   * scroll de fondo, marca el body para el CSS de impresión, ajusta
   * el título del documento (nombre del PDF sugerido) y cierra con Esc.
   */
  useEffect(() => {
    if (!paraImprimir) return;
    const tituloAnterior = document.title;
    const folio = `PTO-${paraImprimir.id.slice(-6).toUpperCase()}`;
    document.body.classList.add("imprimiendo");
    document.body.style.overflow = "hidden";
    document.title = `Presupuesto ${folio} - ${paraImprimir.cliente.razonSocial}`;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setParaImprimir(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("imprimiendo");
      document.body.style.overflow = "";
      document.title = tituloAnterior;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [paraImprimir]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return presupuestos;
    return presupuestos.filter((p) => {
      const campos = [
        p.cliente.razonSocial,
        p.fecha,
        formatearFechaISO(p.fecha),
        p.observaciones ?? "",
        ...p.items.map((item) => item.descripcion),
      ];
      return campos.some((campo) => campo.toLowerCase().includes(q));
    });
  }, [presupuestos, busqueda]);

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch(`/api/presupuestos/${porEliminar.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "No se pudo eliminar",
          description: data?.error ?? "Intente nuevamente.",
        });
        return;
      }
      toast({
        title: "Presupuesto eliminado",
        description: `El presupuesto de "${porEliminar.cliente.razonSocial}" fue eliminado.`,
      });
      setPorEliminar(null);
      onChanged();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description:
          "No fue posible eliminar el presupuesto. Intente de nuevo.",
      });
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Presupuestos registrados</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando información…"
                : `${presupuestos.length} ${
                    presupuestos.length === 1 ? "presupuesto" : "presupuestos"
                  } en total · ${filtrados.length} mostrados`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onChanged}
            disabled={loading}
            aria-label="Actualizar lista de presupuestos"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              aria-hidden="true"
            />
          </Button>
        </div>

        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por cliente, fecha, producto…"
            className="pl-9"
            aria-label="Buscar presupuestos"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Cargando presupuestos"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : presupuestos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <ReceiptText
              className="mb-3 h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Aún no hay presupuestos registrados</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Use el formulario &quot;Registrar presupuesto&quot; para crear el
              primero: elija el cliente, agregue productos y guarde.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <Search
              className="mb-3 h-8 w-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Sin resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ningún presupuesto coincide con &quot;{busqueda}&quot;.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            {/* Tarjetas (móvil) */}
            <div className="space-y-3 sm:hidden">
              {filtrados.map((presupuesto) => {
                const esSeleccionado = editing?.id === presupuesto.id;
                return (
                  <div
                    key={presupuesto.id}
                    className={`rounded-lg border p-3 ${
                      esSeleccionado ? "bg-accent/60" : undefined
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatearFechaISO(presupuesto.fecha)}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatearMoneda(presupuesto.total)}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 truncate font-medium"
                      title={presupuesto.cliente.razonSocial}
                    >
                      {presupuesto.cliente.razonSocial}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {presupuesto.items.length}{" "}
                      {presupuesto.items.length === 1
                        ? "producto"
                        : "productos"}{" "}
                      {presupuesto.items.length > 0 &&
                        `· ${formatearMoneda(presupuesto.subtotal)}`}
                    </p>
                    <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEnVista(presupuesto)}
                            aria-label={`Ver presupuesto de ${presupuesto.cliente.razonSocial}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalle</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setParaImprimir(presupuesto)}
                            aria-label={`Imprimir presupuesto de ${presupuesto.cliente.razonSocial}`}
                          >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Imprimir / PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(presupuesto)}
                            aria-label={`Editar presupuesto de ${presupuesto.cliente.razonSocial}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setPorEliminar(presupuesto)}
                            aria-label={`Eliminar presupuesto de ${presupuesto.cliente.razonSocial}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla (tableta / escritorio) */}
            <ScrollArea className="hidden max-h-[560px] pr-3 sm:block">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[11%] whitespace-nowrap">
                      Fecha
                    </TableHead>
                    <TableHead className="w-[27%]">Cliente</TableHead>
                    <TableHead className="hidden w-[15%] lg:table-cell">
                      Productos
                    </TableHead>
                    <TableHead className="hidden w-[13%] whitespace-nowrap px-2 text-right sm:table-cell">
                      Sub total
                    </TableHead>
                    <TableHead className="hidden w-[11%] whitespace-nowrap px-2 text-right sm:table-cell">
                      IVA
                    </TableHead>
                    <TableHead className="w-[12%] whitespace-nowrap px-2 text-right">
                      Total
                    </TableHead>
                    <TableHead className="w-[148px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((presupuesto) => {
                    const esSeleccionado = editing?.id === presupuesto.id;
                    const primerProducto =
                      presupuesto.items[0]?.descripcion ?? "";
                    const restantes = presupuesto.items.length - 1;
                    return (
                      <TableRow
                        key={presupuesto.id}
                        className={esSeleccionado ? "bg-accent/60" : undefined}
                      >
                        <TableCell className="whitespace-nowrap align-top text-sm tabular-nums">
                          {formatearFechaISO(presupuesto.fecha)}
                        </TableCell>

                        <TableCell className="align-top">
                          <span
                            className="block truncate font-medium"
                            title={presupuesto.cliente.razonSocial}
                          >
                            {presupuesto.cliente.razonSocial}
                          </span>
                          <p className="text-xs text-muted-foreground lg:hidden">
                            {presupuesto.items.length}{" "}
                            {presupuesto.items.length === 1
                              ? "producto"
                              : "productos"}
                          </p>
                        </TableCell>

                        <TableCell className="hidden align-top lg:table-cell">
                          <span
                            className="block truncate text-sm"
                            title={primerProducto}
                          >
                            {primerProducto}
                          </span>
                          {restantes > 0 && (
                            <p className="truncate text-xs text-muted-foreground">
                              + {restantes}{" "}
                              {restantes === 1 ? "producto más" : "productos más"}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="hidden whitespace-nowrap px-2 align-top text-right text-sm tabular-nums sm:table-cell">
                          {formatearMoneda(presupuesto.subtotal)}
                        </TableCell>

                        <TableCell className="hidden whitespace-nowrap px-2 align-top text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                          {formatearMoneda(presupuesto.iva)}
                        </TableCell>

                        <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm font-semibold tabular-nums">
                          {formatearMoneda(presupuesto.total)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEnVista(presupuesto)}
                                  aria-label={`Ver presupuesto de ${presupuesto.cliente.razonSocial}`}
                                >
                                  <Eye
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setParaImprimir(presupuesto)}
                                  aria-label={`Imprimir presupuesto de ${presupuesto.cliente.razonSocial}`}
                                >
                                  <Printer
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Imprimir / PDF</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onEdit(presupuesto)}
                                  aria-label={`Editar presupuesto de ${presupuesto.cliente.razonSocial}`}
                                >
                                  <Pencil
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setPorEliminar(presupuesto)}
                                  aria-label={`Eliminar presupuesto de ${presupuesto.cliente.razonSocial}`}
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TooltipProvider>
        )}
      </CardContent>

      {/* Detalle del presupuesto */}
      <Dialog
        open={enVista !== null}
        onOpenChange={(open) => !open && setEnVista(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {enVista && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ReceiptText
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  Presupuesto · {formatearFechaISO(enVista.fecha)}
                </DialogTitle>
                <DialogDescription>
                  Cliente: {enVista.cliente.razonSocial}
                </DialogDescription>
              </DialogHeader>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setEnVista(null);
                  setParaImprimir(enVista);
                }}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimir / Guardar PDF
              </Button>

              {enVista.observaciones && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Observaciones:{" "}
                  </span>
                  {enVista.observaciones}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Productos</p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[52%]">Producto</TableHead>
                        <TableHead className="px-2 text-right">
                          Cantidad
                        </TableHead>
                        <TableHead className="px-2 text-right">
                          P. unitario
                        </TableHead>
                        <TableHead className="px-2 text-right">
                          Importe
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enVista.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="align-top">
                            <span
                              className="block truncate font-medium"
                              title={item.descripcion}
                            >
                              {item.descripcion}
                            </span>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.unidad ?? "—"} · IVA {item.ivaTasa}%
                              {item.codigoSat ? ` · Cód. ${item.codigoSat}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 align-top text-right text-sm tabular-nums">
                            {item.cantidad}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm tabular-nums">
                            {formatearMoneda(item.precioUnitario)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 align-top text-right text-sm font-medium tabular-nums">
                            {formatearMoneda(item.importe)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              <div className="ml-auto w-full max-w-xs space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SUB TOTAL</span>
                  <span className="font-medium tabular-nums">
                    {formatearMoneda(enVista.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span className="tabular-nums">
                    {formatearMoneda(enVista.iva)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">TOTAL</span>
                  <span className="text-lg font-bold tabular-nums text-primary">
                    {formatearMoneda(enVista.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={porEliminar !== null}
        onOpenChange={(open) => !open && setPorEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el presupuesto de &quot;
              {porEliminar?.cliente.razonSocial}&quot; del{" "}
              {porEliminar ? formatearFechaISO(porEliminar.fecha) : ""} por{" "}
              <strong>
                {porEliminar ? formatearMoneda(porEliminar.total) : ""}
              </strong>
              , junto con sus {porEliminar?.items.length ?? 0}{" "}
              {(porEliminar?.items.length ?? 0) === 1 ? "partida" : "partidas"}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmarEliminar();
              }}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Eliminando…
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa de impresión del documento formal */}
      {paraImprimir &&
        createPortal(
          <div className="capa-impresion fixed inset-0 z-[70] overflow-y-auto bg-neutral-200/90 p-4 sm:p-8">
            <div className="barra-impresion sticky top-0 z-10 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg border bg-card p-2 shadow-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParaImprimir(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cerrar
              </Button>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                Vista previa · Presupuesto de &quot;
                {paraImprimir.cliente.razonSocial}&quot;
              </p>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimir / Guardar PDF
              </Button>
            </div>
            <div className="hoja-documento mx-auto mt-4 w-full max-w-3xl border bg-white shadow-xl">
              <PresupuestoDocumento
                presupuesto={paraImprimir}
                configuracion={configuracion}
              />
            </div>
          </div>,
          document.body
        )}
    </Card>
  );
}
