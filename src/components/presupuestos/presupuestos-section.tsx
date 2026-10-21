"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReceiptText } from "lucide-react";
import { PresupuestoForm } from "@/components/presupuestos/presupuesto-form";
import { PresupuestosTable } from "@/components/presupuestos/presupuestos-table";
import { useToast } from "@/hooks/use-toast";
import type {
  Cliente,
  Presupuesto,
  ProductoConRelaciones,
  SeccionApp,
} from "@/lib/types";

type PresupuestosSectionProps = {
  onIrA: (seccion: SeccionApp) => void;
};

export function PresupuestosSection({ onIrA }: PresupuestosSectionProps) {
  const { toast } = useToast();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<ProductoConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [presupuestosRes, clientesRes, productosRes] = await Promise.all([
        fetch("/api/presupuestos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/productos", { cache: "no-store" }),
      ]);

      if (!presupuestosRes.ok || !clientesRes.ok || !productosRes.ok) {
        throw new Error("respuesta no válida");
      }

      const [presupuestosData, clientesData, productosData] =
        await Promise.all([
          presupuestosRes.json(),
          clientesRes.json(),
          productosRes.json(),
        ]);

      setPresupuestos(Array.isArray(presupuestosData) ? presupuestosData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setProductos(Array.isArray(productosData) ? productosData : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description:
          "No fue posible obtener los presupuestos, clientes y productos.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function handleEdit(presupuesto: Presupuesto) {
    setEditing(presupuesto);
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
          <ReceiptText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Cotizaciones por cliente con productos del catálogo, IVA y totales
            calculados automáticamente.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div ref={formRef}>
          <PresupuestoForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
            clientes={clientes}
            productos={productos}
            cargandoCatalogos={loading}
            onIrA={onIrA}
          />
        </div>

        <PresupuestosTable
          presupuestos={presupuestos}
          loading={loading}
          editing={editing}
          onEdit={handleEdit}
          onChanged={cargarDatos}
        />
      </div>
    </div>
  );
}
