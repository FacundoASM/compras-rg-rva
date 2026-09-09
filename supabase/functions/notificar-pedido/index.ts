import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Se dispara desde un trigger de Postgres cuando se crea un pedido (tipo: "nuevo")
// o cuando se aprueba (tipo: "aprobado"). Envia el aviso por correo via Resend.
// Requiere el secreto RESEND_API_KEY configurado en el proyecto de Supabase
// (Dashboard > Edge Functions > notificar-pedido > Secrets).

Deno.serve(async (req: Request) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Falta configurar RESEND_API_KEY" }),
      { status: 500 }
    );
  }

  const { tipo, numero, area, solicitante, destinatarios } = await req.json();

  if (!destinatarios || destinatarios.length === 0) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "sin destinatarios configurados" }),
      { status: 200 }
    );
  }

  const asunto =
    tipo === "nuevo"
      ? `Nuevo pedido pendiente de aprobacion: ${numero}`
      : `Pedido aprobado, listo para compra: ${numero}`;

  const cuerpo =
    tipo === "nuevo"
      ? `Se cargo el pedido ${numero} (area ${area}, solicitante ${solicitante}). Ingresa al sistema para revisarlo.`
      : `El pedido ${numero} (area ${area}, solicitante ${solicitante}) fue aprobado. Ya se puede generar la orden de compra.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Compras RG-RVA <avisos@resend.dev>",
      to: destinatarios,
      subject: asunto,
      text: cuerpo,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500 });
});
