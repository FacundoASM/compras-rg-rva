import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ponerFlash } from "@/lib/flash";

export const dynamic = "force-dynamic";

const CAMPOS = [
  { name: "nombre", label: "Nombre", ancho: "1 1 200px", requerido: true },
  { name: "cuit", label: "CUIT", ancho: "1 1 140px" },
  { name: "cuenta_contable", label: "Cuenta contable", ancho: "1 1 140px" },
  { name: "direccion", label: "Dirección", ancho: "2 1 240px" },
  { name: "provincia", label: "Provincia", ancho: "1 1 150px" },
  { name: "telefono", label: "Teléfono", ancho: "1 1 140px" },
  { name: "email", label: "Correo", ancho: "1 1 180px" },
  { name: "condiciones_pago", label: "Condiciones de pago", ancho: "1 1 180px" },
];

function datosDelFormulario(formData: FormData) {
  const d: Record<string, string | null> = {};
  for (const c of CAMPOS) {
    const v = ((formData.get(c.name) as string) || "").trim();
    d[c.name] = v || null;
  }
  return d;
}

async function crearProveedor(formData: FormData) {
  "use server";
  const datos = datosDelFormulario(formData);
  if (!datos.nombre) return;

  const supabase = createClient();
  const { error } = await supabase.from("proveedores").insert(datos);
  ponerFlash(
    error
      ? error.message.includes("duplicate")
        ? "Ya existe un proveedor con ese nombre"
        : "No se pudo crear el proveedor"
      : `Proveedor ${datos.nombre} agregado`,
    error ? "error" : "exito"
  );
  revalidatePath("/admin/proveedores");
}

async function actualizarProveedor(formData: FormData) {
  "use server";
  const datos = datosDelFormulario(formData);
  const supabase = createClient();
  const { error } = await supabase
    .from("proveedores")
    .update(datos)
    .eq("id", formData.get("id") as string);
  ponerFlash(
    error ? "No se pudo guardar" : "Proveedor actualizado",
    error ? "error" : "exito"
  );
  revalidatePath("/admin/proveedores");
}

async function alternarActivo(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase
    .from("proveedores")
    .update({ activo: formData.get("activo") === "true" })
    .eq("id", formData.get("id") as string);
  revalidatePath("/admin/proveedores");
}

export default async function ProveedoresPage() {
  const perfil = await getPerfilActual();
  if (!["compras", "aprobador", "superusuario"].includes(perfil?.rol ?? "")) {
    redirect("/mis-pedidos");
  }

  const supabase = createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");

  return (
    <div>
      <h2>Proveedores</h2>
      <p className="subtitulo">
        Los datos cargados acá salen impresos en la orden de compra. Los
        proveedores inactivos no aparecen al asignar, pero se conservan en los
        pedidos donde ya se usaron.
      </p>

      <details className="card" style={{ marginBottom: 18 }}>
        <summary className="resumen-accion">+ Agregar proveedor</summary>
        <form action={crearProveedor} style={{ marginTop: 16 }}>
          <div className="grilla-campos">
            {CAMPOS.map((c) => (
              <div key={c.name} style={{ flex: c.ancho }}>
                <label>
                  {c.label}
                  {c.requerido && " *"}
                </label>
                <input name={c.name} required={c.requerido} />
              </div>
            ))}
          </div>
          <button type="submit">Agregar</button>
        </form>
      </details>

      {(proveedores ?? []).length === 0 ? (
        <div className="card">
          <p className="vacio">
            Todavía no hay proveedores cargados. Agregá el primero con el botón
            de arriba.
          </p>
        </div>
      ) : (
        <div className="pila">
          {(proveedores ?? []).map((p: any) => (
            <div
              key={p.id}
              className="card"
              style={{ opacity: p.activo ? 1 : 0.6 }}
            >
              <form action={actualizarProveedor}>
                <input type="hidden" name="id" value={p.id} />
                <div className="fila-titulo" style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {p.nombre}{" "}
                    {!p.activo && <span className="badge cancelado">inactivo</span>}
                  </p>
                </div>
                <div className="grilla-campos">
                  {CAMPOS.map((c) => (
                    <div key={c.name} style={{ flex: c.ancho }}>
                      <label>{c.label}</label>
                      <input
                        name={c.name}
                        defaultValue={p[c.name] ?? ""}
                        required={c.requerido}
                      />
                    </div>
                  ))}
                </div>
                <div className="acciones" style={{ marginTop: 0 }}>
                  <button type="submit">Guardar</button>
                </div>
              </form>

              <form action={alternarActivo} style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="activo"
                  value={p.activo ? "false" : "true"}
                />
                <button className="secondary">
                  {p.activo ? "Marcar inactivo" : "Reactivar"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
