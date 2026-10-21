"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnidadForm } from "@/components/unidades/unidad-form";
import { UnidadesTable } from "@/components/unidades/unidades-table";
import { useToast } from "@/hooks/use-toast";
import type { Unidad } from "@/lib/types";

export function UnidadesSection() {
  const { toast } = useToast();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Unidad | null>(null);
  // El formulario permanece oculto hasta que se presione "Nuevo"
  // o se edite un registro; al inicio solo se muestra la tabla.
  const [formVisible, setFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const enfocarFormulario = useRef(false);

  const cargarUnidades = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/unidades", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setUnidades(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener el catálogo de unidades.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarUnidades();
  }, [cargarUnidades]);

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
  }

  function handleNuevo() {
    setEditing(null);
    abrirFormulario();
  }

  function handleEdit(unidad: Unidad) {
    setEditing(unidad);
    abrirFormulario();
  }

  function handleSaved() {
    setEditing(null);
    setFormVisible(false);
    cargarUnidades();
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
            <Ruler className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo de unidades de medida disponible para los conceptos de
              sus presupuestos.
            </p>
          </div>
        </div>
        {!formVisible && (
          <Button onClick={handleNuevo} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nueva unidad
          </Button>
        )}
      </div>

      <div
        className={
          formVisible
            ? "grid grid-cols-1 items-start gap-6 xl:grid-cols-5"
            : undefined
        }
      >
        {formVisible && (
          <div ref={formRef} className="xl:col-span-2">
            <UnidadForm
              editing={editing}
              onSaved={handleSaved}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        )}

        <div className={formVisible ? "xl:col-span-3" : undefined}>
          <UnidadesTable
            unidades={unidades}
            loading={loading}
            editing={editing}
            onEdit={handleEdit}
            onChanged={cargarUnidades}
          />
        </div>
      </div>
    </div>
  );
}
