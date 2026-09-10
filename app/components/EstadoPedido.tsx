const PASOS = ["pendiente", "aprobado", "entregado"] as const;

const ETIQUETAS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  entregado: "Entregado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

export default function EstadoPedido({ estado }: { estado: string }) {
  // Rechazado y cancelado salen del circuito: se muestran como corte
  if (estado === "rechazado" || estado === "cancelado") {
    return (
      <div className={`pasos cortado ${estado}`}>
        <span className="paso hecho">Pendiente</span>
        <span className="linea" />
        <span className="paso corte">{ETIQUETAS[estado]}</span>
      </div>
    );
  }

  const indice = PASOS.indexOf(estado as (typeof PASOS)[number]);

  return (
    <div className="pasos">
      {PASOS.map((p, i) => (
        <span key={p} style={{ display: "contents" }}>
          {i > 0 && <span className={`linea ${i <= indice ? "hecha" : ""}`} />}
          <span
            className={`paso ${i < indice ? "hecho" : ""} ${
              i === indice ? "actual" : ""
            }`}
          >
            {ETIQUETAS[p]}
          </span>
        </span>
      ))}
    </div>
  );
}
