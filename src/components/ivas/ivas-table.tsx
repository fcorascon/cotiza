"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Percent,
  RefreshCw,
  Search,
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
import type { Iva } from "@/lib/types";

type IvasTableProps = {
  ivas: Iva[];
  loading: boolean;
  editing: Iva | null;
  onEdit: (iva: Iva) => void;
  onChanged: () => void;
};

function formatearTasa(tasa: number) {
  return `${tasa}%`;
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function IvasTable({
  ivas,
  loading,
  editing,
  onEdit,
  onChanged,
}: IvasTableProps) {
  const { toast } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [porEliminar, setPorEliminar] = useState<Iva | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const filtradas = useMemo(() => {
    // Se ignora el símbolo "%" para que "16%" encuentre la tasa 16.
    const q = busqueda.trim().toLowerCase().replace(/%/g, "");
    if (!q) return ivas;
    return ivas.filter((i) => String(i.tasa).includes(q));
  }, [ivas, busqueda]);

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch(`/api/ivas/${porEliminar.id}`, {
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
        title: "Tasa de IVA eliminada",
        description: `La tasa ${formatearTasa(porEliminar.tasa)} fue eliminada del catálogo.`,
      });
      setPorEliminar(null);
      onChanged();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description:
          "No fue posible eliminar la tasa de IVA. Intente de nuevo.",
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
            <CardTitle className="text-lg">Catálogo de tasas de IVA</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando información…"
                : `${ivas.length} ${
                    ivas.length === 1 ? "tasa" : "tasas"
                  } en total · ${filtradas.length} mostradas`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onChanged}
            disabled={loading}
            aria-label="Actualizar lista de tasas de IVA"
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
            placeholder="Buscar tasa de IVA…"
            className="pl-9"
            aria-label="Buscar tasas de IVA"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Cargando tasas de IVA"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : ivas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <Percent
              className="mb-3 h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Aún no hay tasas de IVA registradas</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Use el formulario &quot;Registrar tasa de IVA&quot; para crear la
              primera (ej. 0%, 8% o 16%).
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
              Ninguna tasa coincide con &quot;{busqueda}&quot;.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <ScrollArea className="max-h-[560px] pr-3 [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[55%]">Tasa de IVA</TableHead>
                    <TableHead className="hidden w-[25%] sm:table-cell">
                      Registrada
                    </TableHead>
                    <TableHead className="w-[110px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((iva) => {
                    const esSeleccionada = editing?.id === iva.id;
                    return (
                      <TableRow
                        key={iva.id}
                        className={esSeleccionada ? "bg-accent/60" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2">
                            <Percent
                              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span
                              className="truncate font-medium tabular-nums"
                              title={formatearTasa(iva.tasa)}
                            >
                              {formatearTasa(iva.tasa)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-top text-sm text-muted-foreground sm:table-cell">
                          {formatearFecha(iva.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(iva)}
                                  aria-label={`Editar tasa de IVA ${formatearTasa(iva.tasa)}`}
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
                                  onClick={() => setPorEliminar(iva)}
                                  aria-label={`Eliminar tasa de IVA ${formatearTasa(iva.tasa)}`}
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
            <AlertDialogTitle>¿Eliminar tasa de IVA?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la tasa &quot;{formatearTasa(porEliminar?.tasa ?? 0)}
              &quot; del catálogo. Esta acción no se puede deshacer.
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
