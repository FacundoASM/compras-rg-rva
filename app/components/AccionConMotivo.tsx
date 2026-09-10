"use client";

import { useState } from "react";

export default function AccionConMotivo({
  accion,
  pedidoId,
  decision,
  etiqueta,
  clase,
  titulo,
  motivoObligatorio = true,
}: {
  accion: (formData: FormData) => Promise<void>;
  pedidoId: string;
  decision: string;
  etiqueta: string;
  clase?: string;
  titulo: string;
  motivoObligatorio?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!abierto) {
    return (
      <button type="button" className={clase} onClick={() => setAbierto(true)}>
        {etiqueta}
      </button>
    );
  }

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (motivoObligatorio && !motivo.trim()) {
          e.preventDefault();
          setError("Escribí un motivo");
        }
      }}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        width: "100%",
        background: "#fbfaf8",
      }}
    >
      <input type="hidden" name="id" value={pedidoId} />
      <input type="hidden" name="decision" value={decision} />
      <label>{titulo}</label>
      <input
        name="motivo"
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value);
          setError("");
        }}
        placeholder={
          motivoObligatorio ? "Motivo (lo va a ver el solicitante)" : "Motivo (opcional)"
        }
        style={{ marginBottom: 8 }}
      />
      {error && (
        <p style={{ color: "var(--danger-txt)", fontSize: 13, margin: "0 0 8px" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className={clase}>
          Confirmar
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setAbierto(false);
            setMotivo("");
            setError("");
          }}
        >
          Volver
        </button>
      </div>
    </form>
  );
}
