"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ruler } from "lucide-react";
import { UnidadForm } from "@/components/unidades/unidad-form";
import { UnidadesTable } from "@/components/unidades/unidades-table";
import { useToast } from "@/hooks/use-toast";
import type { Unidad } from "@/lib/types";

export function UnidadesSection() {
  const { toast } = useToast();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Unidad | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

  function handleEdit(unidad: Unidad) {
    setEditing(unidad);
    // En pantallas pequeñas, llevar la vista hacia el formulario de edición.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSaved() {
    setEditing(null);
    cargarUnidades();
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Ruler className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de unidades de medida disponible para los conceptos de sus
            presupuestos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div ref={formRef} className="xl:col-span-2">
          <UnidadForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        <div className="xl:col-span-3">
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
