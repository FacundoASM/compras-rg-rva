import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

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
}

export default async function AprobacionPage() {
  const supabase = createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, perfiles!pedidos_solicitante_id_fkey(nombre), items_pedido(id)")
    .order("creado_en", { ascending: false });

  return (
    <div>
      <p style={{ fontWeight: 500, marginBottom: 16 }}>Pedidos</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(pedidos ?? []).map((p: any) => (
          <div
            key={p.id}
            className="card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>
                {p.numero} <span className={`badge ${p.estado}`}>{p.estado}</span>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                {p.area} · {p.perfiles?.nombre} · {p.items_pedido?.length ?? 0} ítem(s)
              </p>
            </div>
            {p.estado === "pendiente" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <form action={resolverPedido}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decision" value="aprobado" />
                  <button type="submit">Aprobar</button>
                </form>
                <form action={resolverPedido}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decision" value="rechazado" />
                  <button type="submit" className="secondary">
                    Rechazar
                  </button>
                </form>
              </div>
            ) : (
              <Link href={`/oc/${p.id}`}>Ver OC</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
