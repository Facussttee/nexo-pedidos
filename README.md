# Nexo Pedidos

Evolución de [Facussttee/MiHuerta](https://github.com/Facussttee/MiHuerta) hacia un producto configurable de pedidos, stock y entregas, con una instalación independiente por comercio.

Primer tramo local: demo sintética aislada, configuración pública explícita y servidor estático confinado a `dist/public`. El catálogo, carrito, preparación y pesaje conservan la diferencia entre total estimado y final. Stock cuantitativo, permisos reales y mensajería durable siguen en el roadmap.

## Probar la demo

Con Node.js disponible, desde esta carpeta:

```powershell
node bot/serve-demo.js --host 127.0.0.1 --port 3000
```

Abrir `http://127.0.0.1:3000/?demo=1`. Usar el cliente sintético de acceso rápido. Para la vista del personal, el PIN de interfaz inicial es `1234`; todavía no es autorización de servidor. WhatsApp registra mensajes simulados, sin enviarlos. Para detener el servidor, Ctrl+C.

La demo usa su propio namespace local y no importa datos de MiHuerta. No necesita instalar dependencias del bot ni configurar Supabase. La presentación visual todavía usa Tailwind Play CDN y Google Fonts: no se promete offline completo. No ingresar datos reales en este experimento.

## Build y pruebas locales

```powershell
powershell -ExecutionPolicy Bypass -File .\build-bundle.ps1
node --check js/bundle.js
node scripts/build-public.mjs
node tests/test-demo-isolation.test.mjs
node tests/test-static-server.test.mjs
node bot/test-store-state.js
node tests/test-phone-numeric-validation.test.mjs
```

El build público admite únicamente `<sourceRoot>/dist/public` y copia cuatro archivos mediante una lista explícita. No publicar la raíz del repositorio. No ejecutar `bot/index.js`, `bot/seed.js`, `bot/test-mock.js` ni `bot/test-order-flow.js` para revisar la demo: son rutas de integración con efectos externos.

## Documentación

- [Checkpoint y resultados del experimento](coordination/CHECKPOINT.md)
- [Producto y alcance](docs/PRODUCT.md)
- [Demo y configuración pública](docs/DEMO.md)
- [Servidor estático y raíz pública](docs/STATIC_SERVER.md)
- [Tablero de coordinación](coordination/BOARD.md)
- [Análisis completo de origen](docs/reference/STARTING_ANALYSIS.md)
- [Siguiente paquete propuesto, sin despachar](coordination/tasks/NP-004-PROPOSED.md)

Los documentos `docs/01` a `docs/05`, `PROJECT.md` y `AGENT.md` conservan contexto histórico de MiHuerta; las reglas de esta copia están en `AGENTS.md`. No prueban el estado de servicios desplegados.

Copia Git independiente con historial, sin remoto nuevo ni publicación. `upstream` referencia al original con push bloqueado. No se asignó una licencia nueva: el baseline no contenía `LICENSE`; resolver derechos y dependencias antes de distribuir. No se modificaron MiHuerta ni sus servicios productivos.
