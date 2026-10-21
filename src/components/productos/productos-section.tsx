"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Package } from "lucide-react";
import { ProductoForm } from "@/components/productos/producto-form";
import { ProductosTable } from "@/components/productos/productos-table";
import { useToast } from "@/hooks/use-toast";
import type {
  Categoria,
  Iva,
  ProductoConRelaciones,
  SeccionApp,
  Unidad,
} from "@/lib/types";

type ProductosSectionProps = {
  onIrA: (seccion: SeccionApp) => void;
};

export function ProductosSection({ onIrA }: ProductosSectionProps) {
  const { toast } = useToast();
  const [productos, setProductos] = useState<ProductoConRelaciones[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductoConRelaciones | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [productosRes, unidadesRes, categoriasRes, ivasRes] =
        await Promise.all([
          fetch("/api/productos", { cache: "no-store" }),
          fetch("/api/unidades", { cache: "no-store" }),
          fetch("/api/categorias", { cache: "no-store" }),
          fetch("/api/ivas", { cache: "no-store" }),
        ]);

      if (
        !productosRes.ok ||
        !unidadesRes.ok ||
        !categoriasRes.ok ||
        !ivasRes.ok
      ) {
        throw new Error("respuesta no válida");
      }

      const [productosData, unidadesData, categoriasData, ivasData] =
        await Promise.all([
          productosRes.json(),
          unidadesRes.json(),
          categoriasRes.json(),
          ivasRes.json(),
        ]);

      setProductos(Array.isArray(productosData) ? productosData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setIvas(Array.isArray(ivasData) ? ivasData : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description:
          "No fue posible obtener el catálogo de productos y sus catálogos auxiliares.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function handleEdit(producto: ProductoConRelaciones) {
    setEditing(producto);
    // En pantallas pequeñas, llevar la vista hacia el formulario de edición.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSaved() {
    setEditing(null);
    cargarDatos();
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de productos y servicios que alimentará los conceptos de
            sus presupuestos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div ref={formRef} className="xl:col-span-1">
          <ProductoForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
            unidades={unidades}
            categorias={categorias}
            ivas={ivas}
            cargandoCatalogos={loading}
            onIrA={onIrA}
          />
        </div>

        <div className="xl:col-span-2">
          <ProductosTable
            productos={productos}
            loading={loading}
            editing={editing}
            onEdit={handleEdit}
            onChanged={cargarDatos}
          />
        </div>
      </div>
    </div>
  );
}
