# NP-004 — propuesta para el siguiente checkpoint (NO DESPACHAR)

Estado: propuesta; no implementación ni servicios autorizados por este archivo. Mostrar primero checkpoint NP-001–003 y seguir indicaciones de Facu.

Objetivo: definir e implementar autorización real para personal y seguimiento acotado antes de usar datos de clientes. El PIN local sólo conserva comodidad de UI; no concede privilegios de servidor.

Preparación requerida: elegir DB/Supabase descartable propia del experimento y mecanismo local de Auth; confirmar capacidades/costos/conexión antes de usar credenciales o crear servicios. Nunca ejecutar contra MiHuerta. Rama y worktree exclusivos desde checkpoint aceptado, modelo observado con cuota disponible, revisión independiente de SQL/permisos.

Alcance propuesto: contratos y migraciones aditivas versionadas de membresías owner/operator; políticas mínimas de catálogo/pedidos/clientes; tokens opacos de seguimiento por pedido; adaptar acceso del personal manteniendo demo sintética. No aplicar schema.sql heredado como migración productiva ni confiar en teléfono, sufijos o params URL como autenticación. No inventar sesión real de WhatsApp.

Criterios verificables en fixtures descartables:
1. Anónimo sólo lee catálogo publicable y no altera precios/productos/pedidos arbitrarios.
2. Cliente/token A sólo consulta pedido A; no puede enumerar pedidos B ni teléfonos de terceros, incluso llamando API directamente.
3. Operario prepara pedidos pero no cambia membresías/roles; owner administra dentro de la instalación.
4. Roles inactivos y tokens inválidos/expirados fallan; token no se registra en logs sensibles ni concede historial completo.
5. Pruebas positivas/negativas por rol contra DB real descartable; tests de strings/DOM no sustituyen RLS. Demo y servidor estático del checkpoint continúan pasando.

Dependencias: NP-005 implementará IDs servidor, idempotencia, transacciones y toma exclusiva. NP-007 inventario/reservas. NP-009 separa entrega/pago. NP-010 outbox. No prometer que NP-004 por sí solo resuelve persistencia/concurrencia o producción completa.
