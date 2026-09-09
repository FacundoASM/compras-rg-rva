import { createClient } from "@/lib/supabase/server";

export default async function OCPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, perfiles!pedidos_solicitante_id_fkey(nombre), items_pedido(*)")
    .eq("id", params.id)
    .single();

  if (!pedido) return <p>Pedido no encontrado.</p>;

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 16 }}>Orden de compra</p>
            <p style={{ margin: "2px 0 0", fontFamily: "monospace", fontSize: 13, color: "var(--muted)" }}>
              OC-{pedido.numero.replace("PED-", "")} · de {pedido.numero}
            </p>
          </div>
          <button className="secondary no-print" onClick={undefined} style={{ display: "none" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            <span style={{ color: "var(--muted)" }}>Fecha:</span>{" "}
            {new Date(pedido.fecha).toLocaleDateString("es-AR")}
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: "var(--muted)" }}>Área:</span> {pedido.area}
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: "var(--muted)" }}>Solicitante:</span> {pedido.perfiles?.nombre}
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: "var(--muted)" }}>Estado:</span>{" "}
            <span className={`badge ${pedido.estado}`}>{pedido.estado}</span>
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {pedido.items_pedido.map((it: any) => (
              <tr key={it.id}>
                <td>{it.descripcion}</td>
                <td>{it.cantidad}</td>
                <td>{it.observaciones || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 40 }}>
          <div style={{ borderTop: "1px solid var(--muted)", paddingTop: 6, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
            Firma solicitante
          </div>
          <div style={{ borderTop: "1px solid var(--muted)", paddingTop: 6, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
            Firma aprobación
          </div>
        </div>
      </div>
    </div>
  );
}
