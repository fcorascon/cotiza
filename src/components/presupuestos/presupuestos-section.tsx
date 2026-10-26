"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PresupuestoForm } from "@/components/presupuestos/presupuesto-form";
import { PresupuestosTable } from "@/components/presupuestos/presupuestos-table";
import {
  useConfiguracionAplicacion,
} from "@/components/configuracion-aplicacion";
import { useToast } from "@/hooks/use-toast";
import type {
  Cliente,
  Configuracion,
  Presupuesto,
  SeccionApp,
} from "@/lib/types";

type PresupuestosSectionProps = {
  onIrA: (seccion: SeccionApp) => void;
};

export function PresupuestosSection({ onIrA }: PresupuestosSectionProps) {
  const { toast } = useToast();
  const { configuracion } = useConfiguracionAplicacion();
  const [configuracionCompleta, setConfiguracionCompleta] =
    useState<Configuracion | null>(null);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  // El formulario permanece oculto hasta que se presione "Nuevo"
  // o se edite un registro; al inicio solo se muestra la tabla.
  const [formVisible, setFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const enfocarFormulario = useRef(false);

  /*
   * Carga perezosa: al entrar a la sección solo se piden los presupuestos
   * (la tabla). Los clientes se piden al abrir el formulario y la
   * configuración proviene del contexto global de la aplicación; los
   * productos los busca el propio formulario bajo demanda (combobox).
   */
  const cargarPresupuestos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/presupuestos", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setPresupuestos(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener los presupuestos.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cargarClientes = useCallback(async () => {
    setCargandoClientes(true);
    try {
      const response = await fetch("/api/clientes", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener la lista de clientes.",
      });
    } finally {
      setCargandoClientes(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarPresupuestos();
  }, [cargarPresupuestos]);

  useEffect(() => {
    let cancelada = false;
    (async () => {
      try {
        const response = await fetch("/api/configuracion", { cache: "no-store" });
        if (!response.ok) return;
        const data: Configuracion = await response.json();
        if (!cancelada) setConfiguracionCompleta(data);
      } catch {
        // Sin configuración completa se conserva la básica del contexto.
      }
    })();
    return () => {
      cancelada = true;
    };
  }, []);

  // Una vez montado el formulario, desplazar la vista hacia él.
  useEffect(() => {
    if (formVisible && enfocarFormulario.current) {
      enfocarFormulario.current = false;
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formVisible]);

  function abrirFormulario() {
    enfocarFormulario.current = true;
    setFormVisible(true);
    // El selector de clientes necesita el catálogo: se pide al abrir el
    // formulario (y se refresca en cada apertura para ver altas recientes).
    cargarClientes();
  }

  function handleNuevo() {
    setEditing(null);
    abrirFormulario();
  }

  function handleEdit(presupuesto: Presupuesto) {
    setEditing(presupuesto);
    abrirFormulario();
  }

  function handleSaved() {
    setEditing(null);
    setFormVisible(false);
    cargarPresupuestos();
  }

  function handleCancelEdit() {
    setEditing(null);
    setFormVisible(false);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
            <p className="text-sm text-muted-foreground">
              Cotizaciones por cliente con productos del catálogo, IVA y
              totales calculados automáticamente.
            </p>
          </div>
        </div>
        {!formVisible && (
          <Button onClick={handleNuevo} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo presupuesto
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {formVisible && (
          <div ref={formRef}>
            <PresupuestoForm
              editing={editing}
              onSaved={handleSaved}
              onCancelEdit={handleCancelEdit}
              clientes={clientes}
              cargandoCatalogos={cargandoClientes || loading}
              onIrA={onIrA}
            />
          </div>
        )}

        <PresupuestosTable
          presupuestos={presupuestos}
          loading={loading}
          editing={editing}
          configuracion={configuracionCompleta ?? configuracion}
          onEdit={handleEdit}
          onChanged={cargarPresupuestos}
        />
      </div>
    </div>
  );
}
