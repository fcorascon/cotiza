"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Upload,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { cabeceraSesion } from "@/lib/sesion-cliente";
import { formatearMoneda } from "@/lib/productos-utils";

type ColumnaDetectada = {
  campo: string;
  etiqueta: string;
  encabezado: string | null;
};

type Ejemplo = {
  fila: number;
  descripcion: string;
  codigoSat: string;
  unidad: string;
  categoria: string;
  iva: number;
  costo: number;
  margen: number;
  subtotal: number;
};

type VistaPrevia = {
  ok: true;
  idHoja: string;
  gid: string;
  encabezados: string[];
  columnas: ColumnaDetectada[];
  totalFilas: number;
  validas: number;
  coincidencias: number;
  nuevos: number;
  repetidas: number;
  errores: number;
  erroresMuestra: { fila: number; mensaje: string }[];
  advertencias: string[];
  ejemplos: Ejemplo[];
};

type ResumenImportacion = {
  totalFilas: number;
  validas: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  omitidos: number;
  costosConservados?: number;
  errores: number;
  advertencias: string[];
  catalogos: {
    unidades: string[];
    categorias: string[];
    ivas: number[];
  };
};

type RespuestaImportacion = {
  ok: true;
  resumen: ResumenImportacion;
  erroresMuestra: { fila: number; mensaje: string }[];
};

type RespuestaConfig = {
  url: string;
  gid: string;
  ultimaImportacion: string | null;
  ultimoResumen: ResumenImportacion | null;
};

/**
 * Tarjeta "Google Sheets": importa el catálogo de productos desde una hoja
 * de cálculo pública (solo lectura). Detecta las columnas por encabezado,
 * muestra una vista previa y confirma antes de modificar el catálogo.
 */
