import json
from pathlib import Path
from graphify.validate import assert_valid

root_dir = Path(r"D:\Escritorio\nexo-pedidos-worktrees\quality")
out_file = root_dir / "graphify-out" / ".graphify_chunk_03.json"

# Read coverage line counts
chunk3_files = json.loads((root_dir / "graphify-out" / ".chunk_3_files.json").read_text(encoding="utf-8"))
coverage = {}
for f in chunk3_files:
    p = Path(f)
    n = sum(1 for _ in p.open(encoding="utf-8", errors="replace"))
    coverage[f] = n

nodes = [
    # 1. QA-A-BASELINE.md
    {
        "id": "coordination_reviews_qa_a_baseline_doc",
        "label": "QA-A Línea Base Independiente",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Línea base previa a la corrección de scroll, verificando bloqueo de scroll vertical en 4 resoluciones de pantalla con Playwright y Brave."
    },
    {
        "id": "coordination_reviews_qa_a_baseline_scroll_reproduction",
        "label": "Reproducción de Bloqueo de Scroll",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Rueda de 800px desde el centro de la ventana no incrementa window.scrollY en 1366x768, 768x1024, 1024x768 y 390x844."
    },
    {
        "id": "coordination_reviews_qa_a_baseline_css_injection_experiment",
        "label": "Experimento de Corrección CSS en Navegador",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Inyección en navegador de html overflow-x:clip/overflow-y:auto y body overflow-x:clip/overflow-y:visible restaura scroll de rueda de 800px sin modificar CSS de aplicación."
    },

    # 2. QA-A-INDEPENDENT.md
    {
        "id": "coordination_reviews_qa_a_independent_doc",
        "label": "QA-A Revisión Independiente Codex",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Revisión y validación independiente de la corrección de scroll realizada por Antigravity en commit 1a27cd1."
    },
    {
        "id": "coordination_reviews_qa_a_independent_scroll_acceptance",
        "label": "Aceptación de Scroll en 48 Controles",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "48 controles aprobados (8 por viewport en 6 resoluciones) con Chromium/Brave, verificando rueda, PageDown, toque táctil y recuperación tras modal."
    },
    {
        "id": "coordination_reviews_qa_a_independent_fixture_correction",
        "label": "Corrección de Fixture de Pedido Activo",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Al recargar con pedido activo se abría seguimiento; se corrigió navegando mediante botón de catálogo sin alterar el código productivo."
    },

    # 3. QA-B-INDEPENDENT.md
    {
        "id": "coordination_reviews_qa_b_independent_doc",
        "label": "QA-B-PROPOSAL Revisión Independiente y Ajustes Codex",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Evaluación del prototipo estático QA-B, identificando y subsanando vulnerabilidades XSS y lógica de estado en el prototipo."
    },
    {
        "id": "coordination_reviews_qa_b_independent_prototype_xss_vuln",
        "label": "Vulnerabilidad XSS en Prototipo QA-B",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "P2: interpolación sin escape de nombre y SKU en innerHTML en el formulario de nuevo producto del prototipo, corregido con escape de texto."
    },
    {
        "id": "coordination_reviews_qa_b_independent_unit_ready_fix",
        "label": "Lógica de Confirmación Listo en Unitarios",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "P2: la condición isReady || cantidad>0 impedía desmarcar Listo en unitarios; se reemplazó por confirmación booleana explícita invalidada al editar cantidad."
    },

    # 4. QA-E1-INDEPENDENT.md
    {
        "id": "coordination_reviews_qa_e1_independent_doc",
        "label": "QA-E1 Revisión Independiente de Integración",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Revisión adversarial del commit a045bc9 para BUG-002; rechazo por brechas de escape y regresión del signo monetario."
    },
    {
        "id": "coordination_reviews_qa_e1_independent_gate_rejection",
        "label": "Rechazo de Integración E1",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Fallo en xss-acceptance.cjs (exit 1, marker=1, img[onerror]=3 en catálogo) con brechas en client.js y operator.js."
    },
    {
        "id": "coordination_reviews_qa_e1_independent_operator_currency_regression",
        "label": "Regresión de Signo de Moneda en Operario",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Falta del signo $ antes del precio en el selector de operator.js línea 450."
    },
    {
        "id": "coordination_reviews_qa_e1_independent_deslop_scope",
        "label": "Criterio de Deslop Acotado en html.js",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Simplificar comentarios redundantes en html.js de forma neutral y mantener alias escapeAttr hasta definir contrato de tests."
    },

    # 5. TEST_STRATEGY.md
    {
        "id": "coordination_reviews_test_strategy_doc",
        "label": "Estrategia Independiente de Revisión Primer Tramo",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Estrategia de verificación adversarial por Codex para NP-002 (aislamiento y cero Supabase/WhatsApp) y NP-003 (confinamiento de servidor estático)."
    },
    {
        "id": "coordination_reviews_test_strategy_static_adversarial_suite",
        "label": "Batería Adversarial de Servidor Estático",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Pruebas de path traversal crudo, codificaciones simples/dobles, %5c, NUL, escapes inválidos, symlinks y prefijos hermanos con marcadores secretos fuera de raíz."
    },
    {
        "id": "coordination_reviews_test_strategy_commit_pipeline",
        "label": "Canal de Integración Secuencial E0-NP002-NP003",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Integración ordenada de commits E0 -> NP-002 -> NP-003 verificando limpieza y ausencia de modificaciones en MiHuerta original."
    },

    # 6. E0.md
    {
        "id": "coordination_tasks_e0_doc",
        "label": "Tarea E0 Mapa Real del Repositorio",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\E0.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Instrucciones de relevamiento documental del flujo real catálogo -> store -> Supabase -> bot sin modificar código ni invocar servicios."
    },
    {
        "id": "coordination_tasks_e0_flow_audit",
        "label": "Auditoría de Flujo y Discrepancias de Documentación",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\E0.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Documentar flujo real con referencias de línea y tres diferencias concretas entre la documentación previa y la implementación en código."
    },

    # 7. MOBILE-IMAGES.md
    {
        "id": "coordination_tasks_mobile_images_doc",
        "label": "Tarea MOBILE-IMAGES Paquetes M1 M2 M3",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Especificación de mejoras móviles aprobadas: UI responsiva (M1), múltiples pedidos por cliente (M2) e imágenes en IndexedDB (M3)."
    },
    {
        "id": "coordination_tasks_mobile_images_m1_mobile_ui",
        "label": "Paquete M1 UI Móvil y Carrito Modal",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Dos columnas en >=360px, inputs 16px, controles 44px, modal dialog accesible para carrito con cierre por arrastre >=80px."
    },
    {
        "id": "coordination_tasks_mobile_images_m2_multi_orders",
        "label": "Paquete M2 Múltiples Pedidos de Cliente",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Historial agrupado En curso / Historial, navegación detalle/lista sin pérdida de reactividad y persistencia local de tracking."
    },
    {
        "id": "coordination_tasks_mobile_images_m3_idb_photos",
        "label": "Paquete M3 Imágenes de Producto en IndexedDB",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Almacenar fotos normalizadas (max 512px JPEG q=0.8, <512KiB) en IndexedDB nexo_demo_images_v1 con IDs opacos inmutables; LocalStorage nunca almacena blobs ni base64."
    },

    # 8. NP-002-RECOVERY.md
    {
        "id": "coordination_tasks_np_002_recovery_doc",
        "label": "Tarea NP-002 Recuperación tras Cuota",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002-RECOVERY.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Plan de contingencia y asignación de Gemini 4 Argon tras agotamiento de cuota de Claude Opus en el hito NP-002."
    },
    {
        "id": "coordination_tasks_np_002_recovery_handover_protocol",
        "label": "Protocolo de Traspaso Inter-Modelo",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002-RECOVERY.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Completar la integración de public-config, aislamiento de WhatsApp y tests Node sin rehacer store ni configuración ya validadas."
    },

    # 9. NP-002.md
    {
        "id": "coordination_tasks_np_002_doc",
        "label": "Tarea NP-002 Demo Aislada y Configuración Explícita",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Aislar completamente la aplicación en modo demo: cero llamadas a Supabase, WhatsApp simulado, datos sintéticos y separación de config pública."
    },
    {
        "id": "coordination_tasks_np_002_demo_isolation",
        "label": "Aislamiento Demo por Defecto",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Eliminar creación de clientes Supabase en demo, usar namespace de almacenamiento nexo_* propio y simular mensajería WhatsApp localmente."
    },
    {
        "id": "coordination_tasks_np_002_fail_fast_config",
        "label": "Fallo Explícito en Producción sin Configuración",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Producción incompleta o inválida debe fallar visiblemente de inmediato sin degradar silenciosamente a demo ni simular éxito."
    },

    # 10. NP-003.md
    {
        "id": "coordination_tasks_np_003_doc",
        "label": "Tarea NP-003 Servidor Estático con Raíz Pública",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Servidor estático seguro que expone únicamente dist/public, aislando código de bot, secrets, base de datos y archivos git."
    },
    {
        "id": "coordination_tasks_np_003_public_root_server",
        "label": "Servidor Confinado a dist/public",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Servir sólo archivos permitidos desde dist/public mediante createStaticServer; rechazar peticiones dotfiles, traversal y métodos no GET/HEAD."
    },
    {
        "id": "coordination_tasks_np_003_cli_serve_demo",
        "label": "CLI Aislado serve-demo",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "CLI para desarrollo y demo en localhost sin importar dependencias pesadas de bot ni conectar a redes externas."
    },

    # 11. NP-004-PROPOSED.md
    {
        "id": "coordination_tasks_np_004_proposed_doc",
        "label": "Propuesta NP-004 Autorización y RLS",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Propuesta futura para autorización real del personal y seguimiento de pedidos por token opaco, validado sobre DB descartable."
    },
    {
        "id": "coordination_tasks_np_004_proposed_server_authorization",
        "label": "Autorización Real y RLS en Servidor",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Superar el PIN meramente local con políticas RLS de Supabase/Postgres, roles owner/operator y tokens opacos por pedido."
    },
    {
        "id": "coordination_tasks_np_004_proposed_disposable_db_rule",
        "label": "Regla de DB Descartable Propia",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Prohibición absoluta de interactuar con DB de MiHuerta; desarrollo y verificación exclusivos en base Postgres descartable."
    },

    # 12. QA-A.md
    {
        "id": "coordination_tasks_qa_a_doc",
        "label": "Tarea QA-A Scroll y Diagnóstico Inicial",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-A.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Encargo para corregir el bloqueo de scroll (BUG-001) y realizar auditoría de seguridad y comparativa de UX con MiHuerta."
    },
    {
        "id": "coordination_tasks_qa_a_bug_001_scroll",
        "label": "Diagnóstico y Corrección de Scroll BUG-001",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-A.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Reproducir y resolver con mínima intervención CSS el bloqueo de desplazamiento en catálogo, carrito y administración."
    },
    {
        "id": "coordination_tasks_qa_a_read_only_security_audit",
        "label": "Auditoría de Seguridad de Sólo Lectura",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-A.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Inspección estática para identificar vulnerabilidades de inyección y almacenamiento corrupto sin mutar código."
    },

    # 13. QA-B-PROPOSAL.md
    {
        "id": "coordination_tasks_qa_b_proposal_doc",
        "label": "Tarea QA-B Propuesta Visual Revisable",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Desarrollo de prototipo autocontenido QA-B.html para validar con Facu las pantallas de Preparación y Administración sin alterar la app real."
    },
    {
        "id": "coordination_tasks_qa_b_proposal_standalone_html",
        "label": "Prototipo Visual Autocontenido QA-B.html",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "HTML autocontenido sin librerías externas ni red para revisión a 390px y 1024px con estados efímeros claramente etiquetados como propuesta."
    },
    {
        "id": "coordination_tasks_qa_b_proposal_unit_contract",
        "label": "Contrato de Unidades KG y UNIDAD",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Fijar modalidades estrictas KG (peso real) y UNIDAD (enteros); no inventar unidades complejas como fraccionables ni litros."
    },

    # 14. QA-DELIVERY-CATALOG.md
    {
        "id": "coordination_tasks_qa_delivery_catalog_doc",
        "label": "Tarea QA-DELIVERY-CATALOG Catálogo Funcional de Demo",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Especificación completa del CRUD de catálogo en demo con archivo lógico, revalidación de carrito e inmutabilidad de unidad."
    },
    {
        "id": "coordination_tasks_qa_delivery_catalog_logical_archive",
        "label": "Archivo Lógico Booleano de Productos",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Alta, edición y archivado lógico booleano de productos; mantener snapshots históricos en pedidos sin borrado físico."
    },
    {
        "id": "coordination_tasks_qa_delivery_catalog_unit_immutability",
        "label": "Bloqueo de Cambio de Unidad con Pedidos Activos",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Bloquear cambio KG <-> UNIDAD si el producto tiene referencias en pedidos vigentes, históricos o en carrito; obligar a crear nuevo producto y archivar el anterior."
    },
    {
        "id": "coordination_tasks_qa_delivery_catalog_cart_revalidation",
        "label": "Revalidación de Carrito Pre-Confirmación",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Al confirmar compra, revalidar disponibilidad, precio y archivo; advertir al usuario ante cambios de importe antes de emitir pedido."
    },

    # 15. QA-DELIVERY-PREPARATION.md
    {
        "id": "coordination_tasks_qa_delivery_preparation_doc",
        "label": "Tarea QA-DELIVERY-PREPARATION Preparación de la Demo Funcional",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Contrato de implementación para la vista de preparación del operario en la demo funcional validada con comercio."
    },
    {
        "id": "coordination_tasks_qa_delivery_preparation_unit_confirmation",
        "label": "Confirmación Explícita de Ítems Unitarios",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Campo confirmado_preparacion=false al crear o editar cantidad unitaria; sólo la acción explícita Listo lo marca como preparado."
    },
    {
        "id": "coordination_tasks_qa_delivery_preparation_scale_entry",
        "label": "Entrada de Balanza con Equivalencia en Gramos",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Input de pesaje en kg con aceptación de coma y punto, mostrando equivalencia inmediata en gramos (e.g. 1,450 kg = 1450 g)."
    },
    {
        "id": "coordination_tasks_qa_delivery_preparation_weighing_closure",
        "label": "Invariantes de Cierre de Preparación",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Exigir que todos los ítems estén resueltos (preparados o sin stock); total $0 válido por faltante total; confirmación final de total_real."
    },

    # 16. QA-DELIVERY-ZERO.md
    {
        "id": "coordination_tasks_qa_delivery_zero_doc",
        "label": "Tarea QA-DELIVERY-ZERO Total Final Cero BUG-006",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Corrección de BUG-006: total_real = 0 caía por operador falsy || en el total estimado en vistas del operario."
    },
    {
        "id": "coordination_tasks_qa_delivery_zero_falsy_zero_fix",
        "label": "Corrección de Evaluación de Total Cero Falsy",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Evaluar explícitamente null o undefined en operator.js (líneas 544, 602, 721) en lugar de truthiness para preservar total_real = 0 cuando todos los ítems no tienen stock."
    },
    {
        "id": "coordination_tasks_qa_delivery_zero_worker_blocking_bug",
        "label": "Defecto Falsy Pendiente en Worker de WhatsApp",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "bot/index.js:222 contiene el mismo patrón defectuoso total_real || total_estimado || 0, bloqueante para una integración productiva real."
    },

    # 17. QA-E1.md
    {
        "id": "coordination_tasks_qa_e1_doc",
        "label": "Tarea QA-E1 Corrección de HTML No Confiable BUG-002",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Especificación para neutralizar vulnerabilidades XSS en catálogo, operario y panel de administración."
    },
    {
        "id": "coordination_tasks_qa_e1_contextual_escaping",
        "label": "Escapado Contextual de HTML",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Crear helper liviano js/html.js para escapar entidades HTML (&, <, >, comillas) al interpolar entradas no confiables de usuarios o base de datos."
    },
    {
        "id": "coordination_tasks_qa_e1_untrusted_data_model",
        "label": "Principio de Entradas No Confiables Ubicuas",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Tratar datos remotos, históricos y de almacenamiento local como no confiables, no únicamente el formulario de creación."
    },

    # 18. QA-E2.md
    {
        "id": "coordination_tasks_qa_e2_doc",
        "label": "Tarea QA-E2 Recuperación de Catálogo Corrupto BUG-003",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Mecanismo de validación de esquema y recuperación ante datos de catálogo dañados o no válidos en almacenamiento local."
    },
    {
        "id": "coordination_tasks_qa_e2_schema_validation",
        "label": "Validación de Esquema de Catálogo",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Validar tipo y estructura antes de invocar métodos de Array (evitar products.filter is not a function ante datos corrompidos)."
    },
    {
        "id": "coordination_tasks_qa_e2_controlled_recovery",
        "label": "Recuperación Controlada en Demo",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Permitir recuperación con catálogo sintético y aviso explícito en demo; en producción fallar visiblemente sin sembrar catálogo falso."
    },

    # 19. QA-E3.md
    {
        "id": "coordination_tasks_qa_e3_doc",
        "label": "Tarea QA-E3 Fallo de Persistencia en Checkout BUG-005",
        "file_type": "document",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Manejo resiliente de fallos en setItem al confirmar pedidos: no vaciar carrito, no crear pedidos fantasma y ofrecer reintento idempotente."
    },
    {
        "id": "coordination_tasks_qa_e3_atomic_checkout",
        "label": "Persistencia Explícita e Idempotente de Checkout",
        "file_type": "rationale",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Verificar éxito estricto de setItem de pedidos antes de vaciar carrito; no duplicar pedidos si el usuario reintenta tras fallo de almacenamiento."
    },
    {
        "id": "coordination_tasks_qa_e3_cleanup_fault_tolerance",
        "label": "Tolerancia a Fallos en Limpieza Posterior",
        "file_type": "concept",
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": "Codex",
        "contributor": None,
        "rationale": "Si el pedido se guardó pero falló la limpieza del carrito o guardado del ID activo, no marcar pedido fallido ni duplicarlo en reintento."
    }
]

