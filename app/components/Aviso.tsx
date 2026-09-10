"use client";

import { useEffect, useState } from "react";
import type { Flash } from "@/lib/flash";

export default function Aviso({ flash }: { flash: Flash | null }) {
  const [visible, setVisible] = useState(false);
  const [contenido, setContenido] = useState<Flash | null>(null);

  useEffect(() => {
    if (!flash) return;
    setContenido(flash);
    setVisible(true);
    // consumir la cookie para que no reaparezca al navegar
    document.cookie = "flash=; path=/; max-age=0";
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!contenido) return null;

  return (
    <div
      className={`aviso-toast ${contenido.tipo} ${visible ? "visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="aviso-icono" aria-hidden="true">
        {contenido.tipo === "error" ? "!" : "✓"}
      </span>
      <span>{contenido.texto}</span>
      <button
        className="aviso-cerrar"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>
  );
}
