"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"ingresar" | "registrar">("ingresar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Completá correo y contraseña");
      return;
    }
    if (modo === "registrar" && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setError("");
    setCargando(true);

    const supabase = createClient();
    const { error } =
      modo === "ingresar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setCargando(false);
    if (error) {
      setError(traducir(error.message));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="pantalla-login">
      <div className="caja-login">
        <Image
          src="/rv-logo.jpg"
          alt="Radio Victoria"
          width={1218}
          height={177}
          priority
          className="logo-login"
        />
        <p className="login-titulo">Sistema de compras</p>

        <div className="pestanas">
          <button
            type="button"
            className={modo === "ingresar" ? "activa" : ""}
            onClick={() => {
              setModo("ingresar");
              setError("");
            }}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={modo === "registrar" ? "activa" : ""}
            onClick={() => {
              setModo("registrar");
              setError("");
            }}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar}>
          <label>Correo electrónico</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="nombre@radiovictoria.com.ar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Contraseña</label>
          <input
            type="password"
            autoComplete={
              modo === "ingresar" ? "current-password" : "new-password"
            }
            placeholder={modo === "registrar" ? "Mínimo 6 caracteres" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error-login">{error}</p>}
          <button type="submit" disabled={cargando} style={{ width: "100%" }}>
            {cargando
              ? "Un momento..."
              : modo === "ingresar"
              ? "Ingresar"
              : "Crear cuenta"}
          </button>
        </form>

        <p className="pie-login">
          {modo === "registrar"
            ? "Al crear la cuenta entrás como solicitante. El administrador te asigna nombre, área y rol."
            : "¿Olvidaste la contraseña? Pedile al administrador del sistema que te asigne una nueva."}
        </p>
      </div>
    </div>
  );
}

function traducir(mensaje: string) {
  if (mensaje.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos";
  if (mensaje.includes("already registered"))
    return "Ese correo ya tiene una cuenta. Probá ingresando.";
  if (mensaje.includes("Password should be"))
    return "La contraseña debe tener al menos 6 caracteres";
  return mensaje;
}
