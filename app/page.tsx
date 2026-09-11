import { redirect } from "next/navigation";
import { getPerfilActual } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Puerta de entrada: manda a cada rol a su pantalla principal. */
export default async function Home() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  if (perfil.rol === "externo") redirect("/ordenes");

  if (["aprobador", "compras", "superusuario"].includes(perfil.rol)) {
    redirect("/aprobacion");
  }

  redirect("/mis-pedidos");
}
