"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      setError(traducirError(error.message));
      return;
    }

    router.push("/pedidos/nuevo");
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: "60px auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={modo === "ingresar" ? "" : "secondary"}
          onClick={() => {
            setModo("ingresar");
            setError("");
          }}
        >
          Ingresar
        </button>
        <button
          type="button"
          className={modo === "registrar" ? "" : "secondary"}
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
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Contraseña</label>
        <input
          type="password"
          placeholder={modo === "registrar" ? "Mínimo 6 caracteres" : ""}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p style={{ color: "var(--danger-txt)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={cargando}>
          {cargando
            ? "Un momento..."
            : modo === "ingresar"
            ? "Ingresar"
            : "Crear cuenta"}
        </button>
      </form>

      {modo === "registrar" && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, marginBottom: 0 }}>
          Al crear la cuenta entrás como solicitante. El administrador te asigna
          nombre, área y rol.
        </p>
      )}
    </div>
  );
}

function traducirError(mensaje: string) {
  if (mensaje.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos";
  if (mensaje.includes("already registered"))
    return "Ese correo ya tiene una cuenta. Probá ingresando.";
  if (mensaje.includes("Password should be"))
    return "La contraseña debe tener al menos 6 caracteres";
  return mensaje;
}
