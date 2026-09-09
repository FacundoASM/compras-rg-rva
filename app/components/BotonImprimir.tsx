"use client";

export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
  );
}
