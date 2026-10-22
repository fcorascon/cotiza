"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  XCircle,
  Zap,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ConfiguracionInput } from "@/lib/validations/configuracion";
import type { EnvioCorreo } from "@/lib/types";

type SmtpCardProps = {
  form: UseFormReturn<ConfiguracionInput>;
};

type ResultadoPrueba = { ok: boolean; message: string };

const ETIQUETAS_CIFRADO: Record<ConfiguracionInput["smtpCifrado"], string> = {
  SSL: "SSL (Puerto 465)",
  TLS: "TLS / STARTTLS (Puerto 587)",
  NINGUNA: "Sin cifrado",
};

/**
 * Tarjeta "Servidor de Correo (SMTP)": conexión, credenciales y prueba
 * de conexión en vivo contra el servidor indicado en el formulario.
 */
export function SmtpCard({ form }: SmtpCardProps) {
  const [destino, setDestino] = useState("");
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);
  const [enviosAbiertos, setEnviosAbiertos] = useState(false);
  const [envios, setEnvios] = useState<EnvioCorreo[]>([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(false);

  async function cargarEnvios() {
    setCargandoEnvios(true);
    try {
      const response = await fetch("/api/configuracion/envios", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setEnvios(await response.json());
    } catch {
      setEnvios([]);
    } finally {
      setCargandoEnvios(false);
    }
  }

  useEffect(() => {
    if (enviosAbiertos) cargarEnvios();
  }, [enviosAbiertos]);

  async function probarConexion() {
    setProbando(true);
    setResultado(null);
    try {
      const valores = form.getValues();
      const response = await fetch("/api/configuracion/probar-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: valores.smtpHost,
          puerto: valores.smtpPuerto,
          cifrado: valores.smtpCifrado,
          usuario: valores.smtpUsuario,
          password: valores.smtpPassword ?? "",
          destino: destino.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok && data?.fieldErrors) {
        for (const [campo, mensaje] of Object.entries<string>(
          data.fieldErrors
        )) {
          if (campo === "host") form.setError("smtpHost", { message: mensaje });
          if (campo === "puerto")
            form.setError("smtpPuerto", { message: mensaje });
          if (campo === "usuario")
            form.setError("smtpUsuario", { message: mensaje });
        }
      }
      setResultado({
        ok: Boolean(data?.ok),
        message:
          data?.message ??
          data?.error ??
          "No fue posible completar la prueba.",
      });
    } catch {
      setResultado({
        ok: false,
        message: "Error de conexión con el servidor. Intente nuevamente.",
      });
    } finally {
      setProbando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            Servidor de correo (SMTP)
          </CardTitle>
          <button
            type="button"
            onClick={() => setEnviosAbiertos(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Ver envíos
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="smtpHost"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                    Host SMTP
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. mail.empresa.com.mx"
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
              name="smtpPuerto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                    Puerto
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 465"
                      inputMode="numeric"
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
              name="smtpCifrado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                    Cifrado
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el cifrado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.keys(ETIQUETAS_CIFRADO) as Array<
                          ConfiguracionInput["smtpCifrado"]
                        >
                      ).map((valor) => (
                        <SelectItem key={valor} value={valor}>
                          {ETIQUETAS_CIFRADO[valor]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smtpUsuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                    Usuario / Remitente
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. ventas@empresa.com.mx"
                      autoComplete="off"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smtpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                    Contraseña
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Deje vacío para conservar la contraseña guardada.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Prueba de conexión */}
          <div className="mt-5 space-y-3 rounded-lg border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Prueba de conexión SMTP
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={destino}
                onChange={(event) => setDestino(event.target.value)}
                placeholder="Correo de destino (opcional, envía un mensaje de prueba)"
                type="email"
                autoComplete="off"
                aria-label="Correo de destino para la prueba"
              />
              <Button
                type="button"
                onClick={probarConexion}
                disabled={probando}
                className="sm:w-auto shrink-0"
              >
                {probando ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Probando…
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                    Probar Conexión
                  </>
                )}
              </Button>
            </div>
            {resultado && (
              <p
                role="status"
                className={cn(
                  "text-sm font-medium",
                  resultado.ok ? "text-emerald-600" : "text-destructive"
                )}
              >
                {resultado.message}
              </p>
            )}
          </div>
        </Form>
      </CardContent>

      <Dialog open={enviosAbiertos} onOpenChange={setEnviosAbiertos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envíos de correo</DialogTitle>
            <DialogDescription>
              Últimos correos enviados desde la aplicación (bitácora de los
              últimos 50 envíos).
            </DialogDescription>
          </DialogHeader>

          {cargandoEnvios ? (
            <div className="space-y-2 py-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : envios.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
              <Mail
                className="h-8 w-8 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="font-medium">Aún no hay envíos registrados</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Los correos de presupuestos aparecerán aquí, con su estado de
                envío.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-3">
              <ul className="space-y-2">
                {envios.map((envio) => {
                  const exitoso = envio.estado === "ENVIADO";
                  return (
                    <li
                      key={envio.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          {exitoso ? (
                            <CheckCircle2
                              className="h-4 w-4 text-emerald-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <XCircle
                              className="h-4 w-4 text-destructive"
                              aria-hidden="true"
                            />
                          )}
                          {envio.presupuesto?.cliente.razonSocial ??
                            "Presupuesto eliminado"}
                        </span>
                        <Badge
                          variant={exitoso ? "secondary" : "destructive"}
                          className={cn(
                            "text-[10px]",
                            exitoso &&
                              "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          )}
                        >
                          {exitoso ? "ENVIADO" : "ERROR"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {envio.asunto}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Para: <span className="font-mono">{envio.destino}</span>{" "}
                        ·{" "}
                        {new Date(envio.createdAt).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                      {envio.error && (
                        <p className="mt-1 text-xs text-destructive">
                          {envio.error}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
