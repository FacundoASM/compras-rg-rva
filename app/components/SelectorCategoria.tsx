"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Categoria = { id: string; nombre: string };
export type Subcategoria = { id: string; categoria_id: string; nombre: string };

export default function SelectorCategoria({
  categorias,
  subcategorias,
  valor,
  onChange,
}: {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  valor: string;
  onChange: (subcategoriaId: string) => void;
}) {
  const [cats, setCats] = useState(categorias);
  const [subs, setSubs] = useState(subcategorias);
  const [catId, setCatId] = useState("");
  const [creando, setCreando] = useState<"cat" | "sub" | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const subsDeCat = subs.filter((s) => s.categoria_id === catId);

  async function crear() {
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setError("Escribí un nombre");
      return;
    }
    setError("");
    setGuardando(true);
    const supabase = createClient();

    if (creando === "cat") {
      const { data, error } = await supabase
        .from("categorias")
        .insert({ nombre })
        .select()
        .single();
      setGuardando(false);
      if (error) {
        setError(
          error.message.includes("duplicate")
            ? "Esa categoría ya existe"
            : error.message
        );
        return;
      }
      setCats([...cats, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCatId(data.id);
      onChange("");
    } else {
      const { data, error } = await supabase
        .from("subcategorias")
        .insert({ nombre, categoria_id: catId })
        .select()
        .single();
      setGuardando(false);
      if (error) {
        setError(
          error.message.includes("duplicate")
            ? "Esa subcategoría ya existe en esta categoría"
            : error.message
        );
        return;
      }
      setSubs([...subs, data]);
      onChange(data.id);
    }

    setNombreNuevo("");
    setCreando(null);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>Categoría</label>
          <select
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              onChange("");
              setCreando(null);
            }}
          >
            <option value="">Elegir...</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Subcategoría</label>
          <select
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            disabled={!catId}
          >
            <option value="">{catId ? "Elegir..." : "Elegí categoría"}</option>
            {subsDeCat.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {creando === null ? (
        <div style={{ display: "flex", gap: 14, marginTop: -6, marginBottom: 14 }}>
          <button
            type="button"
            className="enlace"
            onClick={() => {
              setCreando("cat");
              setError("");
            }}
          >
            + Nueva categoría
          </button>
          {catId && (
            <button
              type="button"
              className="enlace"
              onClick={() => {
                setCreando("sub");
                setError("");
              }}
            >
              + Nueva subcategoría
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label>
            {creando === "cat"
              ? "Nombre de la nueva categoría"
              : `Nueva subcategoría en "${cats.find((c) => c.id === catId)?.nombre}"`}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder={
                creando === "cat" ? "Ej. Seguridad" : "Ej. Cables y conectores"
              }
              style={{ marginBottom: 0 }}
            />
            <button type="button" onClick={crear} disabled={guardando}>
              Crear
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setCreando(null);
                setNombreNuevo("");
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p style={{ color: "var(--danger-txt)", fontSize: 13, marginTop: 6 }}>
              {error}
            </p>
          )}
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Antes de crear una, fijate que no exista con otro nombre parecido.
          </p>
        </div>
      )}
    </div>
  );
}
