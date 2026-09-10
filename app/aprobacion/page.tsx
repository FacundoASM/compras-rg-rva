import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { resolverPedido, guardarCostoItem } from "@/app/acciones";
import AccionConMotivo from "@/app/components/AccionConMotivo";
import FiltrosPedidos from "@/app/components/FiltrosPedidos";
import EstadoPedido from "@/app/components/EstadoPedido";
import Link from "next/link";

export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

export default async function AprobacionPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const perfil = await getPerfilActual();
  const esAprobador =
    perfil?.rol === "aprobador" || perfil?.rol === "superusuario";
  const esCompras = perfil?.rol === "compras" || perfil?.rol === "superusuario";

  const pagina = Math.max(1, Number(searchParams.pagina ?? 1));
  const supabase = createClient();

  const [{ data: areasData }, { data: categorias }] = await Promise.all([
    supabase.from("areas").select("nombre").order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
  ]);

  let consulta = supabase
    .from("pedidos")
    .select(
      "*, perfiles!pedidos_solicitante_id_fkey(nombre), items_pedido(*, subcategorias(nombre, categoria_id, categorias(nombre)))",
      { count: "exact" }
    );

  if (searchParams.estado) consulta = consulta.eq("estado", searchParams.estado);
  if (searchParams.area) consulta = consulta.eq("area", searchParams.area);
  if (searchParams.desde) consulta = consulta.gte("fecha", searchParams.desde);
  if (searchParams.hasta) {
    const hasta = new Date(searchParams.hasta);
    hasta.setDate(hasta.getDate() + 1);
    consulta = consulta.lt("fecha", hasta.toISOString());
  }

  // Sin filtro de estado, priorizamos lo que requiere acción
  const { data: crudos, count } = await consulta
    .order("creado_en", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  let pedidos = crudos ?? [];

  // Texto y categoría se filtran acá porque miran los ítems relacionados
  const q = (searchParams.q ?? "").trim().toLowerCase();
  if (q) {
    pedidos = pedidos.filter(
      (p: any) =>
        p.numero.toLowerCase().includes(q) ||
        (p.perfiles?.nombre ?? "").toLowerCase().includes(q) ||
        p.items_pedido.some((it: any) =>
          it.descripcion.toLowerCase().includes(q)
        )
    );
  }
  if (searchParams.categoria) {
    pedidos = pedidos.filter((p: any) =>
      p.items_pedido.some(
        (it: any) => it.subcategorias?.categoria_id === searchParams.categoria
      )
    );
  }

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const hayFiltros = Boolean(
    searchParams.q ||
      searchParams.estado ||
      searchParams.area ||
      searchParams.categoria ||
      searchParams.desde ||
      searchParams.hasta
  );

  const activos = pedidos.filter((p: any) =>
    ["pendiente", "aprobado"].includes(p.estado)
  );
  const cerrados = pedidos.filter(
    (p: any) => !["pendiente", "aprobado"].includes(p.estado)
  );

  return (
    <div>
      <h2>Gestión de pedidos</h2>
      <p className="subtitulo">Aprobá pedidos, marcá entregas y cargá los costos de cada compra.</p>

      <FiltrosPedidos
        areas={(areasData ?? []).map((a: any) => a.nombre)}
        categorias={categorias ?? []}
      />

      {pedidos.length === 0 ? (
        <div className="card">
          <p className="vacio">
            {hayFiltros
              ? "Ningún pedido coincide con los filtros."
              : "Todavía no hay pedidos cargados."}
          </p>
        </div>
      ) : (
        <>
          {activos.length > 0 && (
            <div className="pila">
              {activos.map((p: any) => (
                <Tarjeta key={p.id} p={p} />
              ))}
            </div>
          )}

          {cerrados.length > 0 && (
            <>
              {activos.length > 0 && <h2 style={{ marginTop: 36 }}>Cerrados</h2>}
              <div className="pila">
                {cerrados.map((p: any) => (
                  <Tarjeta key={p.id} p={p} soloLectura />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {totalPaginas > 1 && (
        <div className="paginacion no-print">
          {pagina > 1 && (
            <Link href={`/aprobacion?${paramsCon(searchParams, pagina - 1)}`}>
              ← Anterior
            </Link>
          )}
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas && (
            <Link href={`/aprobacion?${paramsCon(searchParams, pagina + 1)}`}>
              Siguiente →
            </Link>
          )}
        </div>
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
            <p className="chico tenue" style={{ margin: "3px 0 0" }}>
              {p.area} · {p.perfiles?.nombre} ·{" "}
              {new Date(p.fecha).toLocaleDateString("es-AR")} ·{" "}
              {p.items_pedido.length} ítem(s), {unidades} unidad(es)
              {total > 0 && ` · $${Math.round(total).toLocaleString("es-AR")}`}
            </p>
          </div>
          {(p.estado === "aprobado" || p.estado === "entregado") && (
            <Link href={`/oc/${p.id}`}>Ver orden de compra</Link>
          )}
        </div>

        <EstadoPedido estado={p.estado} />

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
              <th style={{ width: 28 }}>#</th>
              <th>Descripción</th>
              <th style={{ width: "20%" }}>Categoría</th>
              <th style={{ width: 58, textAlign: "right" }}>Cant.</th>
              <th style={{ width: "18%" }}>Observaciones</th>
              {(cargarCostos || total > 0) && (
                <th style={{ width: cargarCostos ? 250 : 130 }}>
                  Costo y proveedor
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {p.items_pedido.map((it: any, i: number) => (
              <tr key={it.id}>
                <td data-col="#" className="tenue">{i + 1}</td>
                <td data-col="Artículo">{it.descripcion}</td>
                <td data-col="Categoría" className="tenue chico">
                  {it.subcategorias
                    ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                    : "Sin categoría"}
                </td>
                <td data-col="Cantidad" className="der">{it.cantidad}</td>
                <td data-col="Observaciones" className="tenue">
                  {it.observaciones || "—"}
                </td>
                {cargarCostos ? (
                  <td data-col="Costo">
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
                  <td data-col="Costo" className="chico">
                    {it.costo_unitario
                      ? `$${Number(it.costo_unitario).toLocaleString("es-AR")}`
                      : "—"}
                    {it.proveedor && (
                      <>
                        <br />
                        <span className="tenue">
                          {it.proveedor}
                        </span>
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

function paramsCon(
  searchParams: Record<string, string | undefined>,
  pagina: number
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "pagina") p.set(k, v);
  }
  p.set("pagina", String(pagina));
  return p.toString();
}
