"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tags } from "lucide-react";
import { CategoriaForm } from "@/components/categorias/categoria-form";
import { CategoriasTable } from "@/components/categorias/categorias-table";
import { useToast } from "@/hooks/use-toast";
import type { Categoria } from "@/lib/types";

export function CategoriasSection() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/categorias", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener el catálogo de categorías.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  function handleEdit(categoria: Categoria) {
    setEditing(categoria);
    // En pantallas pequeñas, llevar la vista hacia el formulario de edición.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSaved() {
    setEditing(null);
    cargarCategorias();
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Tags className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de categorías disponible para clasificar los conceptos de
            sus presupuestos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div ref={formRef} className="xl:col-span-2">
          <CategoriaForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        <div className="xl:col-span-3">
          <CategoriasTable
            categorias={categorias}
            loading={loading}
            editing={editing}
            onEdit={handleEdit}
            onChanged={cargarCategorias}
          />
        </div>
      </div>
    </div>
  );
}
