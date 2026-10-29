"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cabeceraSesion } from "@/lib/sesion-cliente";
import {
  envioCorreoSchema,
  type EnvioCorreoInput,
} from "@/lib/validations/configuracion";
import type { Presupuesto } from "@/lib/types";

type EnviarCorreoDialogProps = {
  presupuesto: Presupuesto | null;
  /** "presupuesto" envía el documento con montos; "recibo" envía el
   * recibo de mercancía sin valores monetarios. */
  modo?: "presupuesto" | "recibo";
  onClose: () => void;
};

/**
 * Diálogo "Enviar por correo": envía el presupuesto (o el recibo de
 * mercancía) al cliente usando el servidor SMTP configurado en la
 * sección Configuración.
 */
export function EnviarCorreoDialog({
  presupuesto,
  modo = "presupuesto",
  onClose,
}: EnviarCorreoDialogProps) {
  const esRecibo = modo === "recibo";
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<EnvioCorreoInput>({
    resolver: zodResolver(envioCorreoSchema),
    defaultValues: { destino: "", asunto: "", mensaje: "" },
  });

  useEffect(() => {
    if (presupuesto) {
      form.reset({
        destino: presupuesto.cliente.email ?? "",
        asunto: "",
        mensaje: "",
      });
    }
  }, [presupuesto, form]);

  async function onSubmit(values: EnvioCorreoInput) {
    if (!presupuesto) return;
    setEnviando(true);
    try {
      const response = await fetch(`/api/presupuestos/${presupuesto.id}/enviar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...cabeceraSesion(),
        },
        body: JSON.stringify({ ...values, modo }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          for (const [campo, mensaje] of Object.entries<string>(
            data.fieldErrors
          )) {
            form.setError(campo as keyof EnvioCorreoInput, {
              message: mensaje,
            });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo enviar el correo",
          description:
            data?.error ?? "Revise la configuración SMTP e intente de nuevo.",
        });
        return;
      }

      toast({
        title: "Correo enviado",
        description:
          data?.message ??
          `El ${esRecibo ? "recibo" : "presupuesto"} fue enviado a ${values.destino}.`,
      });
      onClose();
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description:
          "No fue posible comunicar con el servidor. Intente nuevamente.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={presupuesto !== null}
      onOpenChange={(abierto) => !abierto && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            {esRecibo
              ? "Enviar recibo de mercancía por correo"
              : "Enviar presupuesto por correo"}
          </DialogTitle>
          <DialogDescription>
            Se enviará el presupuesto de{" "}
            <span className="font-semibold text-foreground">
              {presupuesto?.cliente.razonSocial}
            </span>{" "}
            usando el servidor SMTP configurado en la sección Configuración.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="destino"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo de destino</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="cliente@empresa.com"
                        autoComplete="off"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asunto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Deje vacío para usar el asunto sugerido"
                        autoComplete="off"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mensaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje personalizado (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Texto que acompañará al presupuesto en el correo…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
