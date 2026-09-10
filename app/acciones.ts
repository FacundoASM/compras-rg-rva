"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidarTodo() {
  revalidatePath("/mis-pedidos");
  revalidatePath("/aprobacion");
  revalidatePath("/dashboard");
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
  const itemId = formData.get("item_id") as string;
  const supabase = createClient();
  await supabase.from("items_pedido").delete().eq("id", itemId);
  revalidarTodo();
}

export async function agregarItemAPedido(formData: FormData) {
  const supabase = createClient();
  await supabase.from("items_pedido").insert({
    pedido_id: formData.get("pedido_id") as string,
    descripcion: (formData.get("descripcion") as string).trim(),
    cantidad: Number(formData.get("cantidad")),
    observaciones: ((formData.get("observaciones") as string) || "").trim() || null,
    subcategoria_id: (formData.get("subcategoria_id") as string) || null,
  });
  revalidarTodo();
}
