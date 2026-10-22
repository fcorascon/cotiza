"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatearMoneda } from "@/lib/productos-utils";
import type { ProductoConRelaciones } from "@/lib/types";

type ProductosTableProps = {
  productos: ProductoConRelaciones[];
  loading: boolean;
  editing: ProductoConRelaciones | null;
  onEdit: (producto: ProductoConRelaciones) => void;
  onChanged: () => void;
};

export function ProductosTable({
  productos,
  loading,
  editing,
  onEdit,
  onChanged,
}: ProductosTableProps) {
  const { toast } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [porEliminar, setPorEliminar] = useState<ProductoConRelaciones | null>(
    null
  );
  const [eliminando, setEliminando] = useState(false);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => {
      const campos = [
        p.descripcion,
        p.codigoSat,
        p.categoria.categoria,
        p.unidad.unidad,
        p.notas ?? "",
      ];
      return campos.some((campo) => campo.toLowerCase().includes(q));
    });
  }, [productos, busqueda]);

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch(`/api/productos/${porEliminar.id}`, {
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
        title: "Producto eliminado",
        description: `"${porEliminar.descripcion}" fue eliminado del catálogo.`,
      });
      setPorEliminar(null);
      onChanged();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No fue posible eliminar el producto. Intente de nuevo.",
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
            <CardTitle className="text-lg">Catálogo de productos</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando información…"
                : `${productos.length} ${
                    productos.length === 1 ? "producto" : "productos"
                  } en total · ${filtradas.length} mostrados`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onChanged}
            disabled={loading}
            aria-label="Actualizar lista de productos"
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
            placeholder="Buscar por descripción, código, categoría…"
            className="pl-9"
            aria-label="Buscar productos"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Cargando productos"
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <Package
              className="mb-3 h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Aún no hay productos registrados</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Use el formulario &quot;Registrar producto&quot; para crear el
              primero (ej. Papel bond carta, Servicio de limpieza, Toner HP).
            </p>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <Search
              className="mb-3 h-8 w-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Sin resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ningún producto coincide con &quot;{busqueda}&quot;.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            {/* overflow-x-visible en el contenedor de la tabla: evita que sea un
                scroll context y permite que el thead sticky se ancle al viewport
                del ScrollArea (la tabla es table-fixed y nunca desborda en X). */}
            <ScrollArea className="max-h-[560px] pr-3 [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[48%] sm:w-[22%]">
                      Descripción
                    </TableHead>
                    <TableHead className="hidden w-[14%] sm:table-cell">
                      Categoría
                    </TableHead>
                    <TableHead className="hidden w-[9%] lg:table-cell">
                      Unidad
                    </TableHead>
                    <TableHead className="hidden w-[6%] px-2 sm:table-cell">
                      IVA
                    </TableHead>
                    <TableHead className="hidden w-[13%] whitespace-nowrap px-2 text-right sm:table-cell">
                      Costo
                    </TableHead>
                    <TableHead className="hidden w-[10%] whitespace-nowrap px-2 text-right md:table-cell">
                      Margen
                    </TableHead>
                    <TableHead className="w-[42%] whitespace-nowrap px-2 text-right sm:w-[14%]">
                      Subtotal
                    </TableHead>
                    <TableHead className="w-[90px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((producto) => {
                    const esSeleccionado = editing?.id === producto.id;
                    return (
                      <TableRow
                        key={producto.id}
                        className={esSeleccionado ? "bg-accent/60" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="flex items-start gap-1.5">
                            <span
                              className="truncate font-medium"
                              title={producto.descripcion}
                            >
                              {producto.descripcion}
                            </span>
                            {producto.notas && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <StickyNote
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                    aria-label="Este producto tiene notas"
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64">
                                  <span className="whitespace-pre-wrap">
                                    {producto.notas}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p
                            className="truncate font-mono text-xs text-muted-foreground"
                            title={`Código SAT: ${producto.codigoSat}`}
                          >
                            {producto.codigoSat}
                          </p>
                          <p className="truncate text-xs tabular-nums text-muted-foreground sm:hidden">
                            Costo: {formatearMoneda(producto.costo)}
                          </p>
                        </TableCell>

                        <TableCell className="hidden align-top sm:table-cell">
                          <span
                            className="block truncate text-sm"
                            title={producto.categoria.categoria}
                          >
                            {producto.categoria.categoria}
                          </span>
                        </TableCell>

                        <TableCell className="hidden align-top text-sm text-muted-foreground lg:table-cell">
                          <span className="block truncate" title={producto.unidad.unidad}>
                            {producto.unidad.unidad}
                          </span>
                        </TableCell>

                        <TableCell className="hidden whitespace-nowrap px-2 align-top text-sm tabular-nums sm:table-cell">
                          {producto.iva.tasa}%
                        </TableCell>

                        <TableCell className="hidden whitespace-nowrap px-2 align-top text-right text-sm tabular-nums sm:table-cell">
                          {formatearMoneda(producto.costo)}
                        </TableCell>

                        <TableCell className="hidden whitespace-nowrap px-2 align-top text-right text-sm tabular-nums md:table-cell">
                          {producto.margen}%
                        </TableCell>

                        <TableCell className="whitespace-nowrap px-2 align-top text-right text-xs font-semibold tabular-nums sm:text-sm">
                          {formatearMoneda(producto.subtotal)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(producto)}
                                  aria-label={`Editar producto ${producto.descripcion}`}
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
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setPorEliminar(producto)}
                                  aria-label={`Eliminar producto ${producto.descripcion}`}
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

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={porEliminar !== null}
        onOpenChange={(open) => !open && setPorEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{porEliminar?.descripcion}&quot; del catálogo
              de productos. Esta acción no se puede deshacer.
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
    </Card>
  );
}
