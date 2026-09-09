import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function resolverPedido(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const decision = formData.get("decision") as "aprobado" | "rechazado";
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  await supabase
    .from("pedidos")
    .update({
      estado: decision,
      aprobado_por: auth.user!.id,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/aprobacion");
  revalidatePath("/mis-pedidos");
}

export default async function AprobacionPage() {
  const perfil = await getPerfilActual();
  const puedeAprobar =
    perfil?.rol === "aprobador" || perfil?.rol === "superusuario";

  const supabase = createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, perfiles!pedidos_solicitante_id_fkey(nombre), items_pedido(*)")
    .order("creado_en", { ascending: false });

  const pendientes = (pedidos ?? []).filter((p: any) => p.estado === "pendiente");
  const resueltos = (pedidos ?? []).filter((p: any) => p.estado !== "pendiente");

  return (
    <div>
      <h2>{puedeAprobar ? "Pedidos pendientes" : "Pedidos"}</h2>

      {pendientes.length === 0 ? (
        <div className="card">
          <p className="vacio">No hay pedidos pendientes.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pendientes.map((p: any) => (
            <TarjetaPedido key={p.id} pedido={p} puedeAprobar={puedeAprobar} />
          ))}
        </div>
      )}

      {resueltos.length > 0 && (
        <>
          <h2 style={{ marginTop: 36 }}>Resueltos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {resueltos.map((p: any) => (
              <TarjetaPedido key={p.id} pedido={p} puedeAprobar={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  function TarjetaPedido({
    pedido: p,
    puedeAprobar,
  }: {
    pedido: any;
    puedeAprobar: boolean;
  }) {
    const total = p.items_pedido.reduce(
      (acc: number, it: any) => acc + Number(it.cantidad),
      0
    );

    return (
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {p.numero} <span className={`badge ${p.estado}`}>{p.estado}</span>
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              {p.area} · {p.perfiles?.nombre} ·{" "}
              {new Date(p.fecha).toLocaleDateString("es-AR")} ·{" "}
              {p.items_pedido.length} ítem(s), {total} unidad(es)
            </p>
          </div>
          {p.estado === "aprobado" && (
            <Link href={`/oc/${p.id}`}>Ver orden de compra</Link>
          )}
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Descripción</th>
              <th style={{ width: 70, textAlign: "right" }}>Cant.</th>
              <th style={{ width: "35%" }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {p.items_pedido.map((it: any, i: number) => (
              <tr key={it.id}>
                <td style={{ color: "var(--muted)" }}>{i + 1}</td>
                <td>{it.descripcion}</td>
                <td style={{ textAlign: "right" }}>{it.cantidad}</td>
                <td style={{ color: "var(--muted)" }}>
                  {it.observaciones || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {puedeAprobar && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <form action={resolverPedido}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="decision" value="aprobado" />
              <button type="submit" className="aprobar">
                Aprobar pedido
              </button>
            </form>
            <form action={resolverPedido}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="decision" value="rechazado" />
              <button type="submit" className="rechazar">
                Rechazar
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
}
