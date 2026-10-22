"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Palette,
  ReceiptText,
  RotateCcw,
  Save,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  useConfiguracionAplicacion,
} from "@/components/configuracion-aplicacion";
import { EmpresaCard } from "@/components/configuracion/empresa-card";
import { SmtpCard } from "@/components/configuracion/smtp-card";
import { DisenoCard } from "@/components/configuracion/diseno-card";
import {
  AparienciaCard,
} from "@/components/configuracion/apariencia-card";
import {
  configuracionSchema,
  type ConfiguracionInput,
} from "@/lib/validations/configuracion";
import type { Configuracion } from "@/lib/types";

/** Valores vacíos mientras se carga la configuración. */
const VALORES_VACIOS: ConfiguracionInput = {
  nombreComercial: "",
  razonLegal: "",
  rfc: "",
  direccion: "",
  telefono: "",
  email: "",
  logo: null,
  smtpHost: "",
  smtpPuerto: "",
  smtpCifrado: "SSL",
  smtpUsuario: "",
  smtpPassword: "",
  presupuestoColor: "#1D4ED8",
  presupuestoFila: "normal",
  presupuestoLogo: null,
  reciboColor: "#1D4ED8",
  reciboFila: "grande",
  reciboLogo: null,
  colorPrimario: "#191970",
};

/** Convierte la configuración del servidor a valores del formulario. */
function aValoresFormulario(config: Configuracion): ConfiguracionInput {
  return {
    nombreComercial: config.nombreComercial,
    razonLegal: config.razonLegal,
    rfc: config.rfc,
    direccion: config.direccion,
    telefono: config.telefono,
    email: config.email,
    logo: config.logo ?? null,
    smtpHost: config.smtpHost,
    smtpPuerto: String(config.smtpPuerto),
    smtpCifrado: config.smtpCifrado as ConfiguracionInput["smtpCifrado"],
    smtpUsuario: config.smtpUsuario,
    smtpPassword: "",
    presupuestoColor: config.presupuestoColor,
    presupuestoFila:
      config.presupuestoFila as ConfiguracionInput["presupuestoFila"],
    presupuestoLogo: config.presupuestoLogo ?? null,
    reciboColor: config.reciboColor,
    reciboFila: config.reciboFila as ConfiguracionInput["reciboFila"],
    reciboLogo: config.reciboLogo ?? null,
    colorPrimario: config.colorPrimario,
  };
}

export function ConfiguracionSection() {
  const { toast } = useToast();
  const { actualizar } = useConfiguracionAplicacion();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargados, setCargados] = useState<ConfiguracionInput | null>(null);

  const form = useForm<ConfiguracionInput>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: VALORES_VACIOS,
    mode: "onBlur",
  });

  const cargarConfiguracion = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/configuracion", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data: Configuracion = await response.json();
      const valores = aValoresFormulario(data);
      setCargados(valores);
      form.reset(valores);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener la configuración del sistema.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, form]);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  async function onSubmit(values: ConfiguracionInput) {
    setGuardando(true);
    try {
      const response = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          for (const [campo, mensaje] of Object.entries<string>(
            data.fieldErrors
          )) {
            form.setError(campo as keyof ConfiguracionInput, { message: mensaje });
          }
        }
        toast({
          variant: "destructive",
          title: "No se pudo guardar la configuración",
          description: data?.error ?? "Revise los datos e intente de nuevo.",
        });
        return;
      }

      const valores = aValoresFormulario(data as Configuracion);
      setCargados(valores);
      form.reset(valores);
      // Aplica de inmediato el color/logotipo a toda la aplicación.
      actualizar(data as Configuracion);
      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicaron correctamente.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description:
          "No fue posible comunicar con el servidor. Intente nuevamente.",
      });
    } finally {
      setGuardando(false);
    }
  }

  function handleCancelar() {
    if (cargados) form.reset(cargados);
    toast({
      title: "Cambios descartados",
      description: "Se restauraron los últimos valores guardados.",
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Preferencias del sistema: apariencia de la aplicación, datos de la
            empresa, servidor de correo y diseño de documentos.
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          aria-busy="true"
          aria-label="Cargando configuración"
        >
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <AparienciaCard form={form} />
                <EmpresaCard form={form} />
                <SmtpCard form={form} />
              </div>
              <div className="space-y-6">
                <DisenoCard
                  campo="presupuesto"
                  titulo="Diseño Presupuesto"
                  etiquetaLogo="Logotipo (Presupuesto)"
                  icono={<Palette className="h-4 w-4 text-primary" aria-hidden="true" />}
                  form={form}
                />
                <DisenoCard
                  campo="recibo"
                  titulo="Diseño Recibo"
                  etiquetaLogo="Logotipo (Recibo)"
                  icono={<ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />}
                  form={form}
                />
              </div>
            </div>

            {/* Barra inferior de acciones */}
            <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelar}
                disabled={guardando}
              >
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? (
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
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
