"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClientesSection } from "@/components/clientes/clientes-section";
import { PresupuestosSection } from "@/components/presupuestos/presupuestos-section";
import { UnidadesSection } from "@/components/unidades/unidades-section";
import { CategoriasSection } from "@/components/categorias/categorias-section";
import { IvasSection } from "@/components/ivas/ivas-section";
import { ProductosSection } from "@/components/productos/productos-section";
import { ConfiguracionSection } from "@/components/configuracion/configuracion-section";
import type { SeccionApp } from "@/lib/types";

export default function Page() {
  const [seccion, setSeccion] = useState<SeccionApp>("clientes");

  return (
    <AppShell active={seccion} onNavigate={setSeccion}>
      {seccion === "clientes" ? (
        <ClientesSection />
      ) : seccion === "presupuestos" ? (
        <PresupuestosSection onIrA={setSeccion} />
      ) : seccion === "unidades" ? (
        <UnidadesSection />
      ) : seccion === "categorias" ? (
        <CategoriasSection />
      ) : seccion === "ivas" ? (
        <IvasSection />
      ) : seccion === "productos" ? (
        <ProductosSection onIrA={setSeccion} />
      ) : (
        <ConfiguracionSection />
      )}
    </AppShell>
  );
}
