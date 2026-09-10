import { createClient, getPerfilActual } from "@/lib/supabase/server";
import FiltrosTablero from "@/app/components/FiltrosTablero";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const perfil = await getPerfilActual();
  if (!["aprobador", "compras", "superusuario"].includes(perfil?.rol ?? "")) {
    redirect("/mis-pedidos");
  }

  const supabase = createClient();

  const periodo = searchParams.periodo ?? "6";
  const filtroArea = searchParams.area ?? "";
  const filtroCategoria = searchParams.categoria ?? "";
  const meses = periodo === "todo" ? null : Number(periodo);

  let consulta = supabase
    .from("pedidos")
    .select(
      "*, items_pedido(*, subcategorias(nombre, categoria_id, categorias(nombre)))"
    );

  if (meses) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - (meses - 1));
    desde.setDate(1);
    desde.setHours(0, 0, 0, 0);
    consulta = consulta.gte("fecha", desde.toISOString());
  }
  if (filtroArea) consulta = consulta.eq("area", filtroArea);

  const [{ data }, { data: areasData }, { data: cats }] = await Promise.all([
    consulta,
    supabase.from("areas").select("nombre").order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
  ]);

  let todos = data ?? [];

  // El filtro de categoría se aplica sobre los ítems: se dejan solo los
  // que pertenecen a la categoría elegida, y los pedidos que quedan sin ítems salen.
  if (filtroCategoria) {
    todos = todos
      .map((p: any) => ({
        ...p,
        items_pedido: p.items_pedido.filter(
          (it: any) => it.subcategorias?.categoria_id === filtroCategoria
        ),
      }))
      .filter((p: any) => p.items_pedido.length > 0);
  }

  const vigentes = todos.filter(
    (p: any) => !["cancelado", "rechazado"].includes(p.estado)
  );

  const pendientes = todos.filter((p: any) => p.estado === "pendiente").length;
  const aprobados = todos.filter((p: any) => p.estado === "aprobado").length;
  const entregados = todos.filter((p: any) => p.estado === "entregado").length;
  const gastoTotal = vigentes.reduce((a, p) => a + totalPedido(p), 0);

  const conAprob = todos.filter((p: any) => p.fecha_aprobacion);
  const demoraAprob = promedio(
    conAprob.map((p: any) => dias(p.fecha, p.fecha_aprobacion))
  );
  const conEnt = todos.filter((p: any) => p.fecha_entrega && p.fecha_aprobacion);
  const demoraEnt = promedio(
    conEnt.map((p: any) => dias(p.fecha_aprobacion, p.fecha_entrega))
  );

  const porMes = serieMensual(vigentes, meses ?? 12);
  const porCategoria = agrupar(vigentes, (it: any) =>
    it.subcategorias?.categorias?.nombre ?? "Sin categoría"
  ).slice(0, 6);
  const porArea = agruparPedidos(vigentes).slice(0, 6);
  const porProveedor = agrupar(vigentes, (it: any) => it.proveedor || null).slice(0, 6);
  const masPedidos = agrupar(vigentes, (it: any) =>
    it.descripcion.trim().toLowerCase()
  )
    .sort((a, b) => b.veces - a.veces || b.unidades - a.unidades)
    .slice(0, 8);

  const sinCostos = gastoTotal === 0;

  return (
    <div>
      <h2>Tablero de compras</h2>
      <p className="subtitulo">
        {vigentes.length} pedido(s) vigentes en el período. No se cuentan los
        cancelados ni los rechazados.
      </p>

      <FiltrosTablero
        areas={(areasData ?? []).map((a: any) => a.nombre)}
        categorias={cats ?? []}
      />

      {vigentes.length === 0 && (
        <div className="card">
          <p className="vacio">
            Ningún pedido coincide con los filtros elegidos.
          </p>
        </div>
      )}

      <div className="metricas">
        <Metrica etiqueta="Por aprobar" valor={pendientes} />
        <Metrica etiqueta="Sin entregar" valor={aprobados} />
        <Metrica etiqueta="Entregados" valor={entregados} />
        <Metrica
          etiqueta="Gasto registrado"
          valor={sinCostos ? "—" : `$${miles(gastoTotal)}`}
        />
        <Metrica
          etiqueta="Demora en aprobar"
          valor={demoraAprob === null ? "—" : `${demoraAprob.toFixed(1)} d`}
        />
        <Metrica
          etiqueta="Demora en entregar"
          valor={demoraEnt === null ? "—" : `${demoraEnt.toFixed(1)} d`}
        />
      </div>

      {sinCostos && (
        <p className="aviso">
          Todavía no hay costos cargados. Compras los carga en cada ítem desde
          Gestión, y a partir de ahí el tablero muestra gasto por categoría, área
          y proveedor.
        </p>
      )}

      {porMes.length > 1 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>{sinCostos ? "Pedidos por mes" : "Gasto por mes"}</h3>
          <GraficoLinea puntos={porMes} moneda={!sinCostos} />
        </div>
      )}

      <div className="grilla-2" style={{ marginTop: 16 }}>
        <Barras
          titulo="Por categoría"
          filas={porCategoria}
          moneda={!sinCostos}
          vacio="Todavía no hay ítems categorizados."
        />
        <Barras
          titulo="Por área solicitante"
          filas={porArea}
          moneda={!sinCostos}
          naranja
          vacio="Sin datos."
        />
      </div>

      <div className="grilla-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Artículos más pedidos</h3>
          <p className="subtitulo chico" style={{ marginTop: -4 }}>
            Candidatos a comprar por volumen o dejar en stock.
          </p>
          {masPedidos.length === 0 ? (
            <p className="vacio">Sin datos.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th className="der" style={{ width: 70 }}>Veces</th>
                  <th className="der" style={{ width: 80 }}>Unid.</th>
                </tr>
              </thead>
              <tbody>
                {masPedidos.map((f) => (
                  <tr key={f.clave}>
                    <td data-col="Artículo" style={{ textTransform: "capitalize" }}>
                      {f.clave}
                    </td>
                    <td data-col="Veces" className="der">{f.veces}</td>
                    <td data-col="Unidades" className="der">{f.unidades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {porProveedor.length > 0 ? (
          <Barras
            titulo="Por proveedor"
            filas={porProveedor}
            moneda={!sinCostos}
            vacio=""
          />
        ) : (
          <div className="card">
            <h3>Por proveedor</h3>
            <p className="vacio">
              Cuando compras cargue el proveedor en los ítems, acá vas a ver en
              quién se concentra el gasto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- piezas ---------- */

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: any }) {
  return (
    <div className="metrica">
      <p className="metrica-label">{etiqueta}</p>
      <p className="metrica-valor">{valor}</p>
    </div>
  );
}

function Barras({
  titulo,
  filas,
  moneda,
  naranja,
  vacio,
}: {
  titulo: string;
  filas: { clave: string; unidades: number; gasto: number }[];
  moneda: boolean;
  naranja?: boolean;
  vacio: string;
}) {
  const valor = (f: any) => (moneda ? f.gasto : f.unidades);
  const tope = Math.max(...filas.map(valor), 1);

  return (
    <div className="card">
      <h3>{titulo}</h3>
      {filas.length === 0 ? (
        <p className="vacio">{vacio}</p>
      ) : (
        <div className="barras">
          {filas.map((f) => (
            <div className="barra-fila" key={f.clave}>
              <div className="barra-cab">
                <span>{f.clave}</span>
                <span className="valor">
                  {moneda ? `$${miles(f.gasto)}` : `${f.unidades} u.`}
                </span>
              </div>
              <div className="barra-canal">
                <div
                  className={`barra-relleno ${naranja ? "naranja" : ""}`}
                  style={{ width: `${Math.max(2, (valor(f) / tope) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GraficoLinea({
  puntos,
  moneda,
}: {
  puntos: { mes: string; valor: number }[];
  moneda: boolean;
}) {
  const ancho = 640;
  const alto = 180;
  const padX = 8;
  const padTop = 14;
  const padBot = 26;
  const tope = Math.max(...puntos.map((p) => p.valor), 1);

  const x = (i: number) =>
    padX + (i * (ancho - padX * 2)) / Math.max(1, puntos.length - 1);
  const y = (v: number) =>
    padTop + (1 - v / tope) * (alto - padTop - padBot);

  const linea = puntos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ");
  const area = `${padX},${alto - padBot} ${linea} ${ancho - padX},${alto - padBot}`;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="grafico-linea"
      role="img"
      aria-label={`Evolución mensual: ${puntos
        .map((p) => `${p.mes} ${p.valor}`)
        .join(", ")}`}
    >
      <polygon points={area} fill="rgba(31, 92, 158, .1)" />
      <polyline
        points={linea}
        fill="none"
        stroke="#1f5c9e"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {puntos.map((p, i) => (
        <circle key={p.mes} cx={x(i)} cy={y(p.valor)} r="3.5" fill="#1f5c9e" />
      ))}
      {puntos.map((p, i) => (
        <text
          key={`t${p.mes}`}
          x={x(i)}
          y={alto - 9}
          textAnchor="middle"
          className="eje-texto"
        >
          {p.mes}
        </text>
      ))}
      <text x={padX} y={10} className="eje-texto">
        {moneda ? `máx $${miles(tope)}` : `máx ${tope}`}
      </text>
    </svg>
  );
}

/* ---------- cálculos ---------- */

function totalPedido(p: any) {
  return p.items_pedido.reduce(
    (a: number, it: any) =>
      a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
    0
  );
}

function dias(desde: string, hasta: string) {
  return (
    (new Date(hasta).getTime() - new Date(desde).getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

function promedio(nums: number[]) {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function miles(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function serieMensual(pedidos: any[], meses: number) {
  const hoy = new Date();
  const claves: { mes: string; clave: string }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    claves.push({
      mes: MESES[d.getMonth()],
      clave: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }

  const hayCostos = pedidos.some((p) => totalPedido(p) > 0);

  return claves.map(({ mes, clave }) => {
    const delMes = pedidos.filter((p: any) => {
      const d = new Date(p.fecha);
      return `${d.getFullYear()}-${d.getMonth()}` === clave;
    });
    return {
      mes,
      valor: hayCostos
        ? delMes.reduce((a, p) => a + totalPedido(p), 0)
        : delMes.length,
    };
  });
}

function agrupar(pedidos: any[], clavePorItem: (it: any) => string | null) {
  const mapa = new Map<string, { clave: string; veces: number; unidades: number; gasto: number }>();
  for (const p of pedidos) {
    for (const it of p.items_pedido) {
      const clave = clavePorItem(it);
      if (!clave) continue;
      const a = mapa.get(clave) ?? { clave, veces: 0, unidades: 0, gasto: 0 };
      a.veces += 1;
      a.unidades += Number(it.cantidad);
      a.gasto += Number(it.costo_unitario ?? 0) * Number(it.cantidad);
      mapa.set(clave, a);
    }
  }
  return [...mapa.values()].sort((a, b) => b.gasto - a.gasto || b.unidades - a.unidades);
}

function agruparPedidos(pedidos: any[]) {
  const mapa = new Map<string, { clave: string; veces: number; unidades: number; gasto: number }>();
  for (const p of pedidos) {
    const k = p.area || "Sin asignar";
    const a = mapa.get(k) ?? { clave: k, veces: 0, unidades: 0, gasto: 0 };
    a.veces += 1;
    a.unidades += p.items_pedido.reduce(
      (s: number, it: any) => s + Number(it.cantidad),
      0
    );
    a.gasto += totalPedido(p);
    mapa.set(k, a);
  }
  return [...mapa.values()].sort((a, b) => b.gasto - a.gasto || b.unidades - a.unidades);
}
