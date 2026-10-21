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
import {
  categoriaSchema,
  type CategoriaInput,
} from "@/lib/validations/categoria";
import type { Categoria } from "@/lib/types";

type CategoriaFormProps = {
  editing: Categoria | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export function CategoriaForm({
  editing,
  onSaved,
  onCancelEdit,
}: CategoriaFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  const form = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { categoria: "" },
    mode: "onBlur",
  });

  // Al seleccionar una categoría para editar, se carga en el formulario.
  useEffect(() => {
    if (editing) {
      form.reset({ categoria: editing.categoria });
    }
  }, [editing, form]);

  function handleCancel() {
    form.reset({ categoria: "" });
    onCancelEdit();
  }

  async function onSubmit(values: CategoriaInput) {
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/categorias/${editing.id}`
        : "/api/categorias";
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
            form.setError(field as keyof CategoriaInput, { message });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar la categoría",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Categoría actualizada" : "Categoría registrada",
        description: isEditing
          ? `La categoría se renombró a "${values.categoria}".`
          : `"${values.categoria}" se agregó al catálogo de categorías.`,
      });

      form.reset({ categoria: "" });
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
              Editar categoría
            </>
          ) : (
            "Registrar categoría"
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando "${editing?.categoria}". Escriba el nuevo nombre y guarde.`
            : "Capture el nombre de la categoría (ej. Papelería, Limpieza)."}
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
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Artículos de oficina"
                      autoComplete="off"
                      {...field}
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
                    {isEditing ? "Guardar cambios" : "Guardar categoría"}
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Cancelar edición
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