export function GoogleSheetsCard() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [gid, setGid] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const [resultado, setResultado] = useState<RespuestaImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaImportacion, setUltimaImportacion] = useState<string | null>(
    null
  );
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/google-sheets", {
        cache: "no-store",
        headers: cabeceraSesion(),
      });
      if (!respuesta.ok) throw new Error("respuesta no válida");
      const datos = (await respuesta.json()) as RespuestaConfig;
      setUrl(datos.url ?? "");
      setGid(datos.gid ?? "");
      setUltimaImportacion(datos.ultimaImportacion ?? null);
    } catch {
      // Silencioso: la tarjeta queda vacía y el usuario puede configurarla.
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  function limpiarMensajes() {
    setError(null);
    setResultado(null);
  }

  async function guardarEnlace(): Promise<boolean> {
    setGuardando(true);
    limpiarMensajes();
    try {
      const respuesta = await fetch("/api/google-sheets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...cabeceraSesion(),
        },
        body: JSON.stringify({ url, gid }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError(datos?.error ?? "No fue posible guardar el enlace.");
        return false;
      }
      setUrl(datos.url ?? url);
      setGid(datos.gid ?? gid);
      toast({
        title: "Enlace guardado",
        description: "La configuración de Google Sheets se guardó.",
      });
      return true;
    } catch {
      setError("No fue posible comunicar con el servidor.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function probarConexion() {
    setProbando(true);
    limpiarMensajes();
    setPrevia(null);
    try {
      const respuesta = await fetch("/api/google-sheets/probar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...cabeceraSesion(),
        },
        body: JSON.stringify({ url, gid }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError(datos?.error ?? "No fue posible leer la hoja.");
        return;
      }
      setPrevia(datos as VistaPrevia);
      toast({
        title: "Conexión correcta",
        description: `Se detectaron ${datos.validas} fila(s) válidas de ${datos.totalFilas}.`,
      });
    } catch {
      setError("No fue posible comunicar con el servidor.");
    } finally {
      setProbando(false);
    }
  }

  async function importarCatalogo() {
    setImportando(true);
    limpiarMensajes();
    try {
      const respuesta = await fetch("/api/google-sheets/importar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...cabeceraSesion(),
        },
        body: JSON.stringify({ url, gid }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError(datos?.error ?? "No fue posible importar el catálogo.");
        return;
      }
      const respuestaImportacion = datos as RespuestaImportacion;
      setResultado(respuestaImportacion);
      setUltimaImportacion(new Date().toISOString());
      setConfirmarAbierto(false);
      const resumen = respuestaImportacion.resumen;
      toast({
        title: "Catálogo importado",
        description: `${resumen.creados} nuevo(s), ${resumen.actualizados} actualizado(s), ${resumen.sinCambios} sin cambios.`,
      });
    } catch {
      setError("No fue posible comunicar con el servidor.");
    } finally {
      setImportando(false);
    }
  }

  const columnasRequeridas = previa?.columnas.filter(
    (columna) => columna.campo === "descripcion"
  );
  const descripcionDetectada = (columnasRequeridas?.[0]?.encabezado ?? null) !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
          Google Sheets
          <Badge variant="secondary" className="ml-1 text-xs">
            Catálogo
          </Badge>
        </CardTitle>
        <CardDescription>
          Importa productos, precios y categorías desde una hoja de cálculo.
          Requiere que la hoja esté compartida como{" "}
          <strong>&quot;Cualquier persona con el enlace: Lector&quot;</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            En Google Sheets: <strong>Compartir</strong> →{" "}
            <strong>Acceso general</strong> → <strong>Cualquier persona con el
            enlace</strong> → <strong>Lector</strong>. La aplicación solo lee la
            hoja; nunca escribe en ella.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sheets-url">Enlace de la hoja</Label>
            <Input
              id="sheets-url"
              placeholder="https://docs.google.com/spreadsheets/d/…/edit"
              value={url}
              onChange={(evento) => setUrl(evento.target.value)}
              disabled={cargando || guardando || probando || importando}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sheets-gid">Pestaña (gid o nombre)</Label>
            <Input
              id="sheets-gid"
              placeholder="productos (o gid, ej. 758009688)"
              value={gid}
              onChange={(evento) => setGid(evento.target.value)}
              disabled={cargando || guardando || probando || importando}
            />
            <p className="text-xs text-muted-foreground">
              Puedes escribir el nombre de la pestaña (por ejemplo{" "}
              <code>productos</code>) o su gid numérico. Si se deja vacío, se
              usa la pestaña indicada en el enlace.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={guardarEnlace}
            disabled={cargando || guardando || probando || importando || !url.trim()}
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Guardar enlace
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={probarConexion}
            disabled={cargando || probando || importando || !url.trim()}
          >
            {probando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Probar conexión
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setConfirmarAbierto(true)}
            disabled={
              cargando ||
              guardando ||
              probando ||
              importando ||
              !url.trim() ||
              !previa ||
              !descripcionDetectada ||
              previa.validas === 0
            }
          >
            {importando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Importar catálogo
          </Button>
        </div>

        {ultimaImportacion ? (
          <p className="text-xs text-muted-foreground">
            Última importación:{" "}
            {new Date(ultimaImportacion).toLocaleString("es-MX")}
          </p>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {previa ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                {previa.totalFilas} fila(s) en la pestaña
              </Badge>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                {previa.validas} válida(s)
              </Badge>
              <Badge className="bg-sky-600 text-white hover:bg-sky-600">
                {previa.nuevos} nuevo(s)
              </Badge>
              <Badge variant="outline">
                {previa.coincidencias} ya existente(s)
              </Badge>
              {previa.repetidas > 0 ? (
                <Badge variant="outline">
                  {previa.repetidas} repetida(s)
                </Badge>
              ) : null}
              {previa.errores > 0 ? (
                <Badge variant="destructive">{previa.errores} con error</Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {previa.columnas.map((columna) => (
                <span
                  key={columna.campo}
                  className={
                    columna.encabezado
                      ? "inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                      : "inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {columna.encabezado ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                  )}
                  {columna.etiqueta}
                  {columna.encabezado ? (
                    <span className="opacity-70">({columna.encabezado})</span>
                  ) : null}
                </span>
              ))}
            </div>

            {previa.advertencias.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-xs text-amber-700">
                {previa.advertencias.map((advertencia, indice) => (
                  <li key={indice}>{advertencia}</li>
                ))}
              </ul>
            ) : null}

            {previa.erroresMuestra.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-xs text-destructive">
                {previa.erroresMuestra.map((fila) => (
                  <li key={fila.fila}>
                    Fila {fila.fila}: {fila.mensaje}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Descripción</th>
                    <th className="px-2 py-1.5 font-medium">Unidad</th>
                    <th className="px-2 py-1.5 font-medium">Categoría</th>
                    <th className="px-2 py-1.5 font-medium">IVA</th>
                    <th className="px-2 py-1.5 font-medium">Costo</th>
                    <th className="px-2 py-1.5 font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.ejemplos.map((fila) => (
                    <tr key={fila.fila} className="border-t">
                      <td className="max-w-[16rem] truncate px-2 py-1.5" title={fila.descripcion}>
                        {fila.descripcion}
                      </td>
                      <td className="px-2 py-1.5">{fila.unidad}</td>
                      <td className="px-2 py-1.5">{fila.categoria}</td>
                      <td className="px-2 py-1.5">{fila.iva}%</td>
                      <td className="px-2 py-1.5">{formatearMoneda(fila.costo)}</td>
                      <td className="px-2 py-1.5">{formatearMoneda(fila.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Vista previa de las primeras filas detectadas.
            </p>
          </div>
        ) : null}

        {resultado ? (
          <div className="space-y-2 rounded-lg border border-emerald-600/30 bg-emerald-50/60 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Importación completada
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                {resultado.resumen.creados} creados
              </Badge>
              <Badge className="bg-sky-600 text-white hover:bg-sky-600">
                {resultado.resumen.actualizados} actualizados
              </Badge>
              <Badge variant="secondary">
                {resultado.resumen.sinCambios} sin cambios
              </Badge>
              {resultado.resumen.omitidos > 0 ? (
                <Badge variant="outline">
                  {resultado.resumen.omitidos} omitidos
                </Badge>
              ) : null}
              {resultado.resumen.errores > 0 ? (
                <Badge variant="destructive">
                  {resultado.resumen.errores} con error
                </Badge>
              ) : null}
            </div>
            {resultado.resumen.catalogos.unidades.length > 0 ||
            resultado.resumen.catalogos.categorias.length > 0 ||
            resultado.resumen.catalogos.ivas.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Catálogos nuevos: {resultado.resumen.catalogos.unidades.length}{" "}
                unidad(es),{" "}
                {resultado.resumen.catalogos.categorias.length} categoría(s),{" "}
                {resultado.resumen.catalogos.ivas.length} tasa(s) de IVA.
              </p>
            ) : null}
            {resultado.erroresMuestra.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-xs text-destructive">
                {resultado.erroresMuestra.map((fila) => (
                  <li key={fila.fila}>
                    Fila {fila.fila}: {fila.mensaje}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <AlertDialog
          open={confirmarAbierto}
          onOpenChange={setConfirmarAbierto}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Importar el catálogo?</AlertDialogTitle>
              <AlertDialogDescription>
                {previa
                  ? `Se procesarán ${previa.validas} fila(s): ${previa.nuevos} producto(s) nuevo(s) y hasta ${previa.coincidencias} existente(s) que se actualizarán si cambiaron sus datos o precios. No se elimina ningún producto existente.`
                  : "Se importará el catálogo desde la hoja."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={importando}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(evento) => {
                  evento.preventDefault();
                  importarCatalogo();
                }}
                disabled={importando}
              >
                {importando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Sí, importar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
