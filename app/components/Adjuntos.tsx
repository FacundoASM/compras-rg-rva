"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarAdjunto, eliminarAdjunto, enlaceAdjunto } from "@/app/acciones";

type Adjunto = {
  id: string;
  nombre_archivo: string;
  ruta: string;
  tipo: string | null;
  tamano: number | null;
  creado_en: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export default function Adjuntos({
  pedidoId,
  adjuntos,
  puedeSubir,
}: {
  pedidoId: string;
  adjuntos: Adjunto[];
  puedeSubir: boolean;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (archivo.size > MAX_BYTES) {
      setError("El archivo supera los 10 MB");
      if (entrada.current) entrada.current.value = "";
      return;
    }

    setError("");
    setSubiendo(true);

    const supabase = createClient();
    const extension = archivo.name.split(".").pop() ?? "dat";
    const ruta = `${pedidoId}/${crypto.randomUUID()}.${extension}`;

    const { error: errSubida } = await supabase.storage
      .from("adjuntos")
      .upload(ruta, archivo, { contentType: archivo.type });

    if (errSubida) {
      setSubiendo(false);
      setError(
        errSubida.message.includes("mime")
          ? "Tipo de archivo no permitido. Se aceptan PDF, imágenes, Word y Excel."
          : "No se pudo subir el archivo"
      );
      if (entrada.current) entrada.current.value = "";
      return;
    }

    const res = await registrarAdjunto({
      pedidoId,
      nombreArchivo: archivo.name,
      ruta,
      tipo: archivo.type,
      tamano: archivo.size,
    });

    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";

    if (res?.error) {
      setError(res.error);
      await supabase.storage.from("adjuntos").remove([ruta]);
      return;
    }

    router.refresh();
  }

  async function abrir(ruta: string) {
    const res = await enlaceAdjunto(ruta);
    if (res.url) window.open(res.url, "_blank", "noopener");
    else setError("No se pudo abrir el archivo");
  }

  if (!puedeSubir && adjuntos.length === 0) return null;

  return (
    <div className="adjuntos no-print">
      <p className="adjuntos-titulo">
        Archivos adjuntos {adjuntos.length > 0 && `(${adjuntos.length})`}
      </p>

      {adjuntos.length > 0 && (
        <ul className="lista-adjuntos">
          {adjuntos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="enlace"
                onClick={() => abrir(a.ruta)}
                title="Abrir en una pestaña nueva"
              >
                {a.nombre_archivo}
              </button>
              <span className="tenue chico">{peso(a.tamano)}</span>
              {puedeSubir && (
                <form action={eliminarAdjunto}>
                  <input type="hidden" name="adjunto_id" value={a.id} />
                  <input type="hidden" name="ruta" value={a.ruta} />
                  <button className="quitar-adjunto" title="Eliminar">
                    ×
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeSubir && (
        <>
          <label className="boton-archivo">
            {subiendo ? "Subiendo..." : "+ Adjuntar cotización o documento"}
            <input
              ref={entrada}
              type="file"
              onChange={subir}
              disabled={subiendo}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xlsx,.xls,.doc,.docx"
            />
          </label>
          <p className="tenue chico" style={{ margin: "4px 0 0" }}>
            PDF, imágenes, Word o Excel. Hasta 10 MB por archivo.
          </p>
        </>
      )}

      {error && (
        <p style={{ color: "var(--mal-tx)", fontSize: 13, margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function peso(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
