# Manual de uso

Para todo el personal. Cada sección aclara a qué rol le corresponde.

---

## Entrar al sistema

Dirección: la que informe Sistemas (por ejemplo
`https://compras.radiovictoria.com.ar`).

**La primera vez:** elegir la pestaña **Crear cuenta**, poner el correo de
trabajo y una contraseña de al menos 6 caracteres. No llega ningún mail de
confirmación: se entra directo.

Al entrar por primera vez el sistema te muestra como **solicitante**, con área
"Sin asignar". Avisale al administrador para que te asigne tu nombre real, tu
área y el rol que corresponda.

**Si olvidaste la contraseña:** no hay recuperación automática. Pedile al
administrador del sistema que te asigne una nueva.

---

## Cargar un pedido

*Todos los roles.*

Menú **Nuevo pedido**.

Un pedido puede tener varios artículos. Para cada uno:

1. **Descripción.** Lo más específico posible: "Resma A4 75g" sirve mucho más
   que "papel" cuando después hay que comprarlo o analizar el gasto.
2. **Cantidad.**
3. **Categoría y subcategoría.** Elegí primero la categoría y después la
   subcategoría. Si no existe la que necesitás, usá "+ Nueva categoría" o
   "+ Nueva subcategoría". **Antes de crear una, fijate que no exista con otro
   nombre parecido**: si alguien pone "Cables" y otro "Cableado", el análisis de
   gasto queda partido en dos.
4. **Observaciones.** Marca y modelo, proveedor sugerido, para qué es, si es
   urgente.
5. **Agregar ítem.**

Repetir para cada artículo. Cuando estén todos, **Enviar pedido**.

El pedido queda en estado **Pendiente** con un número (por ejemplo
`PED-2026-041`). Ese número identifica el pedido en todo el circuito.

> **Consejo:** agrupá en un mismo pedido las cosas que se compran juntas. Se
> aprueba de una sola vez y genera una sola orden de compra. Cosas de rubros
> muy distintos, mejor por separado.

---

## Seguir mis pedidos

*Todos los roles.*

Menú **Mis pedidos**. Cada pedido muestra su estado y una línea de progreso:

| Estado | Qué significa |
|---|---|
| **Pendiente** | Esperando la decisión de quien aprueba |
| **Aprobado** | Autorizado. Compras lo está gestionando. Ya hay orden de compra |
| **Entregado** | Recibido. Circuito cerrado |
| **Rechazado** | No autorizado. El motivo aparece en el pedido |
| **Cancelado** | Dado de baja. El motivo aparece en el pedido |

**Editar:** solo mientras está pendiente, y solo los propios. Se pueden agregar
o quitar artículos.

**Cancelar:** solo mientras está pendiente. Una vez aprobado ya hay una orden de
compra en circulación y puede haber una compra en curso, así que darlo de baja
pasa a ser decisión de compras o de quien aprueba. Pedíselo a ellos.

**Repetir:** crea un pedido nuevo con los mismos artículos y te lleva a
editarlo, para ajustar cantidades antes de enviarlo. Muy útil para lo que se
pide todos los meses.

---

## Aprobar pedidos

*Rol aprobador y superusuario.*

Menú **Gestión**. El número naranja al lado indica cuántos esperan tu decisión.

Cada pedido muestra el detalle completo: artículos, cantidades, categorías y
observaciones, más quién lo pidió, de qué área y cuándo.

- **Aprobar pedido:** queda autorizado y se genera la orden de compra.
- **Rechazar:** pide un motivo, que es **obligatorio**. Ese texto lo ve el
  solicitante en su pantalla. Un motivo claro evita que te vengan a preguntar.
- **Cancelar:** para dar de baja un pedido en cualquier momento antes de la
  entrega.

> La aprobación es por pedido completo, no por artículo. Si querés autorizar
> parte, rechazalo aclarando qué sí y qué no, y pedile al solicitante que cargue
> uno nuevo solo con lo aprobado.

---

## Gestionar compras

*Rol compras y superusuario.*

Menú **Gestión**. El contador muestra los aprobados que todavía no entregaste.

**Cargar costo y proveedor.** En los pedidos aprobados, cada artículo tiene dos
casillas: precio unitario y proveedor. Se cargan y se guarda con el botón al
lado. Son **opcionales**, pero cargarlos es lo que hace que el tablero muestre
en qué se gasta y con qué proveedores se trabaja. Sin eso el tablero solo cuenta
pedidos.

**Marcar entregado.** Cuando lo recibió quien lo pidió. Cierra el circuito y
alimenta el indicador de demora de entrega.

