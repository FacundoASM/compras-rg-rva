"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearPedido } from "@/app/acciones";
import SelectorCategoria, {
  type Categoria,
  type Subcategoria,
} from "@/app/components/SelectorCategoria";

type Item = {
  descripcion: string;
  cantidad: number;
  observaciones: string;
  subcategoria_id: string;
  etiqueta: string;
};

export default function FormularioPedido({
  categorias,
  subcategorias,
}: {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function etiquetaDe(subId: string) {
    const sub = subcategorias.find((s) => s.id === subId);
    if (!sub) return "Sin categoría";
    const cat = categorias.find((c) => c.id === sub.categoria_id);
    return `${cat?.nombre ?? ""} › ${sub.nombre}`;
  }

  function agregarItem() {
    if (!descripcion.trim()) {
      setError("Ingresá una descripción");
      return;
    }
    if (cantidad < 1) {
      setError("La cantidad debe ser al menos 1");
      return;
    }
    setError("");
    setItems([
      ...items,
      {
        descripcion: descripcion.trim(),
        cantidad,
        observaciones: observaciones.trim(),
        subcategoria_id: subcategoriaId,
        etiqueta: etiquetaDe(subcategoriaId),
      },
    ]);
    setDescripcion("");
    setCantidad(1);
    setObservaciones("");
  }

  async function enviarPedido() {
    if (items.length === 0) {
      setError("Agregá al menos un ítem antes de enviar");
      return;
    }
    setError("");
    setEnviando(true);

    // El pedido se crea del lado del servidor: la sesión se valida ahí,
    // así no se pierde al navegar después de enviar.
    const res = await crearPedido({
      items: items.map((it) => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        observaciones: it.observaciones,
        subcategoria_id: it.subcategoria_id,
      })),
    });

    setEnviando(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    setItems([]);
    router.push("/mis-pedidos");
    router.refresh();
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
          <div>
            <label>Descripción</label>
            <input
              placeholder="Qué se necesita comprar"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div>
            <label>Cantidad</label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
            />
          </div>
        </div>

        <SelectorCategoria
          categorias={categorias}
          subcategorias={subcategorias}
          valor={subcategoriaId}
          onChange={setSubcategoriaId}
        />

        <label>Observaciones</label>
        <textarea
          rows={2}
          placeholder="Detalles, proveedor sugerido, urgencia"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        {error && (
          <p className="error-login" style={{ marginTop: -4 }}>
            {error}
          </p>
        )}

        <button type="button" className="secondary" onClick={agregarItem}>
          Agregar ítem
        </button>
      </div>

      {items.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>Ítems del pedido</h2>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style={{ width: "28%" }}>Categoría</th>
                  <th className="der" style={{ width: 70 }}>Cant.</th>
                  <th style={{ width: "22%" }}>Observaciones</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td data-col="Artículo">{it.descripcion}</td>
                    <td data-col="Categoría" className="tenue chico">
                      {it.etiqueta}
                    </td>
                    <td data-col="Cantidad" className="der">{it.cantidad}</td>
                    <td data-col="Observaciones" className="tenue">
                      {it.observaciones || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setItems(items.filter((_, x) => x !== i))}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            style={{ marginTop: 20 }}
            disabled={enviando}
            onClick={enviarPedido}
          >
            {enviando ? "Enviando..." : "Enviar pedido"}
          </button>
        </>
      )}
    </div>
  );
}
