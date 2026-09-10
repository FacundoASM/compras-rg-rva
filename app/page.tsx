import { redirect } from "next/navigation";
import { getPerfilActual } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  if (["aprobador", "compras", "superusuario"].includes(perfil.rol)) {
    redirect("/aprobacion");
  }
  redirect("/mis-pedidos");
}
