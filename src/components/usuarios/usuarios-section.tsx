"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import { useToast } from "@/hooks/use-toast";
import type { SesionActiva, Usuario } from "@/lib/types";

type UsuariosSectionProps = {
  usuarioActual: SesionActiva;
};

export function UsuariosSection({ usuarioActual }: UsuariosSectionProps) {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Usuario | null>(null);
  // El formulario permanece oculto hasta que se presione "Nuevo"
  // o se edite un registro; al inicio solo se muestra la tabla.
  const [formVisible, setFormVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const enfocarFormulario = useRef(false);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/usuarios", { cache: "no-store" });
      if (!response.ok) throw new Error("respuesta no válida");
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No fue posible obtener la lista de usuarios.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

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

  function handleEdit(usuario: Usuario) {
    setEditing(usuario);
    abrirFormulario();
  }

  function handleSaved() {
    setEditing(null);
    setFormVisible(false);
    cargarUsuarios();
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
            <UserCog className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Cuentas con acceso a la aplicación, sus roles y estado. Solo los
              administradores pueden gestionarlas.
            </p>
          </div>
        </div>
        {!formVisible && (
          <Button onClick={handleNuevo} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo usuario
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
            <UsuarioForm
              editing={editing}
              onSaved={handleSaved}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        )}

        <div className={formVisible ? "xl:col-span-3" : undefined}>
          <UsuariosTable
            usuarios={usuarios}
            loading={loading}
            editing={editing}
            usuarioActual={usuarioActual}
            onEdit={handleEdit}
            onChanged={cargarUsuarios}
          />
        </div>
      </div>
    </div>
  );
}
