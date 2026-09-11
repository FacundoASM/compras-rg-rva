import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { agregarItemAPedido, eliminarItem } from "@/app/acciones";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({
  params,
}: {
  params: { id: string };
}) {
  const perfil = await getPerfilActual();
  if (perfil?.rol === "externo") redirect("/ordenes");

  const supabase = createClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, items_pedido(*, subcategorias(nombre, categorias(nombre)))")
    .eq("id", params.id)
    .single();

  if (!pedido) redirect("/mis-pedidos");

  if (pedido.solicitante_id !== perfil?.id || pedido.estado !== "pendiente") {
    return (
      <div className="card">
        <p className="vacio">
          Este pedido ya no se puede editar. Solo podés modificar tus propios
          pedidos mientras están pendientes.{" "}
          <Link href="/mis-pedidos">Volver</Link>
        </p>
      </div>
    );
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");
  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select("id, categoria_id, nombre")
    .order("nombre");

  return (
    <div>
      <div className="fila-titulo">
        <h2 style={{ marginBottom: 0 }}>Editar {pedido.numero}</h2>
        <Link href="/mis-pedidos">Volver a mis pedidos</Link>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style={{ width: "26%" }}>Categoría</th>
              <th style={{ width: 70, textAlign: "right" }}>Cant.</th>
              <th style={{ width: "20%" }}>Observaciones</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {pedido.items_pedido.map((it: any) => (
              <tr key={it.id}>
                <td>{it.descripcion}</td>
                <td style={{ color: "var(--tinta-3)", fontSize: 13 }}>
                  {it.subcategorias
                    ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                    : "Sin categoría"}
                </td>
                <td style={{ textAlign: "right" }}>{it.cantidad}</td>
                <td style={{ color: "var(--tinta-3)" }}>
                  {it.observaciones || "—"}
                </td>
                <td>
                  {pedido.items_pedido.length > 1 && (
                    <form action={eliminarItem}>
                      <input type="hidden" name="item_id" value={it.id} />
                      <button className="secondary">Quitar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 28 }}>Agregar un ítem</h2>
      <form action={agregarItemAPedido} className="card">
        <input type="hidden" name="pedido_id" value={pedido.id} />
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
          <div>
            <label>Descripción</label>
            <input name="descripcion" required placeholder="Qué se necesita comprar" />
          </div>
          <div>
            <label>Cantidad</label>
            <input name="cantidad" type="number" min={1} defaultValue={1} required />
          </div>
        </div>

        <label>Subcategoría</label>
        <select name="subcategoria_id" defaultValue="">
          <option value="">Sin categoría</option>
          {(categorias ?? []).map((c: any) => (
            <optgroup key={c.id} label={c.nombre}>
              {(subcategorias ?? [])
                .filter((s: any) => s.categoria_id === c.id)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <label>Observaciones</label>
        <textarea name="observaciones" rows={2} placeholder="Detalles adicionales" />

        <button type="submit">Agregar ítem</button>
      </form>
    </div>
  );
}
