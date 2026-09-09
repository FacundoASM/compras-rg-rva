import "./globals.css";
import { getPerfilActual } from "@/lib/supabase/server";
import BotonSalir from "./components/BotonSalir";
import Link from "next/link";

export const metadata = { title: "Compras RG-RVA" };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilActual();

  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <span className="brand">Compras RG-RVA</span>
          {perfil && (
            <nav className="nav">
              <Link href="/pedidos/nuevo">Nuevo pedido</Link>
              {(perfil.rol === "aprobador" || perfil.rol === "superusuario") && (
                <Link href="/aprobacion">Aprobación</Link>
              )}
              {perfil.rol === "compras" && (
                <Link href="/aprobacion">Pedidos</Link>
              )}
              {perfil.rol === "superusuario" && (
                <Link href="/admin/perfiles">Perfiles</Link>
              )}
              <span className="perfil-chip">
                {perfil.nombre} · {perfil.rol}
              </span>
              <BotonSalir />
            </nav>
          )}
        </header>
        <main className="content">{children}</main>
      </body>
    </html>
  );
}
