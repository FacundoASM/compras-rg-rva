import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { resolverPedido } from "@/app/acciones";
import EstadoPedido from "@/app/components/EstadoPedido";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrdenesPage() {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "externo") redirect("/");

  const supabase = createClient();

  // Las políticas de la base ya limitan lo que este rol puede ver:
  // solo órdenes aprobadas o ya compradas.
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "*, proveedores(nombre), items_pedido(*, proveedores(nombre), subcategorias(nombre, categorias(nombre))), adjuntos(id)"
    )
    .order("fecha_aprobacion", { ascending: true });

  const porComprar = (pedidos ?? []).filter((p: any) => p.estado === "aprobado");
  const compradas = (pedidos ?? []).filter((p: any) => p.estado === "comprado");

  return (
    <div>
      <h2>Órdenes de compra</h2>
      <p className="subtitulo">
        Acá ves las órdenes ya autorizadas. Cuando termines de comprar una,
        marcala como comprada para que compras sepa que va en camino.
      </p>

      <h3 style={{ marginTop: 24 }}>
        Por comprar {porComprar.length > 0 && `(${porComprar.length})`}
      </h3>
      {porComprar.length === 0 ? (
        <div className="card">
          <p className="vacio">No hay órdenes pendientes de compra.</p>
        </div>
      ) : (
        <div className="pila">
          {porComprar.map((p: any) => (
            <Tarjeta key={p.id} p={p} accionable />
          ))}
        </div>
      )}

      {compradas.length > 0 && (
        <>
          <h3 style={{ marginTop: 36 }}>Compradas, esperando entrega</h3>
          <div className="pila">
            {compradas.map((p: any) => (
              <Tarjeta key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Tarjeta({ p, accionable }: { p: any; accionable?: boolean }) {
  const unidades = p.items_pedido.reduce(
    (a: number, it: any) => a + Number(it.cantidad),
    0
  );
  const total = p.items_pedido.reduce(
    (a: number, it: any) =>
      a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
    0
  );

  return (
    <div className="card">
      <div className="fila-titulo">
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {p.numero.replace("PED-", "OC-")}{" "}
            <span className={`badge ${p.estado}`}>{p.estado}</span>
          </p>
          <p className="chico tenue" style={{ margin: "3px 0 0" }}>
            {p.area} ·{" "}
            {p.fecha_aprobacion
              ? `Autorizada el ${new Date(p.fecha_aprobacion).toLocaleDateString("es-AR")}`
              : ""}{" "}
            · {p.items_pedido.length} ítem(s), {unidades} unidad(es)
            {total > 0 && ` · $${Math.round(total).toLocaleString("es-AR")}`}
            {p.varios_proveedores
              ? " · varios proveedores"
              : p.proveedores?.nombre
              ? ` · ${p.proveedores.nombre}`
              : " · sin proveedor asignado"}
          </p>
        </div>
        <Link href={`/oc/${p.id}`}>Ver orden completa</Link>
      </div>

      <EstadoPedido estado={p.estado} />

      <table>
        <thead>
          <tr>
            <th style={{ width: 28 }}>#</th>
            <th>Artículo</th>
            <th style={{ width: "18%" }}>Categoría</th>
            <th className="der" style={{ width: 58 }}>Cant.</th>
            <th style={{ width: "16%" }}>Observaciones</th>
            {total > 0 && <th className="der" style={{ width: 100 }}>Unitario</th>}
            {p.varios_proveedores && (
              <th style={{ width: "16%" }}>Proveedor</th>
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
              {total > 0 && (
                <td data-col="Unitario" className="der chico">
                  {it.costo_unitario
                    ? `$${Number(it.costo_unitario).toLocaleString("es-AR")}`
                    : "—"}
                </td>
              )}
              {p.varios_proveedores && (
                <td data-col="Proveedor" className="chico">
                  {it.proveedores?.nombre ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {(p.adjuntos ?? []).length > 0 && (
        <p className="chico tenue" style={{ margin: "12px 0 0" }}>
          Esta orden tiene {p.adjuntos.length} archivo(s) adjunto(s). Abrilos
          desde “Ver orden completa”.
        </p>
      )}

      {accionable && (
        <div className="acciones">
          <form action={resolverPedido}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="decision" value="comprado" />
            <button className="aprobar">Marcar como comprada</button>
          </form>
        </div>
      )}
    </div>
  );
}
