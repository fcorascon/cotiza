"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { AppShell } from "@/components/app-shell";
import { ClientesSection } from "@/components/clientes/clientes-section";
import { UnidadesSection } from "@/components/unidades/unidades-section";
import { CategoriasSection } from "@/components/categorias/categorias-section";
import { IvasSection } from "@/components/ivas/ivas-section";
import { ConfiguracionSection } from "@/components/configuracion/configuracion-section";
import type { SeccionApp } from "@/lib/types";

const SECCIONES: Record<SeccionApp, ComponentType> = {
  clientes: ClientesSection,
  unidades: UnidadesSection,
  categorias: CategoriasSection,
  ivas: IvasSection,
  configuracion: ConfiguracionSection,
};

export default function Page() {
  const [seccion, setSeccion] = useState<SeccionApp>("clientes");
  const SeccionActual = SECCIONES[seccion];

  return (
    <AppShell active={seccion} onNavigate={setSeccion}>
      <SeccionActual />
    </AppShell>
  );
}
