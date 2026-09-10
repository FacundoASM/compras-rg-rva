"use server";

import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidarTodo() {
  revalidatePath("/mis-pedidos");
  revalidatePath("/aprobacion");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function resolverPedido(formData: FormData) {
  const id = formData.get("id") as string;
  const decision = formData.get("decision") as
    | "aprobado"
    | "rechazado"
    | "cancelado"
    | "entregado";
  const motivo = (formData.get("motivo") as string) || null;

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const ahora = new Date().toISOString();

  const cambios: Record<string, unknown> = {
    estado: decision,
    motivo_resolucion: motivo,
  };

  if (decision === "aprobado" || decision === "rechazado") {
    cambios.aprobado_por = auth.user!.id;
    cambios.fecha_aprobacion = ahora;
  }
  if (decision === "entregado") {
    cambios.entregado_por = auth.user!.id;
    cambios.fecha_entrega = ahora;
  }

  await supabase.from("pedidos").update(cambios).eq("id", id);
  revalidarTodo();
}

export async function guardarCostoItem(formData: FormData) {
  const itemId = formData.get("item_id") as string;
  const costoRaw = formData.get("costo_unitario") as string;
  const proveedor = ((formData.get("proveedor") as string) || "").trim();

  const supabase = createClient();
  await supabase
    .from("items_pedido")
    .update({
      costo_unitario: costoRaw ? Number(costoRaw) : null,
      proveedor: proveedor || null,
    })
    .eq("id", itemId);

  revalidarTodo();
}

export async function eliminarItem(formData: FormData) {
  const supabase = createClient();
  await supabase
    .from("items_pedido")
    .delete()
    .eq("id", formData.get("item_id") as string);
  revalidarTodo();
}

export async function agregarItemAPedido(formData: FormData) {
  const supabase = createClient();
  await supabase.from("items_pedido").insert({
    pedido_id: formData.get("pedido_id") as string,
    descripcion: (formData.get("descripcion") as string).trim(),
    cantidad: Number(formData.get("cantidad")),
    observaciones:
      ((formData.get("observaciones") as string) || "").trim() || null,
    subcategoria_id: (formData.get("subcategoria_id") as string) || null,
  });
  revalidarTodo();
}

/** Clona un pedido anterior como nuevo pedido pendiente del usuario actual. */
export async function repetirPedido(formData: FormData) {
  const origenId = formData.get("pedido_id") as string;
  const supabase = createClient();
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  const { data: origen } = await supabase
    .from("pedidos")
    .select("id, items_pedido(descripcion, cantidad, observaciones, subcategoria_id)")
    .eq("id", origenId)
    .single();

  if (!origen) return;

  const { data: nuevo, error } = await supabase
    .from("pedidos")
    .insert({ solicitante_id: perfil.id, area: perfil.area })
    .select()
    .single();

  if (error || !nuevo) return;

  await supabase.from("items_pedido").insert(
    origen.items_pedido.map((it: any) => ({
      pedido_id: nuevo.id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      observaciones: it.observaciones,
      subcategoria_id: it.subcategoria_id,
    }))
  );

  revalidarTodo();
  redirect(`/pedidos/${nuevo.id}/editar`);
}

/** Solo superusuario: asigna una contraseña nueva a otra persona. */
export async function blanquearContrasena(formData: FormData) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "superusuario") return;

  const usuarioId = formData.get("usuario_id") as string;
  const nueva = (formData.get("contrasena") as string) || "";
  if (nueva.length < 6) return;

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(usuarioId, { password: nueva });
  revalidatePath("/admin/perfiles");
}
