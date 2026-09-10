import { asignarProveedorPedido } from "@/app/acciones";

type Proveedor = { id: string; nombre: string; activo: boolean };

export default function SelectorProveedor({
  pedido,
  proveedores,
}: {
  pedido: any;
  proveedores: Proveedor[];
}) {
  const valorActual = pedido.varios_proveedores
    ? "VARIOS"
    : pedido.proveedor_id ?? "";

  // Los inactivos no se ofrecen, salvo que sea el que ya está asignado
  const opciones = proveedores.filter(
    (p) => p.activo || p.id === pedido.proveedor_id
  );

  return (
    <div className="bloque-proveedor no-print">
      <form action={asignarProveedorPedido} className="fila-inline">
        <input type="hidden" name="pedido_id" value={pedido.id} />
        <div style={{ flex: "1 1 260px" }}>
          <label>Proveedor del pedido</label>
          <select name="proveedor_id" defaultValue={valorActual}>
            <option value="">Sin asignar</option>
            {opciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
            <option value="VARIOS">— Varios proveedores —</option>
          </select>
        </div>
        <button className="secondary" style={{ marginBottom: 14 }}>
          Guardar
        </button>
      </form>

      {pedido.varios_proveedores && (
        <p className="tenue chico" style={{ margin: "-8px 0 0" }}>
          Asigná el proveedor de cada artículo en la tabla. Se va a generar una
          orden de compra por proveedor.
        </p>
      )}

      {proveedores.length === 0 && (
        <p className="tenue chico" style={{ margin: "-8px 0 0" }}>
          Todavía no hay proveedores cargados. Agregalos desde la pestaña
          Proveedores.
        </p>
      )}
    </div>
  );
}
