"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClientesSection } from "@/components/clientes/clientes-section";
import { PresupuestosSection } from "@/components/presupuestos/presupuestos-section";
import { UnidadesSection } from "@/components/unidades/unidades-section";
import { CategoriasSection } from "@/components/categorias/categorias-section";
import { IvasSection } from "@/components/ivas/ivas-section";
import { ProductosSection } from "@/components/productos/productos-section";
import { UsuariosSection } from "@/components/usuarios/usuarios-section";
import { ConfiguracionSection } from "@/components/configuracion/configuracion-section";
import {
  PantallaLogin,
  PantallaVerificando,
} from "@/components/auth/pantalla-login";
import type { SesionActiva, SeccionApp } from "@/lib/types";

export default function Page() {
  const [seccion, setSeccion] = useState<SeccionApp>("clientes");
  const [usuario, setUsuario] = useState<SesionActiva | null>(null);
  const [verificando, setVerificando] = useState(true);

  // Al cargar se consulta la sesión: si no es válida se muestra el acceso.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const respuesta = await fetch("/api/auth/me", { cache: "no-store" });
        if (!activo) return;
        if (respuesta.ok) {
          const datos = await respuesta.json();
          setUsuario((datos?.usuario as SesionActiva) ?? null);
        }
      } catch {
        if (activo) setUsuario(null);
      } finally {
        if (activo) setVerificando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  async function cerrarSesion() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Aunque falle la petición, la sesión local se cierra igualmente.
    }
    setUsuario(null);
    setSeccion("clientes");
  }

  if (verificando) {
    return <PantallaVerificando />;
  }

  if (!usuario) {
    return <PantallaLogin onIniciarSesion={setUsuario} />;
  }

  return (
    <AppShell
      active={seccion}
      onNavigate={setSeccion}
      usuario={usuario}
      onCerrarSesion={cerrarSesion}
    >
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
      ) : seccion === "usuarios" ? (
        <UsuariosSection usuarioActual={usuario} />
      ) : (
        <ConfiguracionSection />
      )}
    </AppShell>
  );
}
