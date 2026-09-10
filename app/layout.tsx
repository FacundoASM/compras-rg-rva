import "./globals.css";
import { Inter } from "next/font/google";
import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { leerFlash } from "@/lib/flash";
import Navegacion from "./components/Navegacion";
import Aviso from "./components/Aviso";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente",
});

export const metadata = {
  title: "Compras · Radio Victoria",
  description: "Sistema de pedidos y órdenes de compra",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilActual();
  const flash = leerFlash();

  const gestiona =
    perfil?.rol === "aprobador" ||
    perfil?.rol === "compras" ||
    perfil?.rol === "superusuario";

  let pendientes = 0;
  if (gestiona) {
    const supabase = createClient();
    const estado = perfil?.rol === "compras" ? "aprobado" : "pendiente";
    const { count } = await supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("estado", estado);
    pendientes = count ?? 0;
  }

  const enlaces = [
    { href: "/pedidos/nuevo", texto: "Nuevo pedido" },
    { href: "/mis-pedidos", texto: "Mis pedidos" },
    ...(gestiona
      ? [
          { href: "/aprobacion", texto: "Gestión", contador: pendientes },
          { href: "/dashboard", texto: "Tablero" },
        ]
      : []),
    ...(perfil?.rol === "superusuario"
      ? [
          { href: "/admin/perfiles", texto: "Perfiles" },
          { href: "/admin/areas", texto: "Áreas" },
          { href: "/admin/categorias", texto: "Categorías" },
        ]
      : []),
  ];

  return (
    <html lang="es" className={inter.variable}>
      <body className={perfil ? "con-lateral" : ""}>
        {perfil && <Navegacion perfil={perfil} enlaces={enlaces} />}
        <main className="contenido">{children}</main>
        <Aviso flash={flash} />
      </body>
    </html>
  );
}
