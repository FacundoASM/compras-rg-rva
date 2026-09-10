import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function renombrarCategoria(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase
    .from("categorias")
    .update({ nombre: (formData.get("nombre") as string).trim() })
    .eq("id", formData.get("id") as string);
  revalidatePath("/admin/categorias");
}

async function renombrarSubcategoria(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase
    .from("subcategorias")
    .update({ nombre: (formData.get("nombre") as string).trim() })
    .eq("id", formData.get("id") as string);
  revalidatePath("/admin/categorias");
}

async function fusionarSubcategoria(formData: FormData) {
  "use server";
  const origen = formData.get("origen") as string;
  const destino = formData.get("destino") as string;
  if (!destino || origen === destino) return;

  const supabase = createClient();
  // mover los ítems a la subcategoría destino y borrar la vacía
  await supabase
    .from("items_pedido")
    .update({ subcategoria_id: destino })
    .eq("subcategoria_id", origen);
  await supabase.from("subcategorias").delete().eq("id", origen);
  revalidatePath("/admin/categorias");
}

export default async function CategoriasPage() {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "superusuario") redirect("/mis-pedidos");

  const supabase = createClient();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, subcategorias(id, nombre)")
    .order("nombre");

  const todasSubs = (categorias ?? []).flatMap((c: any) =>
    c.subcategorias.map((s: any) => ({ ...s, categoria: c.nombre }))
  );

  return (
    <div>
      <h2>Categorías</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -8 }}>
        Cualquiera puede crear categorías al cargar un pedido. Acá las corregís y
        fusionás las que quedaron duplicadas, para que el tablero muestre datos
        limpios.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(categorias ?? []).map((c: any) => (
          <div key={c.id} className="card">
            <form action={renombrarCategoria} className="fila-inline">
              <input type="hidden" name="id" value={c.id} />
              <input name="nombre" defaultValue={c.nombre} />
              <button className="secondary">Renombrar</button>
            </form>

            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Subcategoría</th>
                  <th style={{ width: "45%" }}>Fusionar con</th>
                </tr>
              </thead>
              <tbody>
                {c.subcategorias.map((s: any) => (
                  <tr key={s.id}>
                    <td>
                      <form action={renombrarSubcategoria} className="fila-inline">
                        <input type="hidden" name="id" value={s.id} />
                        <input name="nombre" defaultValue={s.nombre} />
                        <button className="secondary">Guardar</button>
                      </form>
                    </td>
                    <td>
                      <form action={fusionarSubcategoria} className="fila-inline">
                        <input type="hidden" name="origen" value={s.id} />
                        <select name="destino" defaultValue="">
                          <option value="">Elegir destino...</option>
                          {todasSubs
                            .filter((o: any) => o.id !== s.id)
                            .map((o: any) => (
                              <option key={o.id} value={o.id}>
                                {o.categoria} › {o.nombre}
                              </option>
                            ))}
                        </select>
                        <button className="secondary">Fusionar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
