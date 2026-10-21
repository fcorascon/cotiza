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
import { ivaSchema, type IvaInput } from "@/lib/validations/iva";
import type { Iva } from "@/lib/types";

type IvaFormProps = {
  editing: Iva | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export function IvaForm({ editing, onSaved, onCancelEdit }: IvaFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  const form = useForm<IvaInput>({
    resolver: zodResolver(ivaSchema),
    defaultValues: { tasa: "" },
    mode: "onBlur",
  });

  // Al seleccionar una tasa para editar, se carga en el formulario.
  useEffect(() => {
    if (editing) {
      form.reset({ tasa: String(editing.tasa) });
    }
  }, [editing, form]);

  function handleCancel() {
    form.reset({ tasa: "" });
    onCancelEdit();
  }

  async function onSubmit(values: IvaInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/ivas/${editing.id}` : "/api/ivas";
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
            form.setError(field as keyof IvaInput, { message });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar la tasa de IVA",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Tasa de IVA actualizada" : "Tasa de IVA registrada",
        description: isEditing
          ? `La tasa se actualizó a "${values.tasa}%".`
          : `La tasa "${values.tasa}%" se agregó al catálogo de IVA.`,
      });

      form.reset({ tasa: "" });
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
              Editar tasa de IVA
            </>
          ) : (
            "Registrar tasa de IVA"
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando la tasa ${editing ? String(editing.tasa) : ""}%. Capture el nuevo valor y guarde.`
            : "Capture la tasa porcentual de IVA (ej. 0, 8 o 16)."}
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
              name="tasa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tasa de IVA (%)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 16"
                      inputMode="decimal"
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
                    {isEditing ? "Guardar cambios" : "Guardar tasa"}
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
