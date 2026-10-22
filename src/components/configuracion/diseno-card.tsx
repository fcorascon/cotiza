"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoUploadField } from "@/components/configuracion/logo-upload-field";
import type {
  ConfiguracionInput,
} from "@/lib/validations/configuracion";

type CampoDiseno = "presupuesto" | "recibo";

type DisenoCardProps = {
  campo: CampoDiseno;
  titulo: string;
  icono: ReactNode;
  etiquetaLogo: string;
  form: UseFormReturn<ConfiguracionInput>;
};

const OPCIONES_FILA: Array<{ value: "normal" | "grande"; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "grande", label: "Grande" },
];

/**
 * Tarjeta de diseño de documentos (presupuesto o recibo): color
 * distintivo, tamaño de fila y logotipo propio del documento.
 */
export function DisenoCard({
  campo,
  titulo,
  icono,
  etiquetaLogo,
  form,
}: DisenoCardProps) {
  const campoColor = campo === "presupuesto" ? "presupuestoColor" : "reciboColor";
  const campoFila = campo === "presupuesto" ? "presupuestoFila" : "reciboFila";
  const campoLogo = campo === "presupuesto" ? "presupuestoLogo" : "reciboLogo";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          {icono}
          {titulo}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={campoColor}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <input
                      type="color"
                      value={field.value}
                      onChange={field.onChange}
                      aria-label={`Color de ${titulo.toLowerCase()}`}
                      className="h-10 w-full cursor-pointer rounded-md border border-input bg-transparent p-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={campoFila}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fila</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tamaño" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_FILA.map((opcion) => (
                        <SelectItem key={opcion.value} value={opcion.value}>
                          {opcion.label}
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
              name={campoLogo}
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{etiquetaLogo}</FormLabel>
                  <FormControl>
                    <LogoUploadField
                      value={field.value}
                      onChange={(valor) => field.onChange(valor)}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
