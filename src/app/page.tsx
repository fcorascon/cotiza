"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { useToast } from "@/hooks/use-toast";
import type { Cliente } from "@/lib/types";

function SeccionClientes() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarClientes = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  function handleEdit(cliente: Cliente) {
    setEditing(cliente);
    // En pantallas pequeñas, llevar la vista hacia el formulario de edición.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSaved() {
    setEditing(null);
    cargarClientes();
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Users className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Registre y administre la información fiscal y de contacto de sus
            clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div ref={formRef} className="xl:col-span-2">
          <ClienteForm
            editing={editing}
            onSaved={handleSaved}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        <div className="xl:col-span-3">
          <ClientesTable
            clientes={clientes}
            loading={loading}
            editing={editing}
            onEdit={handleEdit}
            onChanged={cargarClientes}
          />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <SeccionClientes />
    </AppShell>
  );
}
