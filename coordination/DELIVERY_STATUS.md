# Entrega de Nexo Pedidos — demo funcional

Actualización móvil integrada el 2026-11-04: ver [entrega móvil e imágenes](DELIVERY_MOBILE.md). Ese informe y su manifiesto describen la candidata actual; los resultados y hashes siguientes corresponden al checkpoint previo.

Fecha: 2026-11-04. Estado: CANDIDATA LOCAL VERIFICADA para validar con el comercio.

Demo disponible en http://127.0.0.1:3000/?demo=1. PIN inicial: 1234. El servidor escucha sólo en localhost y publica dist/public. Datos sintéticos y WhatsApp simulado; las dependencias visuales siguen usando CDN/fuentes.

## Qué quedó implementado

| Área | Resultado |
|---|---|
| Cliente | Catálogo y categorías dinámicas, carrito, retiro/envío, seguimiento y revisión explícita si cambia precio, unidad, paso o disponibilidad |
| Preparación | UNIDAD con cantidad y Listo explícito; KG siempre en kilos con gramos visibles; mixtos, progreso y cierre bloqueado hasta resolver todos los ítems |
| Operación | Faltantes/restauración, agregar/quitar, corregir entrega/datos, cancelar y eliminar sólo cancelados desde la UI |
| Administración | Alta, edición, SKU con ceros iniciales, categorías, pausa, archivo/restauración y errores sin perder el formulario |
| Datos | Escritura crítica, reintento sin pedido fantasma, recuperación de checkout aceptado tras limpieza parcial; catálogo corrupto con aviso y respaldo antes de recuperar |
| Importes | Estimado desde solicitado × precio histórico, provisional separado, final confirmado al cierre y cero preservado; estimados correctos al agregar/quitar después de pesar |
| Seguridad/render | Escapes de texto/atributos y selectores seguros en los contextos probados; raíz HTTP confinada; sin servicios de datos ni mensajes reales en demo |
| Navegación | Scroll y acciones accesibles, offset de cabeceras observado ante reflow y sin el solapamiento móvil detectado |

Los paquetes E1, E3, E2, total cero, preparación y catálogo están implementados y verificados localmente. El importador definitivo no está incluido.

## Validación comprobada

| Prueba | Resultado | Evidencia |
|---|---|---|
| Flujo vertical móvil390/tablet1024, formulario con storage fallido y recuperación UI de catálogo | 22/22 | bugs/DEMO_RELEASE_AFTER_2026-11-04.json |
| Scroll real en seis tamaños360/390/430/768/1024/1366 | 48/48 | bugs/SCROLL_RELEASE_2026-11-04.json |
| Checkout, fallos, recarga, repetición y compra posterior | 106/106 | bugs/CHECKOUT_STORAGE_RELEASE_2026-11-04.json |
| Checkout por UI: orders/all writes/cleanup active-cart-both y pedido previo activo | 5/5 escenarios | bugs/CHECKOUT_UI_RELEASE_2026-11-04.json |
| Catálogo corrupto, backup durable, filas válidas, recuperación y fallo/reintento | 69/69 | bugs/CATALOG_RECOVERY_AFTER_2026-11-04.json |
| Render de catálogo/carrito/snapshots/IDs/admin con marcadores inofensivos | 10/10 | bugs/DELIVERY_RENDERING_RELEASE_2026-11-04.json |
| Final cero en Listos/Cobrados/mensaje simulado | PASS | bugs/ZERO_TOTAL_RELEASE_2026-11-04.json |
| Dominio de entrega y regresiones de sumas/estimados/PIN | 15 escenarios | tests/test-delivery-store.mjs |
| Base | demo17, static24, store72, phone18, helper8, parse2 y XSS8 aprobados | comandos de README y results/QA-DELIVERY.md |
| HTTP de la demo activa | index/bundle200; .git/.env/SQL/worker403 | bugs/LIVE_DEMO_HTTP_2026-11-04.json |

