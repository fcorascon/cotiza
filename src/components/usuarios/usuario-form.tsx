"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Pencil, Save, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cabeceraSesion } from "@/lib/sesion-cliente";
import type { Usuario } from "@/lib/types";

type UsuarioFormProps = {
  editing: Usuario | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

type ValoresForm = {
  usuario: string;
  nombre: string;
  rol: "ADMIN" | "USUARIO";
  activo: boolean;
  password?: string;
};

export const ETIQUETA_ROL: Record<Usuario["rol"], string> = {
  ADMIN: "Administrador",
  USUARIO: "Usuario",
};

export function UsuarioForm({ editing, onSaved, onCancelEdit }: UsuarioFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const isEditing = Boolean(editing);

  // Contraseña: obligatoria al crear; opcional al editar (vacía = sin cambio).
  const esquema = useMemo(
    () =>
      z
        .object({
          usuario: z
            .string()
            .trim()
            .min(3, "El usuario debe tener al menos 3 caracteres")
            .max(30, "El usuario no puede exceder 30 caracteres")
            .regex(
              /^[A-Za-z0-9._-]+$/,
              "Solo letras, números, punto, guion y guion bajo (sin espacios ni acentos)"
            ),
          nombre: z
            .string()
            .trim()
            .min(1, "El nombre es obligatorio")
            .max(80, "El nombre no puede exceder 80 caracteres"),
          rol: z.enum(["ADMIN", "USUARIO"], { message: "Seleccione un rol" }),
          activo: z.boolean(),
          password: z
            .string()
            .max(72, "La contraseña no puede exceder 72 caracteres")
            .optional(),
        })
        .superRefine((valores, ctx) => {
          if (!valores.password) {
            if (!isEditing) {
              ctx.addIssue({
                code: "custom",
                path: ["password"],
                message: "La contraseña es obligatoria",
              });
            }
            return;
          }
          if (valores.password.length < 4) {
            ctx.addIssue({
              code: "custom",
              path: ["password"],
              message: "La contraseña debe tener al menos 4 caracteres",
            });
          }
        }),
    [isEditing]
  );

  const form = useForm<ValoresForm>({
    resolver: zodResolver(esquema),
    defaultValues: {
      usuario: "",
      nombre: "",
      rol: "USUARIO",
      activo: true,
      password: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        usuario: editing.usuario,
        nombre: editing.nombre,
        rol: editing.rol,
        activo: editing.activo,
        password: "",
      });
    } else {
      form.reset({
        usuario: "",
        nombre: "",
        rol: "USUARIO",
        activo: true,
        password: "",
      });
    }
  }, [editing, form]);

  function handleCancel() {
    form.reset({
      usuario: "",
      nombre: "",
      rol: "USUARIO",
      activo: true,
      password: "",
    });
    onCancelEdit();
  }

  async function onSubmit(valores: ValoresForm) {
    setSubmitting(true);
    try {
      const cuerpo =
        isEditing && editing
          ? {
              usuario: valores.usuario,
              nombre: valores.nombre,
              rol: valores.rol,
              activo: valores.activo,
              ...(valores.password ? { password: valores.password } : {}),
            }
          : {
              usuario: valores.usuario,
              nombre: valores.nombre,
              rol: valores.rol,
              activo: valores.activo,
              password: valores.password ?? "",
            };

      const respuesta = await fetch(
        isEditing && editing ? `/api/usuarios/${editing.id}` : "/api/usuarios",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...cabeceraSesion(),
          },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        if (datos?.fieldErrors && typeof datos.fieldErrors === "object") {
          for (const [campo, mensaje] of Object.entries<string>(
            datos.fieldErrors
          )) {
            form.setError(campo as keyof ValoresForm, { message: mensaje });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar el usuario",
          description: datos?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      toast({
        title: isEditing ? "Usuario actualizado" : "Usuario registrado",
        description: isEditing
          ? `Los datos de "${valores.usuario}" se actualizaron correctamente.`
          : `La cuenta "${valores.usuario}" quedó registrada con rol ${ETIQUETA_ROL[valores.rol]}.`,
      });

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
              Editar usuario
            </>
          ) : (
            "Registrar usuario"
          )}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? `Modificando la cuenta "${editing?.usuario}". Deje la contraseña vacía para conservar la actual.`
            : "Capture los datos de acceso del nuevo usuario de la aplicación."}
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
              name="usuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. jparedes"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Nombre de cuenta para iniciar sesión (sin espacios).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Juan Paredes"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? "Nueva contraseña" : "Contraseña"}
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={verPassword ? "text" : "password"}
                        placeholder={
                          isEditing
                            ? "Deje vacío para conservar la actual"
                            : "Mínimo 4 caracteres"
                        }
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setVerPassword((valor) => !valor)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      tabIndex={-1}
                    >
                      {verPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {isEditing && (
                    <FormDescription>
                      Escríbala solo si desea restablecer la contraseña.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione el rol">
                        {ETIQUETA_ROL[field.value]}
                      </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        Administrador (gestiona usuarios)
                      </SelectItem>
                      <SelectItem value="USUARIO">
                        Usuario (uso operativo)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Usuario activo</FormLabel>
                    <FormDescription>
                      Los usuarios inactivos no pueden iniciar sesión.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Usuario activo"
                    />
                  </FormControl>
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
                    {isEditing ? "Guardar cambios" : "Guardar usuario"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                {isEditing ? "Cancelar edición" : "Cancelar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
