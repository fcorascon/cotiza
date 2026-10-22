"use client";

import { Paintbrush } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { ConfiguracionInput } from "@/lib/validations/configuracion";

type AparienciaCardProps = {
  form: UseFormReturn<ConfiguracionInput>;
};

/** Paleta rápida de colores de marca. */
const PRESETS: Array<{ valor: string; nombre: string }> = [
  { valor: "#191970", nombre: "Azul marino" },
  { valor: "#F4711E", nombre: "Naranja" },
  { valor: "#1D4ED8", nombre: "Azul" },
  { valor: "#0F766E", nombre: "Verde azulado" },
  { valor: "#B91C1C", nombre: "Rojo" },
  { valor: "#7C3AED", nombre: "Violeta" },
  { valor: "#0A0A0A", nombre: "Negro" },
  { valor: "#0D9488", nombre: "Turquesa" },
];

/** Texto legible sobre el color elegido (vista previa). */
function colorTexto(color: string): string {
  const limpio = color.replace("#", "");
  if (limpio.length !== 6) return "#ffffff";
  const r = parseInt(limpio.slice(0, 2), 16) / 255;
  const g = parseInt(limpio.slice(2, 4), 16) / 255;
  const b = parseInt(limpio.slice(4, 6), 16) / 255;
  const canal = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const luminancia = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  return luminancia > 0.4 ? "#111827" : "#ffffff";
}

/**
 * Tarjeta "Apariencia de la aplicación": color primario que tiñe menús,
 * botones, títulos y acentos de toda la aplicación al guardar.
 */
export function AparienciaCard({ form }: AparienciaCardProps) {
  const color = form.watch("colorPrimario");
  const texto = colorTexto(color);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <Paintbrush className="h-4 w-4 text-primary" aria-hidden="true" />
          Apariencia de la aplicación
        </CardTitle>
        <CardDescription>
          Color principal de toda la aplicación: menú, botones, títulos y
          acentos. Se aplica al guardar los cambios.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FormField
          control={form.control}
          name="colorPrimario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color principal</FormLabel>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <FormControl>
                  <input
                    type="color"
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Color principal de la aplicación"
                    className="h-11 w-full cursor-pointer rounded-md border border-input bg-transparent p-1 sm:w-24"
                  />
                </FormControl>

                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colores sugeridos">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.valor}
                        type="button"
                        title={preset.nombre}
                        aria-label={`Usar color ${preset.nombre} (${preset.valor})`}
                        onClick={() => field.onChange(preset.valor)}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                          color.toUpperCase() === preset.valor
                            ? "border-foreground ring-2 ring-ring ring-offset-2"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: preset.valor }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-xs uppercase text-muted-foreground">
                    {color.toUpperCase()}
                  </p>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vista previa con el color seleccionado */}
        <div
          className="mt-4 overflow-hidden rounded-lg border"
          aria-label="Vista previa del color"
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ backgroundColor: color, color: texto }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-70" />
            <span className="text-sm font-semibold">Menú lateral</span>
          </div>
          <div className="space-y-2 px-4 py-3">
            <p className="text-sm font-bold" style={{ color }}>
              Título de sección
            </p>
            <div className="flex gap-2">
              <span
                className="rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: color, color: texto }}
              >
                Botón primario
              </span>
              <span
                className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: color, color }}
              >
                Botón secundario
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          El logotipo se cambia en la tarjeta &quot;Datos de la empresa&quot;
          y aparece en el menú, el encabezado móvil y el favicon.
        </p>
      </CardContent>
    </Card>
  );
}
