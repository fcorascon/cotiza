"use client";

import { useState } from "react";
import {
  Calculator,
  ClipboardList,
  Menu,
  Package,
  Percent,
  ReceiptText,
  Ruler,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  useConfiguracionAplicacion,
} from "@/components/configuracion-aplicacion";
import type { SeccionApp } from "@/lib/types";

type NavItem = {
  id: SeccionApp;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const NAV_ITEMS: (NavItem | { id: null; label: string; icon: React.ComponentType<{ className?: string }>; enabled: false })[] = [
  { id: "clientes", label: "Clientes", icon: Users, enabled: true },
  {
    id: "presupuestos",
    label: "Presupuestos",
    icon: ReceiptText,
    enabled: true,
  },
  { id: "unidades", label: "Unidades", icon: Ruler, enabled: true },
  { id: "categorias", label: "Categorías", icon: Tags, enabled: true },
  { id: "ivas", label: "IVA", icon: Percent, enabled: true },
  { id: "productos", label: "Productos", icon: Package, enabled: true },
  { id: "configuracion", label: "Configuración", icon: Settings, enabled: true },
];

function NavContent({
  active,
  onSelect,
}: {
  active: SeccionApp;
  onSelect: (seccion: SeccionApp) => void;
}) {
  const { configuracion } = useConfiguracionAplicacion();
  const nombreEmpresa = configuracion?.nombreComercial || "Admin de Presupuestos";
  const logotipo = configuracion?.logo ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        {logotipo ? (
          <img
            src={logotipo}
            alt={`Logotipo de ${nombreEmpresa}`}
            className="h-10 w-10 shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight" title={nombreEmpresa}>
            {nombreEmpresa}
          </p>
          <p className="text-xs text-muted-foreground">Gestión comercial</p>
        </div>
      </div>

      <nav
        className="flex-1 space-y-1 px-3"
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (!item.enabled || item.id === null) {
            return (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
                aria-disabled="true"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-normal"
                >
                  Próximamente
                </Badge>
              </span>
            );
          }

          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id as SeccionApp)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t px-5 py-4">
        <p className="text-xs text-muted-foreground">
          Versión 1.7 · Clientes · Presupuestos · Unidades · Categorías · IVA · Productos · Configuración
        </p>
      </div>
    </div>
  );
}

type AppShellProps = {
  active: SeccionApp;
  onNavigate: (seccion: SeccionApp) => void;
  children: React.ReactNode;
};

export function AppShell({ active, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { configuracion } = useConfiguracionAplicacion();
  const nombreEmpresa = configuracion?.nombreComercial || "Admin de Presupuestos";
  const logotipo = configuracion?.logo ?? null;

  function handleSelect(seccion: SeccionApp) {
    onNavigate(seccion);
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar text-sidebar-foreground lg:block">
        <NavContent active={active} onSelect={handleSelect} />
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        {/* Encabezado (móvil) */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <SheetDescription className="sr-only">
                Navegación entre las secciones de la aplicación
              </SheetDescription>
              <NavContent active={active} onSelect={handleSelect} />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 items-center gap-2">
            {logotipo ? (
              <img
                src={logotipo}
                alt={`Logotipo de ${nombreEmpresa}`}
                className="h-7 w-7 shrink-0 object-contain"
              />
            ) : (
              <ClipboardList
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
            )}
            <span className="truncate text-sm font-semibold">
              {nombreEmpresa}
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-auto border-t bg-background py-3 text-center text-xs text-muted-foreground">
          Administrador de Presupuestos
        </footer>
      </div>
    </div>
  );
}
