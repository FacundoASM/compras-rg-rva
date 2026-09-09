import "./globals.css";
import { getPerfilActual } from "@/lib/supabase/server";
import BotonSalir from "./components/BotonSalir";
import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Compras · Radio Victoria" };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilActual();

  return (
    <html lang="es">
      <body>
        <header className="topbar no-print">
          <Link href="/" className="brand">
            <Image
              src="/rv-logo.jpg"
              alt="Radio Victoria"
              width={1218}
              height={177}
              priority
            />
            <span className="brand-sub">Compras</span>
          </Link>
          {perfil && (
            <nav className="nav">
              <Link href="/pedidos/nuevo">Nuevo pedido</Link>
              <Link href="/mis-pedidos">Mis pedidos</Link>
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
