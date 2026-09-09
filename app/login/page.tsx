"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Ingresá tu correo");
      return;
    }
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setEnviado(true);
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: "60px auto" }}>
      <p style={{ fontWeight: 500, marginBottom: 16 }}>Ingresar</p>
      {enviado ? (
        <p style={{ fontSize: 14 }}>
          Te enviamos un link de acceso a {email}. Revisá tu correo.
        </p>
      ) : (
        <form onSubmit={enviarLink}>
          <label>Correo electrónico</label>
          <input
            type="email"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p style={{ color: "var(--danger-txt)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button type="submit">Enviar link de acceso</button>
        </form>
      )}
    </div>
  );
}
