"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  Mail,
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
import { Badge } from "@/components/ui/badge";
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
import type { Cliente } from "@/lib/types";

type ClientesTableProps = {
  clientes: Cliente[];
  loading: boolean;
  editing: Cliente | null;
  onEdit: (cliente: Cliente) => void;
  onChanged: () => void;
};

function formatearDireccion(c: Cliente) {
  const partes = [
    `${c.calle} ${c.numero}`.trim(),
    c.colonia,
    c.codigoPostal ? `C.P. ${c.codigoPostal}` : "",
    c.ciudad,
    c.estado,
  ].filter(Boolean);
  return partes.join(", ");
}

export function ClientesTable({
  clientes,
  loading,
  editing,
  onEdit,
  onChanged,
}: ClientesTableProps) {
  const { toast } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [porEliminar, setPorEliminar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.razonSocial, c.rfc, c.ciudad, c.estado, c.colonia, c.email]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [clientes, busqueda]);

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch(`/api/clientes/${porEliminar.id}`, {
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
        title: "Cliente eliminado",
        description: `"${porEliminar.razonSocial}" fue eliminado de la lista.`,
      });
      setPorEliminar(null);
      onChanged();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No fue posible eliminar el cliente. Intente de nuevo.",
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
            <CardTitle className="text-lg">Clientes registrados</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando información…"
                : `${clientes.length} ${
                    clientes.length === 1 ? "cliente" : "clientes"
                  } en total · ${filtrados.length} mostrados`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onChanged}
            disabled={loading}
            aria-label="Actualizar lista de clientes"
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
            placeholder="Buscar por nombre, RFC, ciudad o correo…"
            className="pl-9"
            aria-label="Buscar clientes"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando clientes">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <UsersRound
              className="mb-3 h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Aún no hay clientes registrados</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Use el formulario &quot;Registrar cliente&quot; para capturar al
              primero. Los datos aparecerán aquí.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="font-medium">Sin resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ningún cliente coincide con &quot;{busqueda}&quot;.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <ScrollArea className="max-h-[560px] pr-3">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[32%]">Cliente</TableHead>
                    <TableHead className="hidden w-[34%] md:table-cell">
                      Dirección
                    </TableHead>
                    <TableHead className="hidden w-[24%] lg:table-cell">
                      Contacto
                    </TableHead>
                    <TableHead className="w-[90px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((cliente) => {
                    const esSeleccionado = editing?.id === cliente.id;
                    return (
                      <TableRow
                        key={cliente.id}
                        className={
                          esSeleccionado ? "bg-accent/60" : undefined
                        }
                      >
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2">
                            <Building2
                              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p
                                className="truncate font-medium"
                                title={cliente.razonSocial}
                              >
                                {cliente.razonSocial}
                              </p>
                              <Badge
                                variant="secondary"
                                className="mt-1 max-w-full truncate font-mono text-[11px]"
                              >
                                {cliente.rfc}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-top md:table-cell">
                          <div className="flex items-start gap-2">
                            <MapPin
                              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span
                              className="line-clamp-2 text-sm text-muted-foreground"
                              title={formatearDireccion(cliente)}
                            >
                              {formatearDireccion(cliente)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-top lg:table-cell">
                          <p
                            className="flex items-center gap-1.5 truncate text-sm"
                            title={cliente.telefono}
                          >
                            <Phone
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{cliente.telefono}</span>
                          </p>
                          <p
                            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"
                            title={cliente.email}
                          >
                            <Mail
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{cliente.email}</span>
                          </p>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(cliente)}
                                  aria-label={`Editar a ${cliente.razonSocial}`}
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
                                  onClick={() => setPorEliminar(cliente)}
                                  aria-label={`Eliminar a ${cliente.razonSocial}`}
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
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los datos de &quot;
              {porEliminar?.razonSocial}&quot; (RFC {porEliminar?.rfc}). Esta
              acción no se puede deshacer.
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
