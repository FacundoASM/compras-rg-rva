import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/empresa";
import BotonImprimir from "@/app/components/BotonImprimir";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OCPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      "*, proveedores(*), items_pedido(*, proveedores(*), subcategorias(nombre, categorias(nombre)))"
    )
    .eq("id", params.id)
    .single();

  if (!pedido) {
    return (
      <div className="card">
        <p className="vacio">No se encontró el pedido.</p>
      </div>
    );
  }

  if (!["aprobado", "entregado"].includes(pedido.estado)) {
    return (
      <div className="card">
        <p className="vacio">
          El pedido {pedido.numero} está {pedido.estado}. La orden de compra se
          genera una vez aprobado. <Link href="/mis-pedidos">Volver</Link>
        </p>
      </div>
    );
  }

  const base = pedido.numero.replace("PED-", "OC-");
  const fechaEmision = new Date(pedido.fecha_aprobacion ?? pedido.fecha);

  // Agrupar los ítems por proveedor: una orden de compra por cada uno.
  const grupos = agruparPorProveedor(pedido);
  const varias = grupos.length > 1;

  return (
    <div>
      <div className="barra-oc no-print">
        <Link href="/aprobacion">← Volver</Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {varias && (
            <span className="tenue chico">
              {grupos.length} órdenes, una por proveedor
            </span>
          )}
          <BotonImprimir />
        </div>
      </div>

      {grupos.some((g) => !g.proveedor) && (
        <p className="aviso no-print">
          Hay artículos sin proveedor asignado. Aparecen en una orden aparte, sin
          los datos del proveedor. Podés asignarlos desde Gestión.
        </p>
      )}

      {grupos.map((grupo, i) => (
        <Orden
          key={grupo.clave}
          numero={varias ? `${base}-${LETRAS[i]}` : base}
          pedido={pedido}
          fechaEmision={fechaEmision}
          proveedor={grupo.proveedor}
          items={grupo.items}
        />
      ))}
    </div>
  );
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Orden({
  numero,
  pedido,
  fechaEmision,
  proveedor,
  items,
}: {
  numero: string;
  pedido: any;
  fechaEmision: Date;
  proveedor: any | null;
  items: any[];
}) {
  const conPrecios = items.some((it) => it.costo_unitario);
  const total = items.reduce(
    (a, it) => a + Number(it.costo_unitario ?? 0) * Number(it.cantidad),
    0
  );

  return (
    <div className="oc">
      {/* ---- Encabezado ---- */}
      <div className="oc-encabezado">
        <Image
          src="/rv-logo.jpg"
          alt={EMPRESA.nombre}
          width={1218}
          height={177}
        />
        <div className="oc-titulo">
          <h1>Orden de compra</h1>
          <p className="oc-numero">{numero}</p>
          <p className="oc-fecha">
            {fechaEmision.toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      {/* ---- Proveedor y cliente ---- */}
      <div className="oc-partes">
        <div className="oc-parte">
          <p className="oc-parte-titulo">Datos del proveedor</p>
          {proveedor ? (
            <dl className="oc-lista">
              <Dato etiqueta="Nombre" valor={proveedor.nombre} />
              <Dato etiqueta="Dirección" valor={proveedor.direccion} />
              <Dato etiqueta="Provincia" valor={proveedor.provincia} />
              <Dato etiqueta="CUIT" valor={proveedor.cuit} />
              <Dato etiqueta="Teléfono" valor={proveedor.telefono} />
              <Dato etiqueta="E-mail" valor={proveedor.email} />
              <Dato
                etiqueta="Cuenta contable"
                valor={proveedor.cuenta_contable}
                soloPantalla
              />
              <Dato etiqueta="Cond. de pago" valor={proveedor.condiciones_pago} />
            </dl>
          ) : (
            <p className="oc-sin-proveedor">Sin proveedor asignado</p>
          )}
        </div>

        <div className="oc-parte">
          <p className="oc-parte-titulo">Datos del cliente</p>
          <dl className="oc-lista">
            <Dato etiqueta="Nombre" valor={EMPRESA.razonSocial} />
            <Dato etiqueta="Dirección" valor={EMPRESA.domicilio} />
            <Dato etiqueta="CUIT" valor={EMPRESA.cuit} />
            <Dato etiqueta="Teléfono" valor={EMPRESA.telefono} />
            <Dato etiqueta="E-mail" valor={EMPRESA.email} />
          </dl>
        </div>
      </div>

      {/* ---- Detalle ---- */}
      <table className="oc-tabla">
        <thead>
          <tr>
            <th className="col-num">#</th>
            <th style={{ width: "26%" }}>Artículo</th>
            <th>Descripción</th>
            <th className="col-cant">Unidades</th>
            {conPrecios && <th className="col-precio">Precio unitario</th>}
            {conPrecios && <th className="col-precio">Precio total</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td className="col-num">{i + 1}</td>
              <td>
                {it.subcategorias
                  ? `${it.subcategorias.categorias?.nombre} › ${it.subcategorias.nombre}`
                  : "—"}
              </td>
              <td>
                {it.descripcion}
                {it.observaciones && (
                  <>
                    <br />
                    <span className="oc-observacion">{it.observaciones}</span>
                  </>
                )}
              </td>
              <td className="col-cant">{it.cantidad}</td>
              {conPrecios && (
                <td className="col-precio">
                  {it.costo_unitario ? pesos(it.costo_unitario) : "—"}
                </td>
              )}
              {conPrecios && (
                <td className="col-precio">
                  {it.costo_unitario
                    ? pesos(Number(it.costo_unitario) * Number(it.cantidad))
                    : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {conPrecios && (
        <div className="oc-totales">
          <div className="oc-total-fila">
            <span>Total</span>
            <span className="oc-total-monto">{pesos(total)}</span>
          </div>
        </div>
      )}

      <div className="oc-nota">
        Documento generado electrónicamente por el sistema de compras de{" "}
        {EMPRESA.nombre}. Ante cualquier discrepancia, citar el número {numero}.
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  soloPantalla,
}: {
  etiqueta: string;
  valor?: string | null;
  /** Se ve en pantalla pero no sale impreso ni en el PDF. */
  soloPantalla?: boolean;
}) {
  if (!valor) return null;
  return (
    <div className={`oc-dato ${soloPantalla ? "no-print solo-pantalla" : ""}`}>
      <dt>{etiqueta}:</dt>
      <dd>
        {valor}
        {soloPantalla && (
          <span className="marca-interna" title="Este dato no sale impreso">
            no se imprime
          </span>
        )}
      </dd>
    </div>
  );
}

function pesos(n: number | string) {
  return `$${Number(n).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Grupo = { clave: string; proveedor: any; items: any[] };

/** Un grupo por proveedor. Si el pedido tiene proveedor único, devuelve uno solo. */
function agruparPorProveedor(pedido: any): Grupo[] {
  if (!pedido.varios_proveedores) {
    return [
      {
        clave: pedido.proveedor_id ?? "sin",
        proveedor: pedido.proveedores ?? null,
        items: pedido.items_pedido,
      },
    ];
  }

  const mapa = new Map<string, Grupo>();
  for (const it of pedido.items_pedido) {
    const clave: string = it.proveedor_id ?? "sin";
    const grupo: Grupo = mapa.get(clave) ?? {
      clave,
      proveedor: it.proveedores ?? null,
      items: [],
    };
    grupo.items.push(it);
    mapa.set(clave, grupo);
  }

  // Los que no tienen proveedor, al final
  return [...mapa.values()].sort((a: Grupo, b: Grupo) => {
    if (a.clave === "sin") return 1;
    if (b.clave === "sin") return -1;
    return (a.proveedor?.nombre ?? "").localeCompare(b.proveedor?.nombre ?? "");
  });
}