**Cancelar.** Si el pedido no se va a concretar (no consiguieron el artículo, se
resolvió de otra forma). El motivo es obligatorio y lo ve el solicitante.

---

## Imprimir la orden de compra

*Compras, aprobador y superusuario. También el solicitante, para sus pedidos.*

Disponible en cualquier pedido aprobado o entregado, con el enlace **Ver OC**.

La orden trae el logo y los datos de la empresa, el número de OC, la fecha de
emisión, quién solicitó, el área, quién autorizó, el detalle de artículos y, si
se cargaron costos, precios unitarios, subtotales y total.

**Imprimir / Guardar PDF** abre el diálogo del navegador. Desde ahí se imprime o
se elige "Guardar como PDF". Sale en A4 sin el menú de la aplicación.

> **Detalle de impresión:** activá "Gráficos de fondo" en el diálogo (en Chrome
> está en "Más configuraciones"), si no el encabezado de la tabla sale en
> blanco. El resto sale bien igual.

---

## El tablero

*Compras, aprobador y superusuario.*

Menú **Tablero**. Muestra:

**Arriba, seis indicadores:**

- Pedidos por aprobar, aprobados sin entregar y entregados.
- Gasto registrado (solo cuenta lo que tiene costo cargado).
- Demora promedio en aprobar: días entre la carga y la decisión.
- Demora promedio en entregar: días entre la aprobación y la entrega.

**Filtros:** período (3, 6, 12 meses o todo el historial), área y categoría. Se
combinan entre sí y quedan en la dirección, así que podés guardar una vista como
favorito.

**Gráficos y rankings:**

- Evolución mensual del gasto (o de la cantidad de pedidos si todavía no hay
  costos cargados).
- Gasto por categoría y por área solicitante.
- Artículos más pedidos: los candidatos a comprar por volumen o dejar en stock.
- Gasto por proveedor: dónde se concentra la compra.

Los pedidos cancelados y rechazados no se cuentan en ningún indicador.

> **Lo más útil del tablero** suele ser el cruce de "artículos más pedidos" con
> "demora en entregar": si algo se pide todos los meses y siempre tarda, conviene
> comprarlo por cantidad o buscar otro proveedor.

---

## Administración

*Solo superusuario.*

### Perfiles

Menú **Perfiles**. Lista a todas las personas registradas.

- **Nombre, área y rol**, que se guardan con el botón de cada fila.
- **Blanquear contraseña:** despliega un campo para asignar una nueva.
  Anotala antes de confirmar, porque no se puede volver a ver, y pedile a la
  persona que la cambie cuando ingrese.

Recordá: quien crea su cuenta entra como solicitante con área "Sin asignar".
Conviene revisar la lista cada tanto para completar los que falten.

### Áreas

Menú **Áreas**. Lista controlada para que no aparezcan tres versiones de la
misma área.

- **Agregar** un área nueva.
- **Renombrar:** el cambio se aplica también a los perfiles y a los pedidos que
  la usaban, así no se parte el historial.
- **Borrar:** solo las que no tienen gente asignada.

### Categorías

Menú **Categorías**. Acá se corrige lo que la gente crea al cargar pedidos.

- **Renombrar** categorías y subcategorías.
- **Fusionar** subcategorías duplicadas: elegís el destino y los artículos se
  remapean solos antes de borrar la sobrante. No se pierde historial.

> Revisá esta pantalla cada uno o dos meses. Es lo que mantiene el tablero
> confiable: con categorías duplicadas los números se parten y dejan de servir.

---

## Preguntas frecuentes

**Cargué mal un pedido y ya lo envié.**
Si está pendiente, editalo desde Mis pedidos. Si ya fue aprobado, pedile a
compras que lo cancele y cargá uno nuevo.

**¿Por qué no puedo cancelar un pedido aprobado?**
Porque ya tiene orden de compra emitida y puede haber una compra en curso.
Pedíselo a compras o a quien aprueba.

**Me rechazaron un pedido y no entiendo por qué.**
El motivo aparece en el recuadro de color dentro del pedido, en Mis pedidos.

**No aparece la categoría que necesito.**
Creala con "+ Nueva categoría" o "+ Nueva subcategoría" al cargar el pedido.
Antes fijate que no exista con un nombre parecido.

**No veo el menú de Gestión ni el Tablero.**
Son para los roles de compras, aprobador y superusuario. Si te corresponde,
pedile al administrador que te cambie el rol.

**Olvidé la contraseña.**
Pedile al administrador que te asigne una nueva. No hay recuperación por correo.

**¿Se puede usar desde el celular?**
Sí. La pantalla se adapta y las tablas se muestran apiladas. La orden de compra
también se puede imprimir o guardar como PDF desde el teléfono.