No son cifras sumables de cobertura: varias suites comprueban capas distintas del mismo recorrido. Se ejecutaron en Windows con Node26.13.0 y Brave/Chromium156.0.8078.80 headless. Cero pageerrors/destinos de datos inesperados en las aceptaciones finales; recursos visuales externos permitidos. Las capturas móvil y administración están en bugs/DEMO_RELEASE_PREPARATION_390.png y bugs/DEMO_RELEASE_ADMIN_1024.png y fueron inspeccionadas.

La revisión independiente reprodujo y corrigió el estimado contaminado por pesaje; terminó sin hallazgos pendientes de esa revisión. Las pruebas no demuestran ausencia absoluta de bugs ni aptitud productiva.

## Qué necesita atención de Facu

1. Recorrer la demo con el comercio y validar nombres, acciones, preparación por unidad/peso y diferencias entre estimado/final. Registrar cambios concretos antes de ampliar alcance.
2. Definir el catálogo y perfil de la primera presentación. Para un importador posterior, aportar muestra anonimizada y reglas de actualización/duplicados/unidades.
3. Probar en el teléfono/tablet real y Safari si serán parte del uso. La emulación no sustituye esa validación física.
4. La prueba mediante la extensión de ChatGPT quedó pendiente: la herramienta informó Local browser use is disabled in Work settings. No se cambiaron permisos. Las pruebas descritas se realizaron con Brave automatizado.
5. Revisar el diff local y decidir el momento de commit/publicación. No se hicieron commits, push ni deploy en este trabajo.

## Qué puedo seguir avanzando

Puedo corregir el feedback de validación, adaptar catálogo/perfil de demo y preparar el paquete final de revisión/publicación cuando se autorice esa acción concreta. El parser de importación depende de la muestra; no elegir formatos ni servicios por suposición. No hace falta habilitar infraestructura productiva para presentar esta demo.

## Git y fuente canónica

- Código completo aceptado: D:/Escritorio/nexo-pedidos, rama codex/np-coordination, cambios locales SIN COMMIT.
- HEAD/main/origin-main permanecen en cea4d0e; el remoto todavía no contiene esta candidata.
- quality y review conservan contribuciones sin commit. No son una copia completa intercambiable de la candidata: backend y frontend se integraron en el coordinador.
- No fusionar toda quality-navigation: contiene historia equivalente integrada previamente por cherry-pick. No eliminar worktrees con cambios ni resetearlos para aparentar limpieza.
- Manifiesto de archivos: reviews/DELIVERY_MANIFEST_2026-11-04.json. Bundle fuente y público SHA256: 59C125C5B379BA7F301C18CCAED3B4007562E7C9162814E58EDA97C8AA205F0F.
- MiHuerta original y sus servicios no se modificaron.

## Fuera de esta entrega

Pedidos reales requieren otra etapa: entorno propio descartable, Auth/RLS, confirmación transaccional e idempotente de servidor, concurrencia, inventario/reservas si se acuerdan, entrega/pago separados y outbox WhatsApp. PIN local y disponibilidad booleana no cubren esas capacidades. El checkout real está bloqueado en esta demo. No se inició el worker ni se enviaron mensajes reales.

## Skills y coordinación

Antigravity implementó la corrección E1 y quedó detenido. Por el pedido actual de Facu, agentes frontend/backend implementaron en worktrees separados; Codex integró y repitió pruebas, QA vertical y revisión final en agentes independientes.

Se usaron computer-use para Antigravity; graphify para orientar la exploración (sin grafo existente en Nexo, búsqueda directa); ponytail/typescript-patterns para cambios y contratos; security-review; webapp-testing; y Superpowers para alcance, aislamiento, delegación, TDD y revisión/verificación. No se instalaron dependencias ni se cambiaron modelos, permisos o suscripciones.

Incidencia de herramienta: la revisión automática rechazó cerrar un panel vacío de Antigravity por posible cierre de aplicación con estado sin guardar. Se dejó abierto y no bloqueó la entrega; no se intentó eludir el rechazo.

Publicación posterior: Facu autorizó guardar y actualizar GitHub con esta candidata el 2026-11-04. Las menciones sin commit/push describen el checkpoint previo; consultar el historial Git para la publicación. No se autorizó ni ejecutó despliegue en este cierre.
