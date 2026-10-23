"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Configuracion } from "@/lib/types";

/**
 * Proveedor global de apariencia: carga la Configuración del sistema
 * y aplica a TODA la aplicación el color primario (variables CSS del
 * tema) y el logotipo (favicon). Las secciones consumen el contexto
 * para mostrar el logotipo y el nombre de la empresa.
 */

type ContextoApariencia = {
  configuracion: Configuracion | null;
  /** Reemplaza la configuración en memoria (tras guardar en Configuración). */
  actualizar: (config: Configuracion) => void;
};

const Contexto = createContext<ContextoApariencia>({
  configuracion: null,
  actualizar: () => {},
});

/** Luminancia relativa aproximada (0 = oscuro, 1 = claro). */
function luminancia(hex: string): number {
  const limpio = hex.replace("#", "");
  if (limpio.length !== 6) return 0;
  const r = parseInt(limpio.slice(0, 2), 16) / 255;
  const g = parseInt(limpio.slice(2, 4), 16) / 255;
  const b = parseInt(limpio.slice(4, 6), 16) / 255;
  const canal = (valor: number) =>
    valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Texto legible sobre el color primario (botones, menú activo). */
function colorTextoSobre(hex: string): string {
  return luminancia(hex) > 0.4 ? "#111827" : "#ffffff";
}

export function ConfiguracionAplicacionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(
    null
  );

  const actualizar = useCallback((config: Configuracion) => {
    setConfiguracion(config);
  }, []);

  useEffect(() => {
    let cancelada = false;
    (async () => {
      try {
        // Versión básica: solo identidad (nombre, logotipo y color).
        // Evita transportar en cada arranque los logotipos de documentos
        // y la configuración SMTP completa.
        const response = await fetch("/api/configuracion?basico=1", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: Configuracion = await response.json();
        if (!cancelada) setConfiguracion(data);
      } catch {
        // Sin configuración se conservan los valores por defecto del tema.
      }
    })();
    return () => {
      cancelada = true;
    };
  }, []);

  /*
   * Aplica el color primario a las variables del tema (misma lista de
   * variables que globals.css pinta con #191970). El <style> se inyecta
   * después de la hoja global, por lo que sus valores prevalecen.
   */
  useEffect(() => {
    if (!configuracion?.colorPrimario) return;
    const color = configuracion.colorPrimario;

    let estilo = document.getElementById(
      "tema-aplicacion"
    ) as HTMLStyleElement | null;
    if (!estilo) {
      estilo = document.createElement("style");
      estilo.id = "tema-aplicacion";
      document.head.appendChild(estilo);
    }
    estilo.textContent = `:root {
      --primary: ${color};
      --foreground: ${color};
      --card-foreground: ${color};
      --popover-foreground: ${color};
      --secondary-foreground: ${color};
      --accent-foreground: ${color};
      --ring: ${color};
      --sidebar-foreground: ${color};
      --sidebar-primary: ${color};
      --sidebar-ring: ${color};
      --primary-foreground: ${colorTextoSobre(color)};
    }`;
  }, [configuracion?.colorPrimario]);

  /* El logotipo principal se usa también como favicon. */
  useEffect(() => {
    if (!configuracion?.logo) return;
    let enlace = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"]'
    );
    if (!enlace) {
      enlace = document.createElement("link");
      enlace.rel = "icon";
      document.head.appendChild(enlace);
    }
    enlace.href = configuracion.logo;
  }, [configuracion?.logo]);

  const valor = useMemo(
    () => ({ configuracion, actualizar }),
    [configuracion, actualizar]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Acceso al contexto de apariencia (configuración + actualizar). */
export function useConfiguracionAplicacion() {
  return useContext(Contexto);
}
