import { createClient } from "@/lib/supabase/server";
import FormularioPedido from "./FormularioPedido";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const supabase = createClient();
  const [{ data: categorias }, { data: subcategorias }] = await Promise.all([
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase.from("subcategorias").select("id, categoria_id, nombre").order("nombre"),
  ]);

  return (
    <div>
      <h2>Nuevo pedido</h2>
      <FormularioPedido
        categorias={categorias ?? []}
        subcategorias={subcategorias ?? []}
      />
    </div>
  );
}
