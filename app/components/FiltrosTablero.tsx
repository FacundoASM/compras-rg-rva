"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODOS = [
  { valor: "3", texto: "Últimos 3 meses" },
  { valor: "6", texto: "Últimos 6 meses" },
  { valor: "12", texto: "Últimos 12 meses" },
  { valor: "todo", texto: "Todo el historial" },
];

export default function FiltrosTablero({
  areas,
  categorias,
}: {
  areas: string[];
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function aplicar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    const query = nuevos.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  const hayFiltros = ["periodo", "area", "categoria"].some((k) =>
    params.get(k)
  );

  return (
    <div className="filtros no-print">
      <div className="filtros-fila">
        <div style={{ flex: "1 1 170px" }}>
          <label>Período</label>
          <select
            value={params.get("periodo") ?? "6"}
            onChange={(e) => aplicar("periodo", e.target.value)}
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.texto}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 150px" }}>
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

        <div style={{ flex: "1 1 170px" }}>
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

        <div
          style={{
            flex: "0 1 auto",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          {hayFiltros && (
            <button
              type="button"
              className="secondary"
              onClick={() => router.push("/dashboard")}
              style={{ marginBottom: 14 }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
