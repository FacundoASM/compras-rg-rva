"use server";

import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ponerFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidarTodo() {
  revalidatePath("/mis-pedidos");
  revalidatePath("/aprobacion");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

const TEXTO_ESTADO: Record<string, string> = {
  aprobado: "aprobado",
  rechazado: "rechazado",
  cancelado: "cancelado",
  entregado: "marcado como entregado",
};

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

  const { data, error } = await supabase
    .from("pedidos")
    .update(cambios)
    .eq("id", id)
    .select("numero")
    .single();

  if (error) {
    ponerFlash("No se pudo actualizar el pedido: " + error.message, "error");
  } else {
    ponerFlash(`Pedido ${data.numero} ${TEXTO_ESTADO[decision]}`);
  }

  revalidarTodo();
}

export async function guardarCostoItem(formData: FormData) {
  const itemId = formData.get("item_id") as string;
  const costoRaw = formData.get("costo_unitario") as string;
  const proveedor = ((formData.get("proveedor") as string) || "").trim();

  const supabase = createClient();
  const { error } = await supabase
    .from("items_pedido")
    .update({
      costo_unitario: costoRaw ? Number(costoRaw) : null,
      proveedor: proveedor || null,
    })
    .eq("id", itemId);

  ponerFlash(
    error ? "No se pudo guardar el costo" : "Costo guardado",
    error ? "error" : "exito"
  );
  revalidarTodo();
}

export async function eliminarItem(formData: FormData) {
  const supabase = createClient();
  await supabase
    .from("items_pedido")
    .delete()
    .eq("id", formData.get("item_id") as string);
  ponerFlash("Ítem quitado del pedido");
  revalidarTodo();
}

export async function agregarItemAPedido(formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from("items_pedido").insert({
    pedido_id: formData.get("pedido_id") as string,
    descripcion: (formData.get("descripcion") as string).trim(),
    cantidad: Number(formData.get("cantidad")),
    observaciones:
      ((formData.get("observaciones") as string) || "").trim() || null,
    subcategoria_id: (formData.get("subcategoria_id") as string) || null,
  });
  ponerFlash(
    error ? "No se pudo agregar el ítem" : "Ítem agregado",
    error ? "error" : "exito"
  );
  revalidarTodo();
}

/** Crea el pedido completo del lado del servidor, con la sesión ya validada. */
export async function crearPedido(datos: {
  items: {
    descripcion: string;
    cantidad: number;
    observaciones: string;
    subcategoria_id: string;
  }[];
}) {
  const perfil = await getPerfilActual();
  if (!perfil) return { error: "Tu sesión expiró. Volvé a ingresar." };
  if (!datos.items.length) return { error: "Agregá al menos un ítem" };

  const supabase = createClient();
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({ solicitante_id: perfil.id, area: perfil.area })
    .select("id, numero")
    .single();

  if (error || !pedido) {
    return { error: error?.message ?? "No se pudo crear el pedido" };
  }

  const { error: errItems } = await supabase.from("items_pedido").insert(
    datos.items.map((it) => ({
      pedido_id: pedido.id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      observaciones: it.observaciones || null,
      subcategoria_id: it.subcategoria_id || null,
    }))
  );

  if (errItems) return { error: errItems.message };

  ponerFlash(`Pedido ${pedido.numero} enviado para aprobación`);
  revalidarTodo();
  return { ok: true, numero: pedido.numero };
}

export async function repetirPedido(formData: FormData) {
  const origenId = formData.get("pedido_id") as string;
  const supabase = createClient();
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  const { data: origen } = await supabase
    .from("pedidos")
    .select(
      "id, items_pedido(descripcion, cantidad, observaciones, subcategoria_id)"
    )
    .eq("id", origenId)
    .single();

  if (!origen) return;

  const { data: nuevo, error } = await supabase
    .from("pedidos")
    .insert({ solicitante_id: perfil.id, area: perfil.area })
    .select()
    .single();

  if (error || !nuevo) {
    ponerFlash("No se pudo repetir el pedido", "error");
    return;
  }

  await supabase.from("items_pedido").insert(
    origen.items_pedido.map((it: any) => ({
      pedido_id: nuevo.id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      observaciones: it.observaciones,
      subcategoria_id: it.subcategoria_id,
    }))
  );

  ponerFlash(
    `Se creó ${nuevo.numero} con los mismos ítems. Revisalo y enviálo.`,
    "info"
  );
  revalidarTodo();
  redirect(`/pedidos/${nuevo.id}/editar`);
}

export async function blanquearContrasena(formData: FormData) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "superusuario") return;

  const usuarioId = formData.get("usuario_id") as string;
  const nueva = (formData.get("contrasena") as string) || "";
  if (nueva.length < 6) {
    ponerFlash("La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(usuarioId, {
      password: nueva,
    });
    ponerFlash(
      error ? "No se pudo cambiar la contraseña" : "Contraseña actualizada",
      error ? "error" : "exito"
    );
  } catch (e: any) {
    ponerFlash(e.message ?? "Error al cambiar la contraseña", "error");
  }

  revalidatePath("/admin/perfiles");
}
