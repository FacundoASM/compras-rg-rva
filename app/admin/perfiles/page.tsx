import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { blanquearContrasena } from "@/app/acciones";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function actualizarPerfil(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase
    .from("perfiles")
    .update({
      nombre: (formData.get("nombre") as string).trim(),
      area: formData.get("area") as string,
      rol: formData.get("rol") as string,
    })
    .eq("id", formData.get("id") as string);
  revalidatePath("/admin/perfiles");
}

export default async function AdminPerfilesPage() {
  const yo = await getPerfilActual();
  if (yo?.rol !== "superusuario") redirect("/mis-pedidos");

  const supabase = createClient();
  const [{ data: perfiles }, { data: areas }] = await Promise.all([
    supabase.from("perfiles").select("*").order("nombre"),
    supabase.from("areas").select("nombre").order("nombre"),
  ]);

  return (
    <div>
      <h2>Perfiles</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -8 }}>
        Cada persona crea su cuenta desde la pantalla de ingreso y aparece acá
        como solicitante. Asignale nombre real, área y rol.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(perfiles ?? []).map((p: any) => (
          <div key={p.id} className="card">
            <form action={actualizarPerfil} className="fila-perfil">
              <input type="hidden" name="id" value={p.id} />
              <div style={{ flex: "2 1 180px" }}>
                <label>Nombre</label>
                <input name="nombre" defaultValue={p.nombre} />
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <label>Área</label>
                <select name="area" defaultValue={p.area}>
                  {!(areas ?? []).some((a: any) => a.nombre === p.area) && (
                    <option value={p.area}>{p.area}</option>
                  )}
                  {(areas ?? []).map((a: any) => (
                    <option key={a.nombre} value={a.nombre}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label>Rol</label>
                <select name="rol" defaultValue={p.rol}>
                  <option value="solicitante">Solicitante</option>
                  <option value="compras">Compras</option>
                  <option value="aprobador">Aprobador</option>
                  <option value="superusuario">Superusuario</option>
                </select>
              </div>
              <button type="submit" style={{ marginBottom: 14 }}>
                Guardar
              </button>
            </form>

            <details className="blanqueo">
              <summary>Blanquear contraseña</summary>
              <form action={blanquearContrasena} className="fila-inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="usuario_id" value={p.id} />
                <input
                  name="contrasena"
                  type="text"
                  minLength={6}
                  required
                  placeholder="Contraseña nueva (mínimo 6)"
                />
                <button className="secondary">Asignar</button>
              </form>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
                Anotá la contraseña antes de asignarla: no se puede volver a ver.
                Pedile a la persona que la cambie cuando ingrese.
              </p>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
