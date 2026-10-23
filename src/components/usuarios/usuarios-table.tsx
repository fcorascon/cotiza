"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCog,
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
import { ETIQUETA_ROL } from "@/components/usuarios/usuario-form";
import type { SesionActiva, Usuario } from "@/lib/types";

type UsuariosTableProps = {
  usuarios: Usuario[];
  loading: boolean;
  /** Mensaje de error de la última carga; si existe se muestra con opción de reintentar. */
  error?: string | null;
  onReintentar?: () => void;
  editing: Usuario | null;
  usuarioActual: SesionActiva;
  onEdit: (usuario: Usuario) => void;
  onChanged: () => void;
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsuariosTable({
  usuarios,
  loading,
  error,
  onReintentar,
  editing,
  usuarioActual,
  onEdit,
  onChanged,
}: UsuariosTableProps) {
  const { toast } = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [porEliminar, setPorEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.usuario.toLowerCase().includes(q) ||
        u.nombre.toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const respuesta = await fetch(`/api/usuarios/${porEliminar.id}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "No se pudo eliminar",
          description: datos?.error ?? "Intente nuevamente.",
        });
        return;
      }
      toast({
        title: "Usuario eliminado",
        description: `La cuenta "${porEliminar.usuario}" fue eliminada de la aplicación.`,
      });
      setPorEliminar(null);
      onChanged();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No fue posible eliminar el usuario. Intente de nuevo.",
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
            <CardTitle className="text-lg">Usuarios de la aplicación</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando información…"
                : error
                  ? "No se pudo cargar la lista."
                  : `${usuarios.length} ${
                      usuarios.length === 1 ? "usuario" : "usuarios"
                    } en total · ${filtrados.length} mostrados`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onReintentar ?? onChanged}
            disabled={loading}
            aria-label="Actualizar lista de usuarios"
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
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por usuario o nombre…"
            className="pl-9"
            aria-label="Buscar usuarios"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Cargando usuarios"
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
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-destructive/40 bg-destructive/5 py-14 text-center"
            role="alert"
          >
            <AlertTriangle
              className="mb-3 h-10 w-10 text-destructive/70"
              aria-hidden="true"
            />
            <p className="font-medium">No fue posible obtener la lista de usuarios</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {error} Verifique su conexión e intente nuevamente.
            </p>
            {onReintentar && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onReintentar}
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            )}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
            <UserCog
              className="mb-3 h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="font-medium">Aún no hay usuarios registrados</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Use el formulario &quot;Registrar usuario&quot; para crear la
              primera cuenta de acceso.
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
              Ningún usuario coincide con &quot;{busqueda}&quot;.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <ScrollArea className="max-h-[560px] pr-3 [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[24%]">Usuario</TableHead>
                    <TableHead className="w-[28%]">Nombre</TableHead>
                    <TableHead className="w-[16%]">Rol</TableHead>
                    <TableHead className="w-[14%]">Estado</TableHead>
                    <TableHead className="hidden w-[14%] sm:table-cell">
                      Creado
                    </TableHead>
                    <TableHead className="w-[96px] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((u) => {
                    const esSeleccionado = editing?.id === u.id;
                    const esActual = usuarioActual.id === u.id;
                    return (
                      <TableRow
                        key={u.id}
                        className={esSeleccionado ? "bg-accent/60" : undefined}
                      >
                        <TableCell className="align-top">
                          <span
                            className="block truncate font-medium"
                            title={u.usuario}
                          >
                            {u.usuario}
                          </span>
                          {esActual && (
                            <span className="text-xs text-muted-foreground">
                              (usted)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top">
                          <span className="block truncate" title={u.nombre}>
                            {u.nombre}
                          </span>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant={u.rol === "ADMIN" ? "default" : "secondary"}
                            className="max-w-full"
                          >
                            <span className="truncate">
                              {ETIQUETA_ROL[u.rol] ?? u.rol}
                            </span>
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant={u.activo ? "outline" : "secondary"}
                            className={
                              u.activo
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "text-muted-foreground"
                            }
                          >
                            {u.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>

                        <TableCell className="hidden align-top text-sm text-muted-foreground sm:table-cell">
                          {formatearFecha(u.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(u)}
                                  aria-label={`Editar usuario ${u.usuario}`}
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
                                  onClick={() => setPorEliminar(u)}
                                  disabled={esActual}
                                  aria-label={`Eliminar usuario ${u.usuario}`}
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TooltipTrigger>
                              {esActual ? (
                                <TooltipContent>
                                  No puede eliminar su propia cuenta
                                </TooltipContent>
                              ) : (
                                <TooltipContent>Eliminar</TooltipContent>
                              )}
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
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta &quot;{porEliminar?.usuario}&quot; (
              {porEliminar?.nombre}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(evento) => {
                evento.preventDefault();
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
