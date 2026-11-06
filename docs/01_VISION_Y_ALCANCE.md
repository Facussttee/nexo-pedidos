# 01 - Visión del Proyecto y Alcance (Project Charter)

## 1. Contexto de Mercado y Oportunidad

En las ciudades y barrios de Argentina y Latinoamérica, las verdulerías y fruterías de cercanía son comercios esenciales con un altísimo volumen de transacciones diarias. Sin embargo, su operativa digital presenta una fricción crítica: **casi todo el comercio remoto se canaliza a través de chats informales de WhatsApp.**

### ¿Por qué fallan las plataformas de e-commerce genéricas?
Herramientas como Tiendanube, Shopify o WooCommerce fueron diseñadas para productos manufacturados con código de barras, peso fijo y stock estático. En una verdulería:
* **El inventario no es fijo:** La mercadería se compra por cajones a la madrugada en el mercado central/abasto, y su precio cambia casi diariamente según la oferta, el clima y la estacionalidad.
* **El producto se vende fraccionado y por peso:** Cuando un cliente pide "1 kg de manzanas", la balanza del negocio casi nunca arroja exactamente 1.000 gramos (da 1.080 g, 940 g, etc.).
* **Falta de hardware costoso:** La mayoría de las verdulerías de barrio no cuentan con computadoras sofisticadas ni balanzas con lector de código de barras en red. Tienen una balanza digital estándar y el teléfono celular del empleado.

---

## 2. Declaración del Problema

> *"El dueño de la verdulería pierde entre 2 y 4 horas diarias respondiendo consultas repetitivas de precios por WhatsApp y triangulando mensajes entre los clientes y los empleados del local para saber qué hay disponible, mientras que los pedidos en el mostrador se anotan en papelitos desorganizados que provocan demoras y errores en los cobros."*

### Puntos de Dolor Identificados:
1. **Triangulación ineficiente:** El dueño suele estar fuera del local (comprando en el abasto, descansando o haciendo trámites) y debe llamar o mensajear al empleado para responder si hay frutillas y cuánto cuestan.
2. **Incertidumbre de precios:** El cliente no tiene una lista actualizada y pregunta producto por producto.
3. **Pérdida de pedidos por demora de respuesta:** Si el verdulero tarda 45 minutos en responder, el cliente compra en otra verdulería o en el supermercado.
4. **Descoordinación en el pesaje:** Al momento de armar la bolsa, el empleado pesa la mercadería, pero no tiene dónde anotar el valor exacto más que en la misma bolsa con un marcador o en un cuaderno.

---

## 3. Propuesta de Valor

**Mi Huerta** transforma este caos en un flujo fluido y profesional:

```
[Cliente pide link por WhatsApp] 
               ↓
[Abre Catálogo con precios del día y arma carrito estimado] 
               ↓
[El pedido entra en tiempo real a la pantalla del local] 
               ↓
[El empleado pesa en la balanza y anota los gramos reales en su celular] 
               ↓
[El sistema calcula el total exacto y envía el mensaje final con datos de pago]
```

### Beneficios para el Dueño:
* **Recupera horas de su día:** Ya no responde listas de precios una por una; el catálogo responde por él.
* **Actualización en 2 minutos:** Cambia los precios de toda la verdulería a la mañana desde una sola pantalla.
* **Cero costo de infraestructura:** No requiere comprar computadoras ni pagar suscripciones mensuales de software.

### Beneficios para el Empleado:
* **Mostrador ordenado:** Ve los pedidos pendientes en un tablero Kanban digital (`Entrantes`, `Pesando`, `Listos`).
* **Cero cálculos mentales:** No necesita multiplicar mentalmente `1.180 kg * $2.600`; el sistema lo hace en el acto.
* **Manejo de imprevistos:** Si se termina un cajón, aprieta "Sin Stock" y el ítem se descuenta automáticamente sin trabar la preparación.

### Beneficios para el Cliente:
* **Inmediatez:** Consulta precios reales y fotos/iconos al instante sin esperar respuesta.
* **Transparencia total:** Sabe exactamente cuánto pesó cada producto y cuánto debe abonar con el comprobante detallado.

---

## 4. Alcance del Proyecto: MVP (Producto Mínimo Viable)

Para garantizar un lanzamiento rápido, ágil y sin complicaciones técnicas, se define con precisión qué entra y qué queda fuera de esta primera versión:

###  Dentro del MVP:
1. **Catálogo Web Asistido:**
   * Visualización de productos clasificados por categorías (*Frutas, Verduras, Hojas Verdes, Almacén*).
   * Búsqueda en tiempo real.
   * Selectores de cantidad por peso (pasos de $250\text{ g}$, $500\text{ g}$ o $1\text{ kg}$) y por unidad.
   * Carrito con cálculo de importe estimado.
2. **Identificación Ligera de Clientes:**
   * Acceso por número de teléfono de WhatsApp (sin contraseñas).
   * Reconocimiento automático de clientes recurrentes y su dirección habitual.
3. **Módulo de Mostrador y Balanza (Kanban):**
   * Tablero con columnas `Entrantes`, `Pesando`, `Listos` y `Cobrados`.
   * Alerta sonora de nuevos pedidos.
   * Pantalla de checklist con campos numéricos táctiles para cargar el pesaje real de balanza.
   * Botón para anular ítems sin stock.
4. **Cierre de Pedido y Desglose:**
   * Recálculo automático del total exacto final.
   * Generación del mensaje resumen para WhatsApp con enlace directo y desglose ítem por ítem.
5. **Panel del Dueño:**
   * Modificación ágil de precios unitarios y switch de disponibilidad on/off.

###  Fuera del MVP (Roadmap Futuro):
* Integración directa con balanzas electrónicas mediante Bluetooth o puerto serie RS232.
* Pasarela de cobro automatizada (Mercado Pago Checkout Pro / Webhooks automáticos); en el MVP se comparte el Alias/CBU y cobro en efectivo.
* Algoritmos de ruteo de entregas para cadetes.
* Facturación electrónica automática con AFIP/organismos tributarios.
* Control estricto de stock con descuento de mermas por pudrición.

---

## 5. Métricas de Éxito del Proyecto (KPIs)

Para evaluar si el sistema cumplió su objetivo en la verdulería piloto, se medirán:
1. **Tiempo del dueño dedicado a responder mensajes:** Reducción esperada del 70% o más.
2. **Tiempo promedio de preparación de pedido:** Medido desde que ingresa hasta que se marca como "Listo".
3. **Precisión de cobro:** Disminución a cero de errores aritméticos en el cálculo de gramos a pesos.
4. **Adopción del cliente:** Porcentaje de clientes habituales que prefieren pedir por el catálogo en lugar de enviar audio/texto libre.
