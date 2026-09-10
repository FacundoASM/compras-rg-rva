"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Enlace = { href: string; texto: string; contador?: number };

export default function Navegacion({
  perfil,
  enlaces,
}: {
  perfil: { nombre: string; rol: string; area: string };
  enlaces: Enlace[];
}) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const iniciales = perfil.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <button
        className="menu-movil no-print"
        onClick={() => setAbierto(!abierto)}
        aria-label="Abrir menú"
        aria-expanded={abierto}
      >
        <span className="hamburguesa" />
      </button>

      {abierto && (
        <div className="fondo-menu" onClick={() => setAbierto(false)} />
      )}

      <aside className={`lateral no-print ${abierto ? "abierto" : ""}`}>
        <Link href="/" className="marca" onClick={() => setAbierto(false)}>
          <Image
            src="/rv-logo.jpg"
            alt="Radio Victoria"
            width={1218}
            height={177}
            priority
          />
          <span className="marca-sub">Compras</span>
        </Link>

        <nav className="menu">
          {enlaces.map((e) => {
            const activo =
              ruta === e.href || (e.href !== "/" && ruta.startsWith(e.href));
            return (
              <Link
                key={e.href}
                href={e.href}
                className={activo ? "activo" : ""}
                onClick={() => setAbierto(false)}
              >
                <span>{e.texto}</span>
                {e.contador ? (
                  <span className="contador">{e.contador}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="usuario">
          <div className="avatar">{iniciales}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="usuario-nombre">{perfil.nombre}</p>
            <p className="usuario-rol">
              {perfil.rol} · {perfil.area}
            </p>
          </div>
          <button className="salir" onClick={salir} title="Cerrar sesión">
            Salir
          </button>
        </div>
      </aside>
    </>
  );
}
