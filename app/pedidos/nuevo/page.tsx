"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = { descripcion: string; cantidad: number; observaciones: string };

export default function NuevoPedidoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function agregarItem() {
    if (!descripcion.trim()) {
      setError("Ingresá una descripción antes de agregar el ítem");
      return;
    }
    setError("");
    setItems([...items, { descripcion, cantidad, observaciones }]);
    setDescripcion("");
    setCantidad(1);
    setObservaciones("");
  }

  function quitarItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function enviarPedido() {
    if (items.length === 0) {
      setError("Agregá al menos un ítem antes de enviar el pedido");
      return;
    }
    setError("");
    setEnviando(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("area")
      .eq("id", auth.user!.id)
      .single();

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .insert({ solicitante_id: auth.user!.id, area: perfil?.area ?? "" })
      .select()
      .single();

    if (errPedido || !pedido) {
      setError(errPedido?.message ?? "No se pudo crear el pedido");
      setEnviando(false);
      return;
    }

    const { error: errItems } = await supabase.from("items_pedido").insert(
      items.map((it) => ({ ...it, pedido_id: pedido.id }))
    );

    if (errItems) {
      setError(errItems.message);
      setEnviando(false);
      return;
    }

    setMensaje(`Pedido ${pedido.numero} enviado`);
    setItems([]);
    setEnviando(false);
  }

  return (
    <div>
      <div className="card">
        <p style={{ fontWeight: 500, marginBottom: 16 }}>Datos del pedido</p>
        <label>Descripción</label>
        <input
          placeholder="Qué se necesita comprar"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <label>Cantidad</label>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
        />
        <label>Observaciones</label>
        <textarea
          rows={2}
          placeholder="Detalles adicionales, proveedor sugerido, urgencia"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
        {error && (
          <p style={{ color: "var(--danger-txt)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button type="button" className="secondary" onClick={agregarItem}>
          Agregar ítem
        </button>
      </div>

      {items.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "20px 0 8px" }}>
            Ítems del pedido
          </p>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.descripcion}</td>
                  <td>{it.cantidad}</td>
                  <td>{it.observaciones || "—"}</td>
                  <td>
                    <button className="secondary" onClick={() => quitarItem(i)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {mensaje && (
        <p style={{ color: "var(--success-txt)", marginTop: 16 }}>{mensaje}</p>
      )}

      <button style={{ marginTop: 20 }} disabled={enviando} onClick={enviarPedido}>
        {enviando ? "Enviando..." : "Enviar pedido"}
      </button>
    </div>
  );
}
