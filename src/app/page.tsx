"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClientesSection } from "@/components/clientes/clientes-section";
import { UnidadesSection } from "@/components/unidades/unidades-section";
import { CategoriasSection } from "@/components/categorias/categorias-section";
import type { SeccionApp } from "@/lib/types";

export default function Page() {
  const [seccion, setSeccion] = useState<SeccionApp>("clientes");

  return (
    <AppShell active={seccion} onNavigate={setSeccion}>
      {seccion === "clientes" ? (
        <ClientesSection />
      ) : seccion === "unidades" ? (
        <UnidadesSection />
      ) : (
        <CategoriasSection />
      )}
    </AppShell>
  );
}
