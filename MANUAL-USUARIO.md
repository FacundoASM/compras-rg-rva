import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { resolverPedido, repetirPedido } from "@/app/acciones";
import AccionConMotivo from "@/app/components/AccionConMotivo";
import EstadoPedido from "@/app/components/EstadoPedido";
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
        <p className="subtitulo">Acá seguís el estado de todo lo que pediste.</p>
        <div className="card">
          <p className="vacio">
            Todavía no cargaste ningún pedido.
            <br />
            <Link href="/pedidos/nuevo">Cargar el primero</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Mis pedidos</h2>
      <p className="subtitulo">
        {pedidos.length} pedido(s). Acá seguís el estado de cada uno.
      </p>

      <div className="pila">
        {pedidos.map((p: any) => (
          <div key={p.id} className="card">
            <div className="fila-titulo">
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {p.numero}{" "}
                  <span className={`badge ${p.estado}`}>{p.estado}</span>
                </p>
                <p className="chico tenue" style={{ margin: "3px 0 0" }}>
                  Cargado el {fecha(p.fecha)}
                  {p.fecha_aprobacion && ` · Resuelto el ${fecha(p.fecha_aprobacion)}`}
                  {p.fecha_entrega && ` · Entregado el ${fecha(p.fecha_entrega)}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {p.estado === "pendiente" && (
                  <Link href={`/pedidos/${p.id}/editar`}>Editar</Link>
                )}
                {(p.estado === "aprobado" || p.estado === "entregado") && (
                  <Link href={`/oc/${p.id}`}>Ver OC</Link>
                )}
                <form action={repetirPedido}>
                  <input type="hidden" name="pedido_id" value={p.id} />
                  <button
                    className="secondary"
                    title="Crea un pedido nuevo con los mismos ítems"
                  >
                    Repetir
                  </button>
                </form>
              </div>
            </div>

            <EstadoPedido estado={p.estado} />

            {p.motivo_resolucion && (
              <div
                className={`nota-motivo ${
                  ["rechazado", "cancelado"].includes(p.estado) ? "negativa" : ""
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
                  <th className="der" style={{ width: 66 }}>Cant.</th>
                  <th style={{ width: "24%" }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {p.items_pedido.map((it: any) => (
                  <tr key={it.id}>
                    <td data-col="Artículo">{it.descripcion}</td>
                    <td data-col="Categoría" className="tenue chico">
                      {categoria(it)}
                    </td>
                    <td data-col="Cantidad" className="der">{it.cantidad}</td>
                    <td data-col="Observaciones" className="tenue">
                      {it.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {p.estado === "pendiente" && (
              <div className="acciones">
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

            {p.estado === "aprobado" && (
              <p className="chico tenue" style={{ margin: "14px 0 0" }}>
                Ya tiene orden de compra emitida. Si hay que darlo de baja,
                pedíselo a compras o a quien aprueba.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fecha(f: string) {
  return new Date(f).toLocaleDateString("es-AR");
}

function categoria(it: any) {
  return it.subcategorias
    ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
    : "Sin categoría";
}
