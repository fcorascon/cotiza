"use client";

import { useRef } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type LogoUploadFieldProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

const MAX_BYTES = 1_500_000; // 1.5 MB

/**
 * Selector de logotipo: previsualización, carga por archivo (convertida
 * a data URL) y botón para quitar la imagen.
 */
export function LogoUploadField({
  value,
  onChange,
  disabled,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handleArchivo(archivo: File | undefined | null) {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Seleccione un archivo de imagen (PNG, JPG, SVG o WebP).",
      });
      return;
    }
    if (archivo.size > MAX_BYTES) {
      toast({
        variant: "destructive",
        title: "Imagen demasiado grande",
        description: "El logotipo no debe exceder 1.5 MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(archivo);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        <img
          src={value}
          alt="Logotipo actual"
          className="h-10 w-10 rounded border bg-white object-contain p-0.5"
        />
      ) : (
        <div
          className="flex h-10 w-10 items-center justify-center rounded border border-dashed text-muted-foreground"
          aria-hidden="true"
        >
          <ImagePlus className="h-4 w-4" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(event) => {
          handleArchivo(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Seleccionar archivo
      </Button>

      {value && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Quitar logotipo"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted-foreground">Logotipo cargado</span>
        </>
      )}
    </div>
  );
}
