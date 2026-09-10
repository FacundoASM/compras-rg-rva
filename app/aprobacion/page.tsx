import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { resolverPedido, guardarCostoItem } from "@/app/acciones";
import AccionConMotivo from "@/app/components/AccionConMotivo";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ORDEN_ESTADOS = ["pendiente", "aprobado", "entregado"];

export default async function AprobacionPage() {
  const perfil = await getPerfilActual();
  const esAprobador =
    perfil?.rol === "aprobador" || perfil?.rol === "superusuario";
  const esCompras = perfil?.rol === "compras" || perfil?.rol === "superusuario";

  const supabase = createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "*, perfiles!pedidos_solicitante_id_fkey(nombre), items_pedido(*, subcategorias(nombre, categorias(nombre)))"
    )
    .order("creado_en", { ascending: false });

  const activos = (pedidos ?? []).filter((p: any) =>
    ORDEN_ESTADOS.slice(0, 2).includes(p.estado)
  );
  const cerrados = (pedidos ?? []).filter(
    (p: any) => !ORDEN_ESTADOS.slice(0, 2).includes(p.estado)
  );

  return (
    <div>
      <h2>Pedidos en curso</h2>
      {activos.length === 0 ? (
        <div className="card">
          <p className="vacio">No hay pedidos en curso.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activos.map((p: any) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
      )}

      {cerrados.length > 0 && (
        <>
          <h2 style={{ marginTop: 36 }}>Cerrados</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cerrados.map((p: any) => (
              <Tarjeta key={p.id} p={p} soloLectura />
            ))}
          </div>
        </>
      )}
    </div>
  );

  function Tarjeta({ p, soloLectura }: { p: any; soloLectura?: boolean }) {
    const unidades = p.items_pedido.reduce(
      (a: number, it: any) => a + Number(it.cantidad),
      0
    );
    const total = p.items_pedido.reduce(
      (a: number, it: any) =>
        a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
      0
    );
    const cargarCostos = esCompras && p.estado === "aprobado";

    return (
      <div className="card">
        <div className="fila-titulo">
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {p.numero} <span className={`badge ${p.estado}`}>{p.estado}</span>
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              {p.area} · {p.perfiles?.nombre} ·{" "}
              {new Date(p.fecha).toLocaleDateString("es-AR")} ·{" "}
              {p.items_pedido.length} ítem(s), {unidades} unidad(es)
              {total > 0 && ` · $${total.toLocaleString("es-AR")}`}
            </p>
          </div>
          {(p.estado === "aprobado" || p.estado === "entregado") && (
            <Link href={`/oc/${p.id}`}>Ver orden de compra</Link>
          )}
        </div>

        {p.motivo_resolucion && (
          <div
            className={`nota-motivo ${
              p.estado === "rechazado" || p.estado === "cancelado" ? "negativa" : ""
            }`}
          >
            <strong>Motivo:</strong> {p.motivo_resolucion}
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Descripción</th>
              <th style={{ width: "22%" }}>Categoría</th>
              <th style={{ width: 60, textAlign: "right" }}>Cant.</th>
              <th style={{ width: "20%" }}>Observaciones</th>
              {(cargarCostos || total > 0) && (
                <th style={{ width: cargarCostos ? 260 : 140 }}>
                  Costo y proveedor
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {p.items_pedido.map((it: any, i: number) => (
              <tr key={it.id}>
                <td style={{ color: "var(--muted)" }}>{i + 1}</td>
                <td>{it.descripcion}</td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>
                  {it.subcategorias
                    ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                    : "Sin categoría"}
                </td>
                <td style={{ textAlign: "right" }}>{it.cantidad}</td>
                <td style={{ color: "var(--muted)" }}>{it.observaciones || "—"}</td>
                {cargarCostos ? (
                  <td>
                    <form action={guardarCostoItem} className="form-costo">
                      <input type="hidden" name="item_id" value={it.id} />
                      <input
                        name="costo_unitario"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="$ unit."
                        defaultValue={it.costo_unitario ?? ""}
                      />
                      <input
                        name="proveedor"
                        placeholder="Proveedor"
                        defaultValue={it.proveedor ?? ""}
                      />
                      <button className="secondary">Guardar</button>
                    </form>
                  </td>
                ) : total > 0 ? (
                  <td style={{ fontSize: 13 }}>
                    {it.costo_unitario
                      ? `$${Number(it.costo_unitario).toLocaleString("es-AR")}`
                      : "—"}
                    {it.proveedor && (
                      <>
                        <br />
                        <span style={{ color: "var(--muted)" }}>{it.proveedor}</span>
                      </>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {!soloLectura && (
          <div className="acciones">
            {p.estado === "pendiente" && esAprobador && (
              <>
                <form action={resolverPedido}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decision" value="aprobado" />
                  <button className="aprobar">Aprobar pedido</button>
                </form>
                <AccionConMotivo
                  accion={resolverPedido}
                  pedidoId={p.id}
                  decision="rechazado"
                  etiqueta="Rechazar"
                  clase="rechazar"
                  titulo="¿Por qué rechazás el pedido?"
                />
              </>
            )}

            {p.estado === "aprobado" && esCompras && (
              <form action={resolverPedido}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value="entregado" />
                <button className="aprobar">Marcar entregado</button>
              </form>
            )}

            {(esAprobador || esCompras) && (
              <AccionConMotivo
                accion={resolverPedido}
                pedidoId={p.id}
                decision="cancelado"
                etiqueta="Cancelar"
                clase="rechazar"
                titulo="¿Por qué cancelás el pedido?"
              />
            )}
          </div>
        )}
      </div>
    );
  }
}
