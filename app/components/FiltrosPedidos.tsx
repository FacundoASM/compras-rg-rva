"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosPedidos({
  areas,
  categorias,
}: {
  areas: string[];
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [texto, setTexto] = useState(params.get("q") ?? "");

  function aplicar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    router.push(`/aprobacion?${nuevos.toString()}`);
  }

  // buscador con retardo, para no navegar en cada tecla
  useEffect(() => {
    const actual = params.get("q") ?? "";
    if (texto === actual) return;
    const t = setTimeout(() => aplicar("q", texto), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const hayFiltros = ["q", "estado", "area", "categoria", "desde", "hasta"].some(
    (k) => params.get(k)
  );

  return (
    <div className="filtros no-print">
      <div className="filtros-fila">
        <div style={{ flex: "2 1 220px" }}>
          <label>Buscar</label>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Número, artículo o solicitante"
          />
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label>Estado</label>
          <select
            value={params.get("estado") ?? ""}
            onChange={(e) => aplicar("estado", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="entregado">Entregado</option>
            <option value="rechazado">Rechazado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label>Área</label>
          <select
            value={params.get("area") ?? ""}
            onChange={(e) => aplicar("area", e.target.value)}
          >
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 160px" }}>
          <label>Categoría</label>
          <select
            value={params.get("categoria") ?? ""}
            onChange={(e) => aplicar("categoria", e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filtros-fila">
        <div style={{ flex: "1 1 140px" }}>
          <label>Desde</label>
          <input
            type="date"
            value={params.get("desde") ?? ""}
            onChange={(e) => aplicar("desde", e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label>Hasta</label>
          <input
            type="date"
            value={params.get("hasta") ?? ""}
            onChange={(e) => aplicar("hasta", e.target.value)}
          />
        </div>
        <div style={{ flex: "2 1 200px", display: "flex", alignItems: "flex-end" }}>
          {hayFiltros && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setTexto("");
                router.push("/aprobacion");
              }}
              style={{ marginBottom: 14 }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
