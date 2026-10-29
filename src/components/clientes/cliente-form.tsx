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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { clienteSchema, type ClienteInput } from "@/lib/validations/cliente";
import type { Cliente } from "@/lib/types";

const EMPTY_VALUES: ClienteInput = {
  razonSocial: "",
  rfc: "",
  calle: "",
  numero: "",
  colonia: "",
  codigoPostal: "",
  ciudad: "",
  estado: "",
  telefono: "",
  email: "",
};

type ClienteFormProps = {
  editing: Cliente | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export function ClienteForm({ editing, onSaved, onCancelEdit }: ClienteFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editing);

  const valoresActuales: ClienteInput = editing
    ? {
        razonSocial: editing.razonSocial ?? "",
        rfc: editing.rfc ?? "",
        calle: editing.calle ?? "",
        numero: editing.numero ?? "",
        colonia: editing.colonia ?? "",
        codigoPostal: editing.codigoPostal ?? "",
        ciudad: editing.ciudad ?? "",
        estado: editing.estado ?? "",
        telefono: editing.telefono ?? "",
        email: editing.email ?? "",
      }
    : EMPTY_VALUES;

  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: EMPTY_VALUES,
    values: valoresActuales,
    mode: "onBlur",
  });

  function handleCancel() {
    form.reset(EMPTY_VALUES);
    onCancelEdit();
  }

  async function onSubmit(values: ClienteInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/clientes/${editing.id}` : "/api/clientes";
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Errores de campo devueltos por la API (validación o RFC duplicado).
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          for (const [field, message] of Object.entries<string>(
            data.fieldErrors
          )) {
            form.setError(field as keyof ClienteInput, { message });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar el cliente",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Cliente actualizado" : "Cliente registrado",
        description: isEditing
          ? `Los datos de "${values.razonSocial}" se actualizaron correctamente.`
          : `"${values.razonSocial}" se agregó a la lista de clientes.`,
      });

      form.reset(EMPTY_VALUES);
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
              Editar cliente
            </>
          ) : (
            "Registrar cliente"
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando a "${editing?.razonSocial}". Actualice los campos y guarde los cambios.`
            : "Complete los datos fiscales y de contacto del cliente."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Datos generales */}
            <FormField
              control={form.control}
              name="razonSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón social o nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Comercializadora del Noroeste, S.A. de C.V."
                      autoComplete="organization"
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
              name="rfc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFC</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. GODE561231GR8"
                      className="font-mono uppercase"
                      maxLength={13}
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

            <Separator />

            {/* Dirección */}
            <p className="text-sm font-medium text-muted-foreground">
              Dirección completa
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="calle"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Calle</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. Av. Reforma"
                        autoComplete="address-line1"
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
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. 1234"
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="colonia"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Colonia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. Centro Cívico"
                        autoComplete="address-line2"
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
                name="codigoPostal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>C.P.</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. 22000"
                        inputMode="numeric"
                        maxLength={5}
                        autoComplete="postal-code"
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value.replace(/\D/g, "").slice(0, 5)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ciudad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. Tijuana"
                        autoComplete="address-level2"
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
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. Baja California"
                        autoComplete="address-level1"
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
            </div>

            <Separator />

            {/* Contacto */}
            <p className="text-sm font-medium text-muted-foreground">
              Datos de contacto
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. 664 123 4567"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. contacto@empresa.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    {isEditing ? "Guardar cambios" : "Guardar cliente"}
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
