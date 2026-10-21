"use client";

import { Building2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { LogoUploadField } from "@/components/configuracion/logo-upload-field";
import type { ConfiguracionInput } from "@/lib/validations/configuracion";

type EmpresaCardProps = {
  form: UseFormReturn<ConfiguracionInput>;
};

/**
 * Tarjeta "Datos de la Empresa": identidad fiscal, contacto y logotipo.
 */
export function EmpresaCard({ form }: EmpresaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Datos de la empresa
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombreComercial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Comercial</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Comercializadora del Norte"
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

            <FormField
              control={form.control}
              name="razonLegal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Legal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Comercializadora del Norte, S.A. de C.V."
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

            <FormField
              control={form.control}
              name="rfc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFC</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. CSN200210B44"
                      autoComplete="off"
                      className="uppercase"
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
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logotipo Principal</FormLabel>
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

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Calle, número y colonia"
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

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 686.4333453"
                      autoComplete="off"
                      inputMode="tel"
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
                  <FormLabel>Email Corporativo</FormLabel>
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
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
