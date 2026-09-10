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
  const gestiona =
    perfil?.rol === "aprobador" ||
    perfil?.rol === "compras" ||
    perfil?.rol === "superusuario";

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
              {gestiona && <Link href="/aprobacion">Gestión</Link>}
              {gestiona && <Link href="/dashboard">Tablero</Link>}
              {perfil.rol === "superusuario" && (
                <>
                  <Link href="/admin/perfiles">Perfiles</Link>
                  <Link href="/admin/categorias">Categorías</Link>
                </>
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
