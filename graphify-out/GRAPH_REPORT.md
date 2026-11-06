# Graph Report - quality  (2026-11-05)

## Corpus Check
- 186 files · ~233,452 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1031 nodes · 1872 edges · 68 communities (54 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Modular Store State Management
- Bundled Store & Storage Runtime
- Modular App Router & Views
- Bundled App & View Controller
- QA Navigation & Scroll Reviews
- Mobile Viewport & UI Release
- Adversarial Security & Isolation Tests
- Store State Mocking & Orders
- Static Server Isolation Tests
- Image Acceptance & IDB Verification
- Persistence & Probes Verification
- Bot Seed & Cloud Dependencies
- Checkout Storage Validation
- WhatsApp Bot Service & Messaging
- Phone Validation & Sanitization Tests
- Coordination Tasks Group
- Scripts Build Group
- Tests Test Group
- Tests Test Group
- Coordination Reviews Group
- Coordination Reviews Group
- Tests Test Group
- Bot Package Group
- Coordination Bugs Group
- Docs 04 Group
- Js Demo Group
- Bot Static Group
- Coordination Decisions Group
- Coordination Reviews Group
- Coordination Reviews Group
- Docs 01 Group
- Index App Group
- Coordination Reviews Group
- Coordination Reviews Group
- Coordination Reviews Group
- Coordination Reviews Group
- Coordination Reviews Group
- Docs Product Group
- Js Config Group
- Tests Test Group
- Tests Test Group
- Coordination Bugs Group
- Agent Pesables Group
- Bot Package Group
- Docs 05 Group
- Docs Demo Group
- Docs Ux Group
- Docs Reference Group
- Coordination Bugs Group
- Docs 03 Group
- Docs Plan Group
- Tests Adversarial Group
- Coordination Results Group
- Docs Mobile Group
- Vercel Group
- Coordination Capabilities Group
- Coordination Board Group
- Coordination Results Group
- Coordination Results Group
- Coordination Active Group
- Coordination Board Group
- Coordination Capabilities Group
- Coordination Checkpoint Group
- Coordination Delivery Group

## God Nodes (most connected - your core abstractions)
1. `Store` - 83 edges
2. `Store` - 79 edges
3. `escapeHtml()` - 22 edges
4. `renderClientView()` - 21 edges
5. `renderAdminView()` - 21 edges
6. `renderClientView()` - 20 edges
7. `MockDOMElement` - 19 edges
8. `renderAdminView()` - 16 edges
9. `escapeHtml()` - 14 edges
10. `safeGet()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Optimizaciones de Ergonomía y Navegación Móvil` --semantically_similar_to--> `Regla Touch-friendly y Mobile-First (44px, 16px)`  [INFERRED] [semantically similar]
  coordination/DELIVERY_MOBILE.md → AGENT.md
- `Aislamiento Estricto de Repositorio MiHuerta` --semantically_similar_to--> `Decisión de Repositorio Privado y Aislamiento Upstream`  [INFERRED] [semantically similar]
  AGENTS.md → coordination/DECISIONS.md
- `Reparto Operativo de Agentes y Control de Worktrees` --semantically_similar_to--> `Protocolo de Un Escritor por Worktree`  [INFERRED] [semantically similar]
  coordination/ACTIVE_EXECUTION.md → AGENTS.md
- `Demo Aislada Fail-Closed sin Supabase` --semantically_similar_to--> `Decisión de Demo Aislada Fail-Closed`  [INFERRED] [semantically similar]
  AGENTS.md → coordination/DECISIONS.md
- `Pipeline Robusto de Imágenes en IndexedDB` --semantically_similar_to--> `Pipeline de Compresión y Almacenamiento en IndexedDB`  [INFERRED] [semantically similar]
  coordination/DELIVERY_MOBILE.md → PROJECT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Verificación Integral de la Candidata de Demo Local** — coordination_delivery_status_candidata_verificada, coordination_delivery_status_matriz_evidencia, coordination_bugs_demo_release_admin_1024_image, coordination_active_execution_cierre_tecnico_demo [INFERRED]
- **Ciclo de Mitigación de Defectos Críticos de Estado y Seguridad** — coordination_bugs_bug_002_mitigacion_xss, coordination_bugs_bug_003_recuperacion_catalogo, coordination_bugs_bug_005_transaccionalidad_checkout, coordination_bugs_bug_006_distincion_cero_falsy [INFERRED]
- **Flujo de Pesaje Real en Balanza y Ergonomía Táctil** — agent_tres_pilares, agent_pesables_vs_unitarios, agent_resiliencia_pesaje, project_architecture_overview, coordination_delivery_mobile_optimizaciones_ux [INFERRED]
- **Confinamiento y Aislamiento de Seguridad en Demo y Servidor** — coordination_results_np_002_demo_isolation_guard, coordination_results_np_003_static_http_server, coordination_results_qa_security_diag_nexo_hardening [INFERRED 0.85]
- **Optimización de Experiencia y Ergonomía Móvil** — coordination_results_mobile_images_m1_checkout_modal, coordination_results_qa_a_solution_overflow_clip, coordination_results_qa_b_proposal_standalone_prototype [INFERRED 0.85]
- **Ciclo de Revisión Independiente y QA de Entrega** — coordination_reviews_np_002_doc, coordination_reviews_np_003_doc, coordination_results_qa_delivery_doc [EXTRACTED 1.00]
- **Quality and Security Bug Remediation Track** — coordination_tasks_qa_a_bug_001_scroll, coordination_tasks_qa_e1_contextual_escaping, coordination_tasks_qa_e2_schema_validation, coordination_tasks_qa_e3_atomic_checkout, coordination_tasks_qa_delivery_zero_falsy_zero_fix [INFERRED 0.95]
- **Demo Isolation and Confinement Architecture** — coordination_tasks_np_002_demo_isolation, coordination_tasks_np_003_public_root_server, coordination_reviews_test_strategy_static_adversarial_suite, coordination_tasks_np_004_proposed_server_authorization [INFERRED 0.95]
- **Commercial Functional Demo Delivery Specifications** — coordination_tasks_qa_delivery_catalog_logical_archive, coordination_tasks_qa_delivery_preparation_unit_confirmation, coordination_tasks_qa_b_proposal_unit_contract, coordination_tasks_mobile_images_m1_mobile_ui [INFERRED 0.85]
- **Mecanismo de Desacoplamiento Operativo Unitario vs Pesable** — docs_ux_comparison_desacoplamiento_vocabulario_balanza, docs_proposals_qa_b_stepper_unitario_vs_balanza, docs_contrato_catalogo_preparacion_demo_contrato_producto, docs_plan_de_accion_calidad_y_evolucion_paquete_qa_b_preparacion [INFERRED 0.95]
- **Aislamiento Demo, Seguridad Fail-Closed y Confinamiento Estático** — docs_architecture_adr_001_isolation_decision, docs_demo_fail_closed_security, docs_static_server_confinamiento_path_traversal, docs_product_confinamiento_dist_public [INFERRED 0.95]
- **Inmutabilidad de Snapshots y Cierre de Totales en Preparación** — docs_contrato_catalogo_preparacion_demo_integridad_pedidos_historicos, docs_04_flujos_y_casos_borde_congelamiento_precio_historico, docs_ux_comparison_cierre_preparacion_precio_final, docs_contrato_catalogo_preparacion_demo_validez_total_cero [INFERRED 0.95]

## Communities (68 total, 14 thin omitted)

### Community 0 - "Modular Store State Management"
Cohesion: 0.08
Nodes (5): safeGet(), safeRemove(), safeSet(), Store, writeCritical()

### Community 1 - "Bundled Store & Storage Runtime"
Cohesion: 0.08
Nodes (5): safeGet(), safeRemove(), safeSet(), Store, writeCritical()

### Community 2 - "Modular App Router & Views"
Cohesion: 0.06
Nodes (60): App, escapeAttr(), escapeHtml(), ALLOWED_MIME_TYPES, createScopedImageLoader(), deleteImage(), generateImageId(), getImage() (+52 more)

### Community 3 - "Bundled App & View Controller"
Cohesion: 0.06
Nodes (60): App, buildDemoOrders(), buildStorageKeys(), cleanText(), cloneDemoCustomers(), createScopedImageLoader(), decodeJwtRole(), deleteImage() (+52 more)

### Community 4 - "QA Navigation & Scroll Reviews"
Cohesion: 0.06
Nodes (32): QA-A Línea Base Independiente, Reproducción de Bloqueo de Scroll, QA-A Revisión Independiente Codex, Corrección de Fixture de Pedido Activo, Aceptación de Scroll en 48 Controles, QA-B-PROPOSAL Revisión Independiente y Ajustes Codex, Vulnerabilidad XSS en Prototipo QA-B, QA-E1 Revisión Independiente de Integración (+24 more)

### Community 5 - "Mobile Viewport & UI Release"
Cohesion: 0.06
Nodes (33): Captura: Puesto de Preparación Mobile 390px, Puesto de Preparación y Mostrador Móvil en 390px, Steppers Táctiles y Confirmación de Preparación, Captura: Admin Precios Móvil Modo Oscuro (390px), Grilla Móvil Admin de Dos Columnas y Edición Directa, Captura: Admin Precios Móvil Modo Claro (390px), Catálogo Móvil de Cliente con Grilla Responsive y Temas, Captura: Catálogo Cliente Móvil Modo Oscuro (390px) (+25 more)

### Community 6 - "Adversarial Security & Isolation Tests"
Cohesion: 0.09
Nodes (13): assert(), createMockEnvironment(), __dirname, DOMTokenList, failures, __filename, InteractiveContainer, MockDOMElement (+5 more)

### Community 7 - "Store State Mocking & Orders"
Cohesion: 0.06
Nodes (29): activeOrderAfter, afterStrCancel, beforeBadQty, cancelledOrder, cartAfterRemoval, checkedOrder, currentOrder, edgeCases (+21 more)

### Community 8 - "Static Server Isolation Tests"
Cohesion: 0.06
Nodes (4): __dirname, __filename, listFilesRecursive(), REPO_ROOT

### Community 9 - "Image Acceptance & IDB Verification"
Cohesion: 0.09
Nodes (25): arg(), assert(), {chromium}, {createHash}, fs, main(), check(), setup() (+17 more)

### Community 10 - "Persistence & Probes Verification"
Cohesion: 0.09
Nodes (20): {chromium}, fs, path, {pathToFileURL}, {chromium}, fs, path, {pathToFileURL} (+12 more)

### Community 11 - "Bot Seed & Cloud Dependencies"
Cohesion: 0.12
Nodes (14): dotenv@^16.4.5, @supabase/supabase-js@^2.45.0, __dirname, __filename, INITIAL_PRODUCTS, supabase, __dirname, __filename (+6 more)

### Community 12 - "Checkout Storage Validation"
Cohesion: 0.10
Nodes (12): args, coherent(), mutate(), removeItem(), root, same(), self, setItem() (+4 more)

### Community 13 - "WhatsApp Bot Service & Messaging"
Cohesion: 0.13
Nodes (16): buildOrderReadyMessage(), COOLDOWN_FILE, COOLDOWN_MINUTES, customerCooldowns, __dirname, extractLocalPhone(), __filename, localIp (+8 more)

### Community 14 - "Phone Validation & Sanitization Tests"
Cohesion: 0.12
Nodes (10): bundleSrc, clientSrc, dirtyInputs, nameInputMatch, navKeys, operatorSrc, retrieved, saved (+2 more)

### Community 15 - "Coordination Tasks Group"
Cohesion: 0.15
Nodes (11): Canal de Integración Secuencial E0-NP002-NP003, Estrategia Independiente de Revisión Primer Tramo, Tarea E0 Mapa Real del Repositorio, Auditoría de Flujo y Discrepancias de Documentación, Tarea NP-002 Demo Aislada y Configuración Explícita, Fallo Explícito en Producción sin Configuración, Tarea NP-002 Recuperación tras Cuota, CLI Aislado serve-demo (+3 more)

### Community 16 - "Scripts Build Group"
Cohesion: 0.26
Nodes (13): __filename, parseDemoCliArgs(), startDemoServer(), buildPublic(), DEFAULT_PUBLIC_ROOT, DEFAULT_SOURCE_ROOT, __dirname, __filename (+5 more)

### Community 17 - "Tests Test Group"
Cohesion: 0.13
Nodes (6): { chromium }, require, root, { chromium }, require, root

### Community 18 - "Tests Test Group"
Cohesion: 0.13
Nodes (11): allProjectFiles, cssContent, defects, filesToAudit, fs, hasCssInputRule, hasRootOverflowGuard, passes (+3 more)

### Community 19 - "Coordination Reviews Group"
Cohesion: 0.14
Nodes (8): config, data, fixtures, good, network, protectedKeys, report, root

### Community 20 - "Coordination Reviews Group"
Cohesion: 0.14
Nodes (10): {chromium}, fs, http, path, assert, fs, http, os (+2 more)

### Community 21 - "Tests Test Group"
Cohesion: 0.15
Nodes (5): end, parse, source, start, memStorage

### Community 22 - "Bot Package Group"
Cohesion: 0.19
Nodes (12): dependencies, pino@^9.4.0, qrcode-terminal@^0.12.0, @whiskeysockets/baileys@^6.7.8, description, main, name, type (+4 more)

### Community 23 - "Coordination Bugs Group"
Cohesion: 0.17
Nodes (10): ACTIVE_EXECUTION.md - Estado Actual y Cierre de Demo Local, Aceptación de Seguridad QA-E1 contra XSS, BOARD.md - Tablero de Seguimiento y Paquetes de Demo, BUG-002 - HTML Ejecutable XSS en Nombre de Cliente, BUG-003 - Catálogo Local Corrupto Bloquea la Pantalla, BUG-005 - Pérdida de Carrito ante Fallo al Guardar Pedido, DELIVERY_MOBILE.md - Entrega Móvil e Imágenes, DELIVERY_STATUS.md - Estado de Entrega Demo Funcional (+2 more)

### Community 24 - "Docs 04 Group"
Cohesion: 0.18
Nodes (6): Doc: Flujos Operativos, Casos Borde y Contingencias, Contrato de Producto y SKU Retrocompatible, Doc: Contrato previo de catálogo demo y preparación, Paquete QA-B UI de Preparación Adaptable Unitario/Pesable, Doc: Relevamiento para futura carga masiva, Flujo de Relevamiento e Importación en 4 Pasos

### Community 25 - "Js Demo Group"
Cohesion: 0.21
Nodes (8): readPublicConfigSource(), buildDemoOrders(), cloneDemoCustomers(), DEMO_CUSTOMERS, CATEGORIAS, INITIAL_PRODUCTS, memoryFallback, NEXO_CONFIG

### Community 26 - "Bot Static Group"
Cohesion: 0.22
Nodes (10): startLocalWebServer(), createStaticServer(), __dirname, __filename, FORBIDDEN_EXTENSIONS, FORBIDDEN_SEGMENTS, isPathInsideRoot(), MIME_TYPES (+2 more)

### Community 28 - "Coordination Reviews Group"
Cohesion: 0.20
Nodes (7): { chromium }, fs, os, path, { pathToFileURL }, output, root

### Community 29 - "Coordination Reviews Group"
Cohesion: 0.22
Nodes (6): { chromium }, fs, main(), os, path, { pathToFileURL }

### Community 30 - "Docs 01 Group"
Cohesion: 0.31
Nodes (6): Catálogo Web Asistido, Doc: Visión del Proyecto y Alcance, Pesables y Fraccionados en Comercio Barrial, Doc: Guía de Presentación y Pitch para el Comerciante, Pitch y Demostración en Vivo para Comerciante, Prueba Piloto Acotada de Cero Costo

### Community 31 - "Index App Group"
Cohesion: 0.22
Nodes (8): Contenedor Principal de Montaje SPA app-content, index.html - Single Page Application Shell, Top Stack Fijo: Banner Demo y Simulator Bar, Estrategia Dual de Notificación WhatsApp, Despliegue Serverless en Vercel con Supabase, README.md - Guía de Nexo Pedidos PWA, Suite de Verificación y Pruebas Automatizadas, Tríada de Vistas: Cliente, Operador y Administrador

### Community 32 - "Coordination Reviews Group"
Cohesion: 0.25
Nodes (6): assert, { chromium }, fs, live, path, root

### Community 33 - "Coordination Reviews Group"
Cohesion: 0.25
Nodes (6): assert, fs, os, path, {pathToFileURL}, walk()

### Community 34 - "Coordination Reviews Group"
Cohesion: 0.25
Nodes (6): { chromium }, fs, main(), os, path, { pathToFileURL }

### Community 35 - "Coordination Reviews Group"
Cohesion: 0.39
Nodes (7): assert(), main(), form(), freshAdmin(), unlock(), view(), visibleRejection()

### Community 36 - "Coordination Reviews Group"
Cohesion: 0.25
Nodes (5): assert, {chromium}, fs, path, {pathToFileURL}

### Community 37 - "Docs Product Group"
Cohesion: 0.25
Nodes (6): Doc: Nexo Pedidos v1 — Especificación de Producto, Nexo Pedidos v1 Visión de Producto, Cuatro Pilares del Producto Nexo, Construcción por Allowlist en scripts/build-public.mjs, Doc: Servidor Estático Confinado y Raíz Pública, Servidor HTTP Autónomo bot/static-server.js

### Community 38 - "Js Config Group"
Cohesion: 0.46
Nodes (7): buildStorageKeys(), cleanText(), decodeJwtRole(), findForbiddenFields(), FORBIDDEN_CONFIG_FIELDS, resolveBusiness(), resolveNexoConfig()

### Community 39 - "Tests Test Group"
Cohesion: 0.29
Nodes (5): DEMO_BUSINESS, installDemoNetworkGuard(), createMockStorage(), globalStorage, runBundleInSandbox()

### Community 40 - "Tests Test Group"
Cohesion: 0.25
Nodes (3): config, customer, data

### Community 41 - "Coordination Bugs Group"
Cohesion: 0.29
Nodes (3): AGENT.md - Contexto Operativo Histórico MiHuerta, BUG-001 - Bloqueo de Scroll Vertical por Confinamiento Root, Optimizaciones de Ergonomía y Navegación Móvil

### Community 42 - "Agent Pesables Group"
Cohesion: 0.29
Nodes (7): Glosario de Dominio: Pesables (KG) vs Unitarios (UNIDAD), Pipeline Robusto de Imágenes en IndexedDB, Arquitectura Nexo Pedidos v1 PWA Híbrida, PROJECT.md - Visión General y Arquitectura Nexo Pedidos v1, Inventario de Funcionalidades v1, Pipeline de Compresión y Almacenamiento en IndexedDB, Backend Cloud Supabase (PostgreSQL + Realtime)

### Community 43 - "Bot Package Group"
Cohesion: 0.29
Nodes (7): scripts, build:public, demo, seed, start, test:flow, test:mock

### Community 44 - "Docs 05 Group"
Cohesion: 0.29
Nodes (7): Módulo de Mostrador y Balanza Kanban, Máquina de Estados del Pedido, Flujo Operativo Caminito Feliz, Microservicio WhatsApp Baileys con Reconciliación, Balanza con Conversión Inteligente de Gramos, Doc: Plan de Desarrollo del MVP y Auditoría, Plan de Etapas del MVP

### Community 45 - "Docs Demo Group"
Cohesion: 0.33
Nodes (4): ADR-001: Contratos del primer tramo y aislamiento, Doc: Configuración y Modos de Ejecución, Modo Demo Aislado y Sintético, Modo Producción Supabase y Realtime

### Community 46 - "Docs Ux Group"
Cohesion: 0.29
Nodes (5): Doc: Propuesta Visual QA-B Preparación y Admin, Prototipo Visual QA-B Preparación y Admin, Control Visual Diferenciado: Stepper Unitario vs Balanza kg, Comparativa Estática Nexo vs MiHuerta, Doc: Comparativa de Experiencia de Usuario: Nexo vs MiHuerta

### Community 47 - "Docs Reference Group"
Cohesion: 0.29
Nodes (5): Doc: Traspaso Autocontenido y Análisis Inicial, Hoja de Ruta de Paquetes NP-001 a NP-012, Documento de Traspaso y Diagnóstico E0, Doc: Mapa real del repositorio — Nexo Pedidos (E0), Mapeo Real del Repositorio y Componentes E0

### Community 48 - "Coordination Bugs Group"
Cohesion: 0.33
Nodes (4): Tres Pilares de la Solución (Catálogo, Balanza y WhatsApp), BUG-006 - Total Real Cero Reemplazado por Estimado, Captura de Pantalla: Panel de Administración de Catálogo y Precios (1024px), Candidata Demo Verificada para Validación Comercial

### Community 49 - "Docs 03 Group"
Cohesion: 0.33
Nodes (3): Doc: Arquitectura del Sistema y Modelo de Datos, Modelo Entidad-Relación Relacional, Modelo de Datos de Producción en Supabase

### Community 50 - "Docs Plan Group"
Cohesion: 0.40
Nodes (4): Doc: Plan de Acción de Calidad y Evolución, Paquete QA-A Diagnóstico y Corrección de Scroll, Paquete QA-C Administración de Catálogo y CRUD, Modal Interactivo de Alta y Edición de Producto

### Community 52 - "Coordination Results Group"
Cohesion: 0.50
Nodes (3): Resultado del Experimento E0: Mapeo de Repositorio, Definición de Arquitectura Shell Web / SPA, Revisión Independiente del Experimento E0: Aceptado

### Community 53 - "Docs Mobile Group"
Cohesion: 0.50
Nodes (3): Doc: Uso móvil de Nexo, Servidor Demo en Red Local, Pruebas Móviles y Gestos de Carrito

### Community 54 - "Vercel Group"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

### Community 55 - "Coordination Capabilities Group"
Cohesion: 0.67
Nodes (3): CAPABILITIES.md - Capacidades de Entorno Local y Modelos IA, CHECKPOINT.md - Primer Tramo Local Completado, DECISIONS.md - Registro de Decisiones de Arquitectura

## Knowledge Gaps
- **79 isolated node(s):** `Tres Pilares de la Solución (Catálogo, Balanza y WhatsApp)`, `Glosario de Dominio: Pesables (KG) vs Unitarios (UNIDAD)`, `Backend Cloud Supabase (PostgreSQL + Realtime)`, `Inventario de Funcionalidades v1`, `Despliegue Serverless en Vercel con Supabase` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 443 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Modular Store State Management` to `Js Demo Group`, `Modular App Router & Views`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `Tres Pilares de la Solución (Catálogo, Balanza y WhatsApp)`, `Glosario de Dominio: Pesables (KG) vs Unitarios (UNIDAD)`, `Backend Cloud Supabase (PostgreSQL + Realtime)` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modular Store State Management` be split into smaller, more focused modules?**
  _Cohesion score 0.07728474875110197 - nodes in this community are weakly interconnected._
- **Should `Bundled Store & Storage Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.08055555555555556 - nodes in this community are weakly interconnected._
- **Should `Modular App Router & Views` be split into smaller, more focused modules?**
  _Cohesion score 0.06393606393606394 - nodes in this community are weakly interconnected._
- **Should `Bundled App & View Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.06126126126126126 - nodes in this community are weakly interconnected._
- **Should `QA Navigation & Scroll Reviews` be split into smaller, more focused modules?**
  _Cohesion score 0.05647840531561462 - nodes in this community are weakly interconnected._