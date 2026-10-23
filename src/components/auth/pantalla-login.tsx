"use client";

import { useState } from "react";
import {
  Calculator,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfiguracionAplicacion } from "@/components/configuracion-aplicacion";
import { guardarTokenSesion } from "@/lib/sesion-cliente";
import type { SesionActiva } from "@/lib/types";

type PantallaLoginProps = {
  onIniciarSesion: (usuario: SesionActiva) => void;
};

/**
 * Pantalla de inicio de sesión: se muestra mientras no exista una sesión
 * válida. Utiliza la identidad visual de la empresa (logo, nombre y color
 * primario) provista por el contexto de configuración.
 */
export function PantallaLogin({ onIniciarSesion }: PantallaLoginProps) {
  const { configuracion } = useConfiguracionAplicacion();
  const nombreEmpresa =
    configuracion?.nombreComercial || "Administrador de Presupuestos";
  const logotipo = configuracion?.logo ?? null;

  const [cuenta, setCuenta] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!cuenta.trim() || !password.trim()) {
      setError("Capture su usuario y contraseña");
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: cuenta.trim(), password }),
      });
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setError(datos?.error ?? "No fue posible iniciar sesión");
        return;
      }

      // Respaldo para navegadores que bloquean cookies: el token se guarda
      // en localStorage y se enviará por el encabezado "x-sesion".
      if (typeof datos?.token === "string") {
        guardarTokenSesion(datos.token);
      }

      onIniciarSesion(datos.usuario as SesionActiva);
    } catch {
      setError(
        "Error de conexión con el servidor. Verifique su red e intente de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="items-center text-center">
              {logotipo ? (
                <img
                  src={logotipo}
                  alt={`Logotipo de ${nombreEmpresa}`}
                  className="mx-auto h-16 w-16 object-contain"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Calculator className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <p className="mt-2 truncate text-sm font-semibold text-muted-foreground">
                {nombreEmpresa}
              </p>
              <CardTitle className="text-xl">Iniciar sesión</CardTitle>
              <CardDescription>
                Ingrese sus credenciales para acceder al administrador de
                presupuestos.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={manejarEnvio}
                className="space-y-4"
                noValidate
                autoComplete="on"
              >
                <div className="space-y-2">
                  <Label htmlFor="cuenta">Usuario</Label>
                  <Input
                    id="cuenta"
                    name="username"
                    value={cuenta}
                    onChange={(evento) => setCuenta(evento.target.value)}
                    placeholder="Su nombre de usuario"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={enviando}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={verPassword ? "text" : "password"}
                      value={password}
                      onChange={(evento) => setPassword(evento.target.value)}
                      placeholder="Su contraseña"
                      autoComplete="current-password"
                      className="pr-10"
                      disabled={enviando}
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword((valor) => !valor)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        verPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
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
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={enviando}
                >
                  {enviando ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Verificando…
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                      Iniciar sesión
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Administrador de Presupuestos
          </p>
        </div>
      </main>
    </div>
  );
}

/** Indicador mientras se verifica la sesión al cargar la aplicación. */
export function PantallaVerificando() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm">Verificando sesión…</p>
        </div>
      </main>
    </div>
  );
}
