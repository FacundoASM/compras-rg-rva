import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/empresa";
import BotonImprimir from "@/app/components/BotonImprimir";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OCPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      "*, solicitante:perfiles!pedidos_solicitante_id_fkey(nombre), aprobador:perfiles!pedidos_aprobado_por_fkey(nombre), items_pedido(*, subcategorias(nombre, categorias(nombre)))"
    )
    .eq("id", params.id)
    .single();

  if (!pedido) {
    return (
      <div className="card">
        <p className="vacio">No se encontró el pedido.</p>
      </div>
    );
  }

  if (!["aprobado", "entregado"].includes(pedido.estado)) {
    return (
      <div className="card">
        <p className="vacio">
          El pedido {pedido.numero} está {pedido.estado}. La orden de compra se
          genera una vez aprobado. <Link href="/mis-pedidos">Volver</Link>
        </p>
      </div>
    );
  }

  const numeroOC = pedido.numero.replace("PED-", "OC-");
  const unidades = pedido.items_pedido.reduce(
    (a: number, it: any) => a + Number(it.cantidad),
    0
  );
  const total = pedido.items_pedido.reduce(
    (a: number, it: any) =>
      a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
    0
  );
  const conCostos = total > 0;

  return (
    <div>
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Link href="/mis-pedidos">← Volver</Link>
        <BotonImprimir />
      </div>

      <div className="oc">
        <div className="oc-encabezado">
          <div>
            <Image
              src="/rv-logo.jpg"
              alt={EMPRESA.nombre}
              width={1218}
              height={177}
            />
            <div className="oc-empresa">
              {EMPRESA.razonSocial}
              {EMPRESA.cuit && <> · CUIT {EMPRESA.cuit}</>}
              {EMPRESA.domicilio && (
                <>
                  <br />
                  {EMPRESA.domicilio}
                </>
              )}
              {(EMPRESA.telefono || EMPRESA.email) && (
                <>
                  <br />
                  {[EMPRESA.telefono, EMPRESA.email].filter(Boolean).join(" · ")}
                </>
              )}
            </div>
          </div>
          <div className="oc-titulo">
            <h1>Orden de compra</h1>
            <p className="oc-numero">{numeroOC}</p>
            <p style={{ fontSize: 11, color: "var(--tinta-3)", margin: "2px 0 0" }}>
              Emitida el{" "}
              {new Date(
                pedido.fecha_aprobacion ?? pedido.fecha
              ).toLocaleDateString("es-AR")}
            </p>
          </div>
        </div>

        <div className="oc-datos">
          <p style={{ margin: 0 }}>
            <span>Solicitante: </span>
            {pedido.solicitante?.nombre}
          </p>
          <p style={{ margin: 0 }}>
            <span>Área: </span>
            {pedido.area}
          </p>
          <p style={{ margin: 0 }}>
            <span>Pedido de origen: </span>
            {pedido.numero}
          </p>
          <p style={{ margin: 0 }}>
            <span>Fecha del pedido: </span>
            {new Date(pedido.fecha).toLocaleDateString("es-AR")}
          </p>
          <p style={{ margin: 0 }}>
            <span>Autorizado por: </span>
            {pedido.aprobador?.nombre ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span>Estado: </span>
            {pedido.estado === "entregado"
              ? `Entregado el ${new Date(pedido.fecha_entrega).toLocaleDateString("es-AR")}`
              : "Aprobado, pendiente de entrega"}
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th>Descripción</th>
              <th style={{ width: "20%" }}>Categoría</th>
              <th className="col-cant">Cant.</th>
              {conCostos && <th className="col-precio">Unitario</th>}
              {conCostos && <th className="col-precio">Subtotal</th>}
              {!conCostos && <th style={{ width: "26%" }}>Observaciones</th>}
            </tr>
          </thead>
          <tbody>
            {pedido.items_pedido.map((it: any, i: number) => (
              <tr key={it.id}>
                <td className="col-num">{i + 1}</td>
                <td>
                  {it.descripcion}
                  {conCostos && it.observaciones && (
                    <>
                      <br />
                      <span style={{ color: "var(--tinta-3)", fontSize: 11 }}>
                        {it.observaciones}
                      </span>
                    </>
                  )}
                  {it.proveedor && (
                    <>
                      <br />
                      <span style={{ color: "var(--tinta-3)", fontSize: 11 }}>
                        Proveedor: {it.proveedor}
                      </span>
                    </>
                  )}
                </td>
                <td style={{ color: "var(--tinta-3)", fontSize: 11 }}>
                  {it.subcategorias
                    ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                    : "—"}
                </td>
                <td className="col-cant">{it.cantidad}</td>
                {conCostos && (
                  <td className="col-precio">
                    {it.costo_unitario
                      ? `$${Number(it.costo_unitario).toLocaleString("es-AR")}`
                      : "—"}
                  </td>
                )}
                {conCostos && (
                  <td className="col-precio">
                    {it.costo_unitario
                      ? `$${(
                          Number(it.costo_unitario) * Number(it.cantidad)
                        ).toLocaleString("es-AR")}`
                      : "—"}
                  </td>
                )}
                {!conCostos && (
                  <td style={{ color: "var(--tinta-3)" }}>
                    {it.observaciones || "—"}
                  </td>
                )}
              </tr>
            ))}
            <tr>
              <td></td>
              <td style={{ fontWeight: 600 }}>Total</td>
              <td></td>
              <td className="col-cant" style={{ fontWeight: 600 }}>
                {unidades}
              </td>
              {conCostos && <td></td>}
              {conCostos && (
                <td className="col-precio" style={{ fontWeight: 600 }}>
                  ${total.toLocaleString("es-AR")}
                </td>
              )}
              {!conCostos && <td></td>}
            </tr>
          </tbody>
        </table>

        <div className="oc-nota">
          Documento generado electrónicamente por el sistema de compras de{" "}
          {EMPRESA.nombre}. La autorización quedó registrada a nombre de{" "}
          {pedido.aprobador?.nombre ?? "—"}
          {pedido.fecha_aprobacion &&
            ` el ${new Date(pedido.fecha_aprobacion).toLocaleDateString("es-AR")}`}
          . Ante cualquier discrepancia, citar el número {numeroOC}.
        </div>
      </div>
    </div>
  );
}
