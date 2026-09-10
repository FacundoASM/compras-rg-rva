import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function crearArea(formData: FormData) {
  "use server";
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre) return;
  const supabase = createClient();
  await supabase.from("areas").insert({ nombre });
  revalidatePath("/admin/areas");
}

async function renombrarArea(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const anterior = formData.get("anterior") as string;
  const nombre = (formData.get("nombre") as string).trim();
  if (!nombre || nombre === anterior) return;

  const supabase = createClient();
  await supabase.from("areas").update({ nombre }).eq("id", id);
  // arrastrar el cambio a los perfiles y pedidos que ya usaban el nombre viejo
  await supabase.from("perfiles").update({ area: nombre }).eq("area", anterior);
  await supabase.from("pedidos").update({ area: nombre }).eq("area", anterior);
  revalidatePath("/admin/areas");
  revalidatePath("/admin/perfiles");
}

async function eliminarArea(formData: FormData) {
  "use server";
  const supabase = createClient();
  const nombre = formData.get("nombre") as string;
  const { count } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("area", nombre);
  if ((count ?? 0) > 0) return; // no borrar áreas en uso
  await supabase.from("areas").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/areas");
}

export default async function AreasPage() {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "superusuario") redirect("/mis-pedidos");

  const supabase = createClient();
  const [{ data: areas }, { data: perfiles }] = await Promise.all([
    supabase.from("areas").select("id, nombre").order("nombre"),
    supabase.from("perfiles").select("area"),
  ]);

  const uso = new Map<string, number>();
  for (const p of perfiles ?? []) {
    uso.set(p.area, (uso.get(p.area) ?? 0) + 1);
  }

  return (
    <div>
      <h2>Áreas</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -8 }}>
        Al renombrar un área, el cambio se aplica también a los perfiles y a los
        pedidos que la usaban. Solo se pueden borrar áreas sin gente asignada.
      </p>

      <form action={crearArea} className="card fila-inline">
        <input name="nombre" placeholder="Nombre del área nueva" required />
        <button>Agregar área</button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th style={{ width: 110, textAlign: "right" }}>Personas</th>
              <th style={{ width: 110 }}></th>
            </tr>
          </thead>
          <tbody>
            {(areas ?? []).map((a: any) => (
              <tr key={a.id}>
                <td>
                  <form action={renombrarArea} className="fila-inline">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="anterior" value={a.nombre} />
                    <input name="nombre" defaultValue={a.nombre} />
                    <button className="secondary">Guardar</button>
                  </form>
                </td>
                <td style={{ textAlign: "right" }}>{uso.get(a.nombre) ?? 0}</td>
                <td>
                  {(uso.get(a.nombre) ?? 0) === 0 && (
                    <form action={eliminarArea}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="nombre" value={a.nombre} />
                      <button className="rechazar">Borrar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
