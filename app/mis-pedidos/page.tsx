import { createClient, getPerfilActual } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const perfil = await getPerfilActual();
  const supabase = createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, items_pedido(*)")
    .eq("solicitante_id", perfil?.id ?? "")
    .order("creado_en", { ascending: false });

  if (!pedidos || pedidos.length === 0) {
    return (
      <div>
        <h2>Mis pedidos</h2>
        <div className="card">
          <p className="vacio">
            Todavía no cargaste ningún pedido.{" "}
            <Link href="/pedidos/nuevo">Cargar el primero</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Mis pedidos</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pedidos.map((p: any) => (
          <div key={p.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {p.numero}{" "}
                  <span className={`badge ${p.estado}`}>{p.estado}</span>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Cargado el {new Date(p.fecha).toLocaleDateString("es-AR")}
                  {p.fecha_aprobacion &&
                    ` · ${p.estado === "aprobado" ? "Aprobado" : "Rechazado"} el ${new Date(
                      p.fecha_aprobacion
                    ).toLocaleDateString("es-AR")}`}
                </p>
              </div>
              {p.estado === "aprobado" && (
                <Link href={`/oc/${p.id}`}>Ver orden de compra</Link>
              )}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style={{ width: 70, textAlign: "right" }}>Cant.</th>
                  <th style={{ width: "35%" }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {p.items_pedido.map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.descripcion}</td>
                    <td style={{ textAlign: "right" }}>{it.cantidad}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {it.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
