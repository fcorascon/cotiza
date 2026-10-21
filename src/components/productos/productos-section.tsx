"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // El formulario permanece oculto hasta que se presione "Nuevo"
  // o se edite un registro; al inicio solo se muestra la tabla.
  const [formVisible, setFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const enfocarFormulario = useRef(false);

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

  function handleEdit(producto: ProductoConRelaciones) {
    setEditing(producto);
    abrirFormulario();
  }

  function handleSaved() {
    setEditing(null);
    setFormVisible(false);
    cargarDatos();
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
        {!formVisible && (
          <Button onClick={handleNuevo} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Button>
        )}
      </div>

      <div
        className={
          formVisible
            ? "grid grid-cols-1 items-start gap-6 2xl:grid-cols-3"
            : undefined
        }
      >
        {formVisible && (
          <div ref={formRef} className="2xl:col-span-1">
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
        )}

        <div className={formVisible ? "2xl:col-span-2" : undefined}>
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
