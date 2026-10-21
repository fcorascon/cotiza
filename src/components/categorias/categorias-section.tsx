"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoriaForm } from "@/components/categorias/categoria-form";
import { CategoriasTable } from "@/components/categorias/categorias-table";
import { useToast } from "@/hooks/use-toast";
import type { Categoria } from "@/lib/types";

export function CategoriasSection() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Categoria | null>(null);
  // El formulario permanece oculto hasta que se presione "Nuevo"
  // o se edite un registro; al inicio solo se muestra la tabla.
  const [formVisible, setFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const enfocarFormulario = useRef(false);

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

  function handleEdit(categoria: Categoria) {
    setEditing(categoria);
    abrirFormulario();
  }

  function handleSaved() {
    setEditing(null);
    setFormVisible(false);
    cargarCategorias();
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
            <Tags className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo de categorías disponible para clasificar los conceptos
              de sus presupuestos.
            </p>
          </div>
        </div>
        {!formVisible && (
          <Button onClick={handleNuevo} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nueva categoría
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
            <CategoriaForm
              editing={editing}
              onSaved={handleSaved}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        )}

        <div className={formVisible ? "xl:col-span-3" : undefined}>
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
