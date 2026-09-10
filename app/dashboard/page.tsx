import { createClient, getPerfilActual } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const perfil = await getPerfilActual();
  if (!["aprobador", "compras", "superusuario"].includes(perfil?.rol ?? "")) {
    redirect("/mis-pedidos");
  }

  const supabase = createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, items_pedido(*, subcategorias(nombre, categorias(nombre)))");

  const todos = pedidos ?? [];
  const doceMeses = new Date();
  doceMeses.setMonth(doceMeses.getMonth() - 11);

  // --- Métricas de cabecera ---
  const pendientes = todos.filter((p: any) => p.estado === "pendiente");
  const aprobados = todos.filter((p: any) => p.estado === "aprobado");
  const entregados = todos.filter((p: any) => p.estado === "entregado");

  const gastoTotal = todos
    .filter((p: any) => ["aprobado", "entregado"].includes(p.estado))
    .reduce((a: number, p: any) => a + totalPedido(p), 0);

  // Tiempo promedio de aprobación (días)
  const conAprobacion = todos.filter((p: any) => p.fecha_aprobacion);
  const diasAprobacion =
    conAprobacion.length > 0
      ? conAprobacion.reduce(
          (a: number, p: any) =>
            a + dias(new Date(p.fecha), new Date(p.fecha_aprobacion)),
          0
        ) / conAprobacion.length
      : null;

  // Tiempo promedio de entrega desde la aprobación
  const conEntrega = todos.filter(
    (p: any) => p.fecha_entrega && p.fecha_aprobacion
  );
  const diasEntrega =
    conEntrega.length > 0
      ? conEntrega.reduce(
          (a: number, p: any) =>
            a + dias(new Date(p.fecha_aprobacion), new Date(p.fecha_entrega)),
          0
        ) / conEntrega.length
      : null;

  // --- Agrupaciones ---
  const porCategoria = agrupar(todos, (it: any) =>
    it.subcategorias?.categorias?.nombre ?? "Sin categoría"
  );
  const porSubcategoria = agrupar(todos, (it: any) =>
    it.subcategorias
      ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
      : "Sin categoría"
  );
  const porArea = agruparPedidos(todos, (p: any) => p.area || "Sin asignar");
  const porProveedor = agrupar(todos, (it: any) => it.proveedor || null);

  const masPedidos = agrupar(todos, (it: any) =>
    it.descripcion.trim().toLowerCase()
  ).slice(0, 8);

  return (
    <div>
      <h2>Tablero de compras</h2>

      <div className="metricas">
        <Metrica etiqueta="Pendientes de aprobar" valor={pendientes.length} />
        <Metrica etiqueta="Aprobados sin entregar" valor={aprobados.length} />
        <Metrica etiqueta="Entregados" valor={entregados.length} />
        <Metrica
          etiqueta="Gasto registrado"
          valor={gastoTotal > 0 ? `$${miles(gastoTotal)}` : "—"}
        />
        <Metrica
          etiqueta="Demora en aprobar"
          valor={diasAprobacion !== null ? `${diasAprobacion.toFixed(1)} días` : "—"}
        />
        <Metrica
          etiqueta="Demora en entregar"
          valor={diasEntrega !== null ? `${diasEntrega.toFixed(1)} días` : "—"}
        />
      </div>

      {gastoTotal === 0 && (
        <p className="aviso">
          Todavía no hay costos cargados. Compras puede cargarlos en cada ítem
          desde la pantalla de pedidos, y a partir de ahí el tablero muestra gasto
          por categoría, área y proveedor.
        </p>
      )}

      <Ranking
        titulo="Por categoría"
        filas={porCategoria}
        vacio="Todavía no hay ítems categorizados."
      />

      <Ranking
        titulo="Por subcategoría"
        filas={porSubcategoria.slice(0, 10)}
        vacio="Todavía no hay ítems categorizados."
      />

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Por área solicitante</h3>
        {porArea.length === 0 ? (
          <p className="vacio">Sin datos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th style={{ width: 100, textAlign: "right" }}>Pedidos</th>
                <th style={{ width: 140, textAlign: "right" }}>Gasto</th>
              </tr>
            </thead>
            <tbody>
              {porArea.map((f) => (
                <tr key={f.clave}>
                  <td>{f.clave}</td>
                  <td style={{ textAlign: "right" }}>{f.pedidos}</td>
                  <td style={{ textAlign: "right" }}>
                    {f.gasto > 0 ? `$${miles(f.gasto)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Artículos más pedidos</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -8 }}>
          Candidatos a comprar por volumen o dejar en stock.
        </p>
        {masPedidos.length === 0 ? (
          <p className="vacio">Sin datos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Artículo</th>
                <th style={{ width: 90, textAlign: "right" }}>Veces</th>
                <th style={{ width: 100, textAlign: "right" }}>Unidades</th>
              </tr>
            </thead>
            <tbody>
              {masPedidos.map((f) => (
                <tr key={f.clave}>
                  <td style={{ textTransform: "capitalize" }}>{f.clave}</td>
                  <td style={{ textAlign: "right" }}>{f.veces}</td>
                  <td style={{ textAlign: "right" }}>{f.unidades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {porProveedor.length > 0 && (
        <Ranking titulo="Por proveedor" filas={porProveedor} vacio="" />
      )}
    </div>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: any }) {
  return (
    <div className="metrica">
      <p className="metrica-label">{etiqueta}</p>
      <p className="metrica-valor">{valor}</p>
    </div>
  );
}

function Ranking({
  titulo,
  filas,
  vacio,
}: {
  titulo: string;
  filas: any[];
  vacio: string;
}) {
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3>{titulo}</h3>
      {filas.length === 0 ? (
        <p className="vacio">{vacio}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{titulo.replace("Por ", "")}</th>
              <th style={{ width: 90, textAlign: "right" }}>Ítems</th>
              <th style={{ width: 100, textAlign: "right" }}>Unidades</th>
              <th style={{ width: 140, textAlign: "right" }}>Gasto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave}>
                <td>{f.clave}</td>
                <td style={{ textAlign: "right" }}>{f.veces}</td>
                <td style={{ textAlign: "right" }}>{f.unidades}</td>
                <td style={{ textAlign: "right" }}>
                  {f.gasto > 0 ? `$${miles(f.gasto)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- helpers ----------

function totalPedido(p: any) {
  return p.items_pedido.reduce(
    (a: number, it: any) =>
      a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
    0
  );
}

function dias(desde: Date, hasta: Date) {
  return (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
}

function miles(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

function agrupar(pedidos: any[], clavePorItem: (it: any) => string | null) {
  const mapa = new Map<
    string,
    { clave: string; veces: number; unidades: number; gasto: number }
  >();

  for (const p of pedidos) {
    if (p.estado === "cancelado" || p.estado === "rechazado") continue;
    for (const it of p.items_pedido) {
      const clave = clavePorItem(it);
      if (!clave) continue;
      const actual = mapa.get(clave) ?? {
        clave,
        veces: 0,
        unidades: 0,
        gasto: 0,
      };
      actual.veces += 1;
      actual.unidades += Number(it.cantidad);
      actual.gasto += Number(it.costo_unitario ?? 0) * Number(it.cantidad);
      mapa.set(clave, actual);
    }
  }

  return [...mapa.values()].sort(
    (a, b) => b.gasto - a.gasto || b.unidades - a.unidades
  );
}

function agruparPedidos(pedidos: any[], clave: (p: any) => string) {
  const mapa = new Map<
    string,
    { clave: string; pedidos: number; gasto: number }
  >();

  for (const p of pedidos) {
    if (p.estado === "cancelado" || p.estado === "rechazado") continue;
    const k = clave(p);
    const actual = mapa.get(k) ?? { clave: k, pedidos: 0, gasto: 0 };
    actual.pedidos += 1;
    actual.gasto += totalPedido(p);
    mapa.set(k, actual);
  }

  return [...mapa.values()].sort(
    (a, b) => b.gasto - a.gasto || b.pedidos - a.pedidos
  );
}
