"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Package, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { productoSchema, type ProductoInput } from "@/lib/validations/producto";
import {
  calcularSubtotal,
  formatearMoneda,
  textoANumero,
} from "@/lib/productos-utils";
import type {
  Categoria,
  Iva,
  ProductoConRelaciones,
  SeccionApp,
  Unidad,
} from "@/lib/types";

type ProductoFormProps = {
  editing: ProductoConRelaciones | null;
  onSaved: () => void;
  onCancelEdit: () => void;
  unidades: Unidad[];
  categorias: Categoria[];
  ivas: Iva[];
  cargandoCatalogos: boolean;
  onIrA: (seccion: SeccionApp) => void;
};

const VALORES_INICIALES: ProductoInput = {
  codigoSat: "",
  descripcion: "",
  unidadId: "",
  categoriaId: "",
  ivaId: "",
  costo: "",
  margen: "",
  notas: "",
};

/**
 * Aviso que se muestra cuando un catálogo necesario (unidades,
 * categorías o IVA) aún no tiene registros, con acceso directo
 * a la sección correspondiente.
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

export function ProductoForm({
  editing,
  onSaved,
  onCancelEdit,
  unidades,
  categorias,
  ivas,
  cargandoCatalogos,
  onIrA,
}: ProductoFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  const form = useForm<ProductoInput>({
    resolver: zodResolver(productoSchema),
    defaultValues: VALORES_INICIALES,
    mode: "onBlur",
  });

  // Al seleccionar un producto para editar, se carga en el formulario.
  useEffect(() => {
    if (editing) {
      form.reset({
        codigoSat: editing.codigoSat,
        descripcion: editing.descripcion,
        unidadId: editing.unidadId,
        categoriaId: editing.categoriaId,
        ivaId: editing.ivaId,
        costo: String(editing.costo),
        margen: String(editing.margen),
        notas: editing.notas ?? "",
      });
    }
  }, [editing, form]);

  // Subtotal en vivo: costo + margen de ganancia %.
  const costoTexto = form.watch("costo");
  const margenTexto = form.watch("margen");

  const subtotalCalculado = useMemo(() => {
    const costo = textoANumero(costoTexto ?? "");
    const margen = textoANumero(margenTexto ?? "");
    if (
      !Number.isFinite(costo) ||
      !Number.isFinite(margen) ||
      costo < 0 ||
      margen < 0
    ) {
      return null;
    }
    return calcularSubtotal(costo, margen);
  }, [costoTexto, margenTexto]);

  function handleCancel() {
    form.reset(VALORES_INICIALES);
    onCancelEdit();
  }

  async function onSubmit(values: ProductoInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/productos/${editing.id}` : "/api/productos";
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          for (const [field, message] of Object.entries<string>(
            data.fieldErrors
          )) {
            if (message) {
              form.setError(field as keyof ProductoInput, { message });
            }
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar el producto",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Producto actualizado" : "Producto registrado",
        description: isEditing
          ? `Los cambios en "${values.descripcion}" se guardaron correctamente.`
          : `"${values.descripcion}" se agregó al catálogo de productos.`,
      });

      form.reset(VALORES_INICIALES);
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
              Editar producto
            </>
          ) : (
            <>
              <Package className="h-4 w-4 text-primary" aria-hidden="true" />
              Registrar producto
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando "${editing?.descripcion}". Capture los nuevos datos y guarde.`
            : "Capture los datos del producto o servicio que utilizará en sus presupuestos."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-1 [&>*]:min-w-0"
            noValidate
          >
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 2xl:col-span-1">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Papel bond carta 75g"
                      autoComplete="off"
                      maxLength={200}
                      {...field}
                      onChange={(event) =>
                        field.onChange(event.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codigoSat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código SAT</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 24101702"
                      autoComplete="off"
                      className="font-mono uppercase"
                      maxLength={20}
                      {...field}
                      onChange={(event) =>
                        field.onChange(event.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Clave de producto o servicio del SAT.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!cargandoCatalogos && categorias.length === 0 && (
                    <AvisoCatalogoVacio
                      mensaje="Aún no hay categorías registradas."
                      destino="categorias"
                      etiquetaBoton="Ir a Categorías"
                      onIrA={onIrA}
                    />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unidadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la unidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id}>
                          {unidad.unidad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!cargandoCatalogos && unidades.length === 0 && (
                    <AvisoCatalogoVacio
                      mensaje="Aún no hay unidades registradas."
                      destino="unidades"
                      etiquetaBoton="Ir a Unidades"
                      onIrA={onIrA}
                    />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ivaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IVA</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la tasa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ivas.map((iva) => (
                        <SelectItem key={iva.id} value={iva.id}>
                          Tasa {iva.tasa}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!cargandoCatalogos && ivas.length === 0 && (
                    <AvisoCatalogoVacio
                      mensaje="Aún no hay tasas de IVA registradas."
                      destino="ivas"
                      etiquetaBoton="Ir a IVA"
                      onIrA={onIrA}
                    />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="costo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                        aria-hidden="true"
                      >
                        $
                      </span>
                      <Input
                        placeholder="Ej. 150.00"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pl-7 tabular-nums"
                        aria-label="Costo del producto"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="margen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margen de ganancia</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Ej. 30"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pr-8 tabular-nums"
                        aria-label="Margen de ganancia"
                        {...field}
                      />
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                        aria-hidden="true"
                      >
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Porcentaje que se agrega al costo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div
              className="rounded-lg border bg-muted/40 p-4 sm:col-span-2 2xl:col-span-1"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Subtotal (calculado automáticamente)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subtotal = Costo + Margen de ganancia %
                  </p>
                </div>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    subtotalCalculado === null
                      ? "text-muted-foreground/40"
                      : "text-primary"
                  }`}
                >
                  {subtotalCalculado === null
                    ? "—"
                    : formatearMoneda(subtotalCalculado)}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 2xl:col-span-1">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas internas sobre el producto (opcional)…"
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Opcional · máximo 500 caracteres.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row 2xl:col-span-1">
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
                    {isEditing ? "Guardar cambios" : "Guardar producto"}
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
        </Form>
      </CardContent>
    </Card>
  );
}
