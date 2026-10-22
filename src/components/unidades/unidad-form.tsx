"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save, X } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { unidadSchema, type UnidadInput } from "@/lib/validations/unidad";
import type { Unidad } from "@/lib/types";

type UnidadFormProps = {
  editing: Unidad | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export function UnidadForm({ editing, onSaved, onCancelEdit }: UnidadFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  const form = useForm<UnidadInput>({
    resolver: zodResolver(unidadSchema),
    defaultValues: { unidad: "" },
    mode: "onBlur",
  });

  // Al seleccionar una unidad para editar, se carga en el formulario.
  useEffect(() => {
    if (editing) {
      form.reset({ unidad: editing.unidad });
    }
  }, [editing, form]);

  function handleCancel() {
    form.reset({ unidad: "" });
    onCancelEdit();
  }

  async function onSubmit(values: UnidadInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/unidades/${editing.id}` : "/api/unidades";
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
            form.setError(field as keyof UnidadInput, { message });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar la unidad",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Unidad actualizada" : "Unidad registrada",
        description: isEditing
          ? `La unidad se renombró a "${values.unidad}".`
          : `"${values.unidad}" se agregó al catálogo de unidades.`,
      });

      form.reset({ unidad: "" });
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
              Editar unidad
            </>
          ) : (
            "Registrar unidad"
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando "${editing?.unidad}". Escriba el nuevo nombre y guarde.`
            : "Capture el nombre de la unidad de medida (ej. m², pieza, lote, servicio)."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="unidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Metro cuadrado (m²)"
                      autoComplete="off"
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

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
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
                    {isEditing ? "Guardar cambios" : "Guardar unidad"}
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
