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
  revalidatePath("/ordenes");
  revalidatePath("/", "layout");
}

const TEXTO_ESTADO: Record<string, string> = {
  aprobado: "aprobado",
  rechazado: "rechazado",
  cancelado: "cancelado",
  comprado: "marcado como comprado",
  entregado: "marcado como entregado",
};

export async function resolverPedido(formData: FormData) {
  const id = formData.get("id") as string;
  const decision = formData.get("decision") as
    | "aprobado"
    | "rechazado"
    | "cancelado"
    | "comprado"
    | "entregado";
  const motivo = (formData.get("motivo") as string) || null;

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const ahora = new Date().toISOString();

  const cambios: Record<string, unknown> = { estado: decision };
  if (motivo !== null) cambios.motivo_resolucion = motivo;

  if (decision === "aprobado" || decision === "rechazado") {
    cambios.aprobado_por = auth.user!.id;
    cambios.fecha_aprobacion = ahora;
  }
  if (decision === "comprado") {
    cambios.comprado_por = auth.user!.id;
    cambios.fecha_compra = ahora;
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

  const supabase = createClient();
  const { error } = await supabase
    .from("items_pedido")
    .update({ costo_unitario: costoRaw ? Number(costoRaw) : null })
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


/* ------------------------------------------------------------------ */
/* Proveedores                                                         */
/* ------------------------------------------------------------------ */

/** Asigna el proveedor del pedido, o lo marca como "varios proveedores". */
export async function asignarProveedorPedido(formData: FormData) {
  const pedidoId = formData.get("pedido_id") as string;
  const valor = (formData.get("proveedor_id") as string) || "";

  const supabase = createClient();

  if (valor === "VARIOS") {
    const { error } = await supabase
      .from("pedidos")
      .update({ varios_proveedores: true, proveedor_id: null })
      .eq("id", pedidoId);
    ponerFlash(
      error ? "No se pudo guardar" : "El pedido se reparte entre varios proveedores",
      error ? "error" : "info"
    );
  } else {
    // Un solo proveedor para todo el pedido: se limpian los de cada ítem
    const { error } = await supabase
      .from("pedidos")
      .update({
        varios_proveedores: false,
        proveedor_id: valor || null,
      })
      .eq("id", pedidoId);

    if (!error) {
      await supabase
        .from("items_pedido")
        .update({ proveedor_id: null })
        .eq("pedido_id", pedidoId);
    }

    ponerFlash(
      error ? "No se pudo guardar" : valor ? "Proveedor asignado" : "Proveedor quitado",
      error ? "error" : "exito"
    );
  }

  revalidarTodo();
}

/** Asigna el proveedor de un ítem, cuando el pedido es de varios proveedores. */
export async function asignarProveedorItem(formData: FormData) {
  const itemId = formData.get("item_id") as string;
  const valor = (formData.get("proveedor_id") as string) || null;

  const supabase = createClient();
  const { error } = await supabase
    .from("items_pedido")
    .update({ proveedor_id: valor })
    .eq("id", itemId);

  ponerFlash(
    error ? "No se pudo asignar el proveedor" : "Proveedor del artículo guardado",
    error ? "error" : "exito"
  );
  revalidarTodo();
}

/* ------------------------------------------------------------------ */
/* Adjuntos                                                            */
/* ------------------------------------------------------------------ */

/** Registra en la base un archivo ya subido al depósito. */
export async function registrarAdjunto(datos: {
  pedidoId: string;
  nombreArchivo: string;
  ruta: string;
  tipo: string;
  tamano: number;
}) {
  const perfil = await getPerfilActual();
  if (!perfil) return { error: "Sesión vencida" };

  // La ruta la propone el navegador: se exige que apunte a la carpeta del
  // pedido, para que nadie registre como propio un archivo de otro.
  if (!datos.ruta.startsWith(`${datos.pedidoId}/`)) {
    return { error: "Ruta de archivo inválida" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("adjuntos").insert({
    pedido_id: datos.pedidoId,
    nombre_archivo: datos.nombreArchivo,
    ruta: datos.ruta,
    tipo: datos.tipo,
    tamano: datos.tamano,
    subido_por: perfil.id,
  });

  if (error) return { error: error.message };

  ponerFlash(`Se adjuntó ${datos.nombreArchivo}`);
  revalidarTodo();
  return { ok: true };
}

export async function eliminarAdjunto(formData: FormData) {
  const id = formData.get("adjunto_id") as string;
  const ruta = formData.get("ruta") as string;

  const supabase = createClient();
  await supabase.storage.from("adjuntos").remove([ruta]);
  const { error } = await supabase.from("adjuntos").delete().eq("id", id);

  ponerFlash(
    error ? "No se pudo eliminar el archivo" : "Archivo eliminado",
    error ? "error" : "exito"
  );
  revalidarTodo();
}

/** Devuelve un enlace temporal para descargar un adjunto (vale 60 segundos). */
export async function enlaceAdjunto(ruta: string) {
  const supabase = createClient();

  // Esta acción se puede invocar desde el navegador con cualquier ruta, así que
  // primero se comprueba que corresponda a un adjunto que esta persona puede
  // ver. La consulta pasa por las políticas de la base: si no le corresponde,
  // no devuelve nada.
  const { data: adjunto } = await supabase
    .from("adjuntos")
    .select("id")
    .eq("ruta", ruta)
    .maybeSingle();

  if (!adjunto) return { error: "No tenés acceso a este archivo" };

  const { data, error } = await supabase.storage
    .from("adjuntos")
    .createSignedUrl(ruta, 60);
  if (error || !data) return { error: "No se pudo generar el enlace" };
  return { url: data.signedUrl };
}
