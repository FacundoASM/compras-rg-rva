import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function actualizarPerfil(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase
    .from("perfiles")
    .update({
      nombre: formData.get("nombre") as string,
      area: formData.get("area") as string,
      rol: formData.get("rol") as string,
    })
    .eq("id", formData.get("id") as string);
  revalidatePath("/admin/perfiles");
}

async function guardarAvisos(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase.from("configuracion").upsert({
    clave: "avisos_email",
    valor: {
      aprobador: formData.get("mail_aprobador") as string,
      compras: (formData.get("mail_compras") as string)
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    },
  });
  revalidatePath("/admin/perfiles");
}

export default async function AdminPerfilesPage() {
  const supabase = createClient();
  const { data: perfiles } = await supabase.from("perfiles").select("*").order("nombre");
  const { data: config } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "avisos_email")
    .maybeSingle();

  const avisos = (config?.valor as any) ?? { aprobador: "", compras: [] };

  return (
    <div>
      <p style={{ fontWeight: 500, marginBottom: 16 }}>Perfiles</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {(perfiles ?? []).map((p: any) => (
          <form
            action={actualizarPerfil}
            key={p.id}
            className="card"
            style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
          >
            <input type="hidden" name="id" value={p.id} />
            <div style={{ flex: 1 }}>
              <label>Nombre</label>
              <input name="nombre" defaultValue={p.nombre} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Área</label>
              <input name="area" defaultValue={p.area} />
            </div>
            <div style={{ flex: 1 }}>
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
        ))}
      </div>

      <p style={{ fontWeight: 500, marginBottom: 16 }}>Avisos por correo</p>
      <form action={guardarAvisos} className="card">
        <label>Mail del aprobador (aviso de pedido nuevo)</label>
        <input name="mail_aprobador" defaultValue={avisos.aprobador} placeholder="aprobador@empresa.com" />
        <label>Mails de compras (aviso de pedido aprobado, separados por coma)</label>
        <input
          name="mail_compras"
          defaultValue={(avisos.compras ?? []).join(", ")}
          placeholder="compras1@empresa.com, compras2@empresa.com"
        />
        <button type="submit">Guardar avisos</button>
      </form>
    </div>
  );
}
