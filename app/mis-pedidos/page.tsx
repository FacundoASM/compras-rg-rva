import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { resolverPedido } from "@/app/acciones";
import AccionConMotivo from "@/app/components/AccionConMotivo";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const perfil = await getPerfilActual();
  const supabase = createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, items_pedido(*, subcategorias(nombre, categorias(nombre)))")
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
            <div className="fila-titulo">
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {p.numero}{" "}
                  <span className={`badge ${p.estado}`}>{p.estado}</span>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Cargado el {new Date(p.fecha).toLocaleDateString("es-AR")}
                  {p.fecha_aprobacion &&
                    ` · Resuelto el ${new Date(p.fecha_aprobacion).toLocaleDateString("es-AR")}`}
                  {p.fecha_entrega &&
                    ` · Entregado el ${new Date(p.fecha_entrega).toLocaleDateString("es-AR")}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.estado === "pendiente" && (
                  <Link href={`/pedidos/${p.id}/editar`}>Editar</Link>
                )}
                {(p.estado === "aprobado" || p.estado === "entregado") && (
                  <Link href={`/oc/${p.id}`}>Ver orden de compra</Link>
                )}
              </div>
            </div>

            {p.motivo_resolucion && (
              <div
                className={`nota-motivo ${
                  p.estado === "rechazado" || p.estado === "cancelado"
                    ? "negativa"
                    : ""
                }`}
              >
                <strong>Motivo:</strong> {p.motivo_resolucion}
              </div>
            )}

            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style={{ width: "26%" }}>Categoría</th>
                  <th style={{ width: 70, textAlign: "right" }}>Cant.</th>
                  <th style={{ width: "24%" }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {p.items_pedido.map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.descripcion}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>
                      {it.subcategorias
                        ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                        : "Sin categoría"}
                    </td>
                    <td style={{ textAlign: "right" }}>{it.cantidad}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {it.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(p.estado === "pendiente" || p.estado === "aprobado") && (
              <div style={{ marginTop: 14 }}>
                <AccionConMotivo
                  accion={resolverPedido}
                  pedidoId={p.id}
                  decision="cancelado"
                  etiqueta="Cancelar pedido"
                  clase="rechazar"
                  titulo="¿Por qué cancelás este pedido?"
                  motivoObligatorio={false}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
