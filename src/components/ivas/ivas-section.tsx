"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Percent } from "lucide-react";
import { IvaForm } from "@/components/ivas/iva-form";
import { IvasTable } from "@/components/ivas/ivas-table";
import { useToast } from "@/hooks/use-toast";
import type { Iva } from "@/lib/types";

export function IvasSection() {
  const { toast } = useToast();
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Iva | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarIvas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ivas", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setIvas(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener el catálogo de tasas de IVA.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarIvas();
  }, [cargarIvas]);

  function handleEdit(iva: Iva) {
    setEditing(iva);
    // En pantallas pequeñas, llevar la vista hacia el formulario de edición.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSaved() {
    setEditing(null);
    cargarIvas();
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Percent className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IVA</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de tasas de IVA disponibles para aplicar a los conceptos de
            sus presupuestos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div ref={formRef} className="xl:col-span-2">
          <IvaForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        <div className="xl:col-span-3">
          <IvasTable
            ivas={ivas}
            loading={loading}
            editing={editing}
            onEdit={handleEdit}
            onChanged={cargarIvas}
          />
        </div>
      </div>
    </div>
  );
}