edges = [
    # QA-A-BASELINE.md
    {
        "source": "coordination_reviews_qa_a_baseline_doc",
        "target": "coordination_reviews_qa_a_baseline_scroll_reproduction",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_baseline_doc",
        "target": "coordination_reviews_qa_a_baseline_css_injection_experiment",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_baseline_css_injection_experiment",
        "target": "coordination_reviews_qa_a_baseline_scroll_reproduction",
        "relation": "rationale_for",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_baseline_doc",
        "target": "coordination_tasks_qa_a_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-BASELINE.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-A-INDEPENDENT.md
    {
        "source": "coordination_reviews_qa_a_independent_doc",
        "target": "coordination_reviews_qa_a_independent_scroll_acceptance",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_independent_doc",
        "target": "coordination_reviews_qa_a_independent_fixture_correction",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_independent_doc",
        "target": "coordination_reviews_qa_a_baseline_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_independent_doc",
        "target": "coordination_tasks_qa_a_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_a_independent_scroll_acceptance",
        "target": "coordination_reviews_qa_a_baseline_scroll_reproduction",
        "relation": "conceptually_related_to",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-A-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-B-INDEPENDENT.md
    {
        "source": "coordination_reviews_qa_b_independent_doc",
        "target": "coordination_reviews_qa_b_independent_prototype_xss_vuln",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_b_independent_doc",
        "target": "coordination_reviews_qa_b_independent_unit_ready_fix",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_b_independent_doc",
        "target": "coordination_tasks_qa_b_proposal_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-B-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-E1-INDEPENDENT.md
    {
        "source": "coordination_reviews_qa_e1_independent_doc",
        "target": "coordination_reviews_qa_e1_independent_gate_rejection",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_e1_independent_doc",
        "target": "coordination_reviews_qa_e1_independent_operator_currency_regression",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_e1_independent_doc",
        "target": "coordination_reviews_qa_e1_independent_deslop_scope",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_qa_e1_independent_doc",
        "target": "coordination_tasks_qa_e1_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\QA-E1-INDEPENDENT.md",
        "source_location": None,
        "weight": 1.0
    },

    # TEST_STRATEGY.md
    {
        "source": "coordination_reviews_test_strategy_doc",
        "target": "coordination_reviews_test_strategy_static_adversarial_suite",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_test_strategy_doc",
        "target": "coordination_reviews_test_strategy_commit_pipeline",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_test_strategy_doc",
        "target": "coordination_tasks_np_002_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_test_strategy_doc",
        "target": "coordination_tasks_np_003_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_reviews_test_strategy_doc",
        "target": "coordination_tasks_e0_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md",
        "source_location": None,
        "weight": 1.0
    },

    # E0.md
    {
        "source": "coordination_tasks_e0_doc",
        "target": "coordination_tasks_e0_flow_audit",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\E0.md",
        "source_location": None,
        "weight": 1.0
    },

    # MOBILE-IMAGES.md
    {
        "source": "coordination_tasks_mobile_images_doc",
        "target": "coordination_tasks_mobile_images_m1_mobile_ui",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_mobile_images_doc",
        "target": "coordination_tasks_mobile_images_m2_multi_orders",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_mobile_images_doc",
        "target": "coordination_tasks_mobile_images_m3_idb_photos",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\MOBILE-IMAGES.md",
        "source_location": None,
        "weight": 1.0
    },

    # NP-002-RECOVERY.md
    {
        "source": "coordination_tasks_np_002_recovery_doc",
        "target": "coordination_tasks_np_002_recovery_handover_protocol",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002-RECOVERY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_002_recovery_doc",
        "target": "coordination_tasks_np_002_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002-RECOVERY.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_002_recovery_handover_protocol",
        "target": "coordination_tasks_np_002_demo_isolation",
        "relation": "conceptually_related_to",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002-RECOVERY.md",
        "source_location": None,
        "weight": 1.0
    },

    # NP-002.md
    {
        "source": "coordination_tasks_np_002_doc",
        "target": "coordination_tasks_np_002_demo_isolation",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_002_doc",
        "target": "coordination_tasks_np_002_fail_fast_config",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-002.md",
        "source_location": None,
        "weight": 1.0
    },

    # NP-003.md
    {
        "source": "coordination_tasks_np_003_doc",
        "target": "coordination_tasks_np_003_public_root_server",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_003_doc",
        "target": "coordination_tasks_np_003_cli_serve_demo",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_003_doc",
        "target": "coordination_tasks_np_002_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-003.md",
        "source_location": None,
        "weight": 1.0
    },

    # NP-004-PROPOSED.md
    {
        "source": "coordination_tasks_np_004_proposed_doc",
        "target": "coordination_tasks_np_004_proposed_server_authorization",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_004_proposed_doc",
        "target": "coordination_tasks_np_004_proposed_disposable_db_rule",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_004_proposed_doc",
        "target": "coordination_tasks_np_002_doc",
        "relation": "conceptually_related_to",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_np_004_proposed_doc",
        "target": "coordination_tasks_np_003_doc",
        "relation": "conceptually_related_to",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\NP-004-PROPOSED.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-A.md
    {
        "source": "coordination_tasks_qa_a_doc",
        "target": "coordination_tasks_qa_a_bug_001_scroll",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-A.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_a_doc",
        "target": "coordination_tasks_qa_a_read_only_security_audit",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-A.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-B-PROPOSAL.md
    {
        "source": "coordination_tasks_qa_b_proposal_doc",
        "target": "coordination_tasks_qa_b_proposal_standalone_html",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_b_proposal_doc",
        "target": "coordination_tasks_qa_b_proposal_unit_contract",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_b_proposal_doc",
        "target": "coordination_tasks_qa_a_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-B-PROPOSAL.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-DELIVERY-CATALOG.md
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_delivery_catalog_logical_archive",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_delivery_catalog_unit_immutability",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_delivery_catalog_cart_revalidation",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_b_proposal_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_e1_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_e2_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_catalog_doc",
        "target": "coordination_tasks_qa_e3_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-DELIVERY-PREPARATION.md
    {
        "source": "coordination_tasks_qa_delivery_preparation_doc",
        "target": "coordination_tasks_qa_delivery_preparation_unit_confirmation",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_preparation_doc",
        "target": "coordination_tasks_qa_delivery_preparation_scale_entry",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_preparation_doc",
        "target": "coordination_tasks_qa_delivery_preparation_weighing_closure",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_preparation_doc",
        "target": "coordination_tasks_qa_b_proposal_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_preparation_doc",
        "target": "coordination_tasks_qa_delivery_zero_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-DELIVERY-ZERO.md
    {
        "source": "coordination_tasks_qa_delivery_zero_doc",
        "target": "coordination_tasks_qa_delivery_zero_falsy_zero_fix",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_zero_doc",
        "target": "coordination_tasks_qa_delivery_zero_worker_blocking_bug",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_zero_doc",
        "target": "coordination_tasks_qa_delivery_preparation_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-E1.md
    {
        "source": "coordination_tasks_qa_e1_doc",
        "target": "coordination_tasks_qa_e1_contextual_escaping",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e1_doc",
        "target": "coordination_tasks_qa_e1_untrusted_data_model",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e1_doc",
        "target": "coordination_reviews_qa_e1_independent_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-E2.md
    {
        "source": "coordination_tasks_qa_e2_doc",
        "target": "coordination_tasks_qa_e2_schema_validation",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e2_doc",
        "target": "coordination_tasks_qa_e2_controlled_recovery",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e2_doc",
        "target": "coordination_tasks_qa_e1_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E2.md",
        "source_location": None,
        "weight": 1.0
    },

    # QA-E3.md
    {
        "source": "coordination_tasks_qa_e3_doc",
        "target": "coordination_tasks_qa_e3_atomic_checkout",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e3_doc",
        "target": "coordination_tasks_qa_e3_cleanup_fault_tolerance",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e3_doc",
        "target": "coordination_tasks_qa_e1_doc",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e3_doc",
        "target": "coordination_tasks_qa_e2_doc",
        "relation": "conceptually_related_to",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "weight": 1.0
    },

    # Cross-document semantic similarity edges
    {
        "source": "coordination_tasks_qa_delivery_zero_falsy_zero_fix",
        "target": "coordination_reviews_qa_b_independent_unit_ready_fix",
        "relation": "semantically_similar_to",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e1_contextual_escaping",
        "target": "coordination_reviews_qa_b_independent_prototype_xss_vuln",
        "relation": "semantically_similar_to",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E1.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_e3_atomic_checkout",
        "target": "coordination_tasks_mobile_images_m3_idb_photos",
        "relation": "semantically_similar_to",
        "confidence": "INFERRED",
        "confidence_score": 0.75,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-E3.md",
        "source_location": None,
        "weight": 1.0
    },
    {
        "source": "coordination_tasks_qa_delivery_preparation_unit_confirmation",
        "target": "coordination_reviews_qa_b_independent_unit_ready_fix",
        "relation": "semantically_similar_to",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-PREPARATION.md",
        "source_location": None,
        "weight": 1.0
    }
]

hyperedges = [
    {
        "id": "hyperedge_qa_bug_remediation",
        "label": "Quality and Security Bug Remediation Track",
        "nodes": [
            "coordination_tasks_qa_a_bug_001_scroll",
            "coordination_tasks_qa_e1_contextual_escaping",
            "coordination_tasks_qa_e2_schema_validation",
            "coordination_tasks_qa_e3_atomic_checkout",
            "coordination_tasks_qa_delivery_zero_falsy_zero_fix"
        ],
        "relation": "implement",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-ZERO.md"
    },
    {
        "id": "hyperedge_demo_isolation_strategy",
        "label": "Demo Isolation and Confinement Architecture",
        "nodes": [
            "coordination_tasks_np_002_demo_isolation",
            "coordination_tasks_np_003_public_root_server",
            "coordination_reviews_test_strategy_static_adversarial_suite",
            "coordination_tasks_np_004_proposed_server_authorization"
        ],
        "relation": "form",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\reviews\TEST_STRATEGY.md"
    },
    {
        "id": "hyperedge_delivery_contracts",
        "label": "Commercial Functional Demo Delivery Specifications",
        "nodes": [
            "coordination_tasks_qa_delivery_catalog_logical_archive",
            "coordination_tasks_qa_delivery_preparation_unit_confirmation",
            "coordination_tasks_qa_b_proposal_unit_contract",
            "coordination_tasks_mobile_images_m1_mobile_ui"
        ],
        "relation": "form",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": r"D:\Escritorio\nexo-pedidos-worktrees\quality\coordination\tasks\QA-DELIVERY-CATALOG.md"
    }
]

output_data = {
    "nodes": nodes,
    "edges": edges,
    "hyperedges": hyperedges,
    "input_tokens": 0,
    "output_tokens": 0,
    "coverage": coverage
}

# Validate with graphify validate_extraction
assert_valid(output_data)
print(f"Extraction validated successfully! {len(nodes)} nodes, {len(edges)} edges, {len(hyperedges)} hyperedges.")

# Write to output file
out_file.write_text(json.dumps(output_data, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written output to {out_file}")
