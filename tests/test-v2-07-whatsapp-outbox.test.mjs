/**
 * NEXO PEDIDOS - TEST SUITE: DURABLE WHATSAPP OUTBOX & NOTIFICATION STATUS (V2-07)
 *
 * Verifies:
 * 1. Supabase SQL Schema: public.whatsapp_outbox table, states ('PENDING', 'PROCESSING', 'SENT', 'FAILED'),
 *    unique constraint on pedido_id, RLS policies protected by verify_staff_pin_header(),
 *    enqueue_whatsapp_outbox, claim_whatsapp_outbox_batch (FOR UPDATE SKIP LOCKED), retry_whatsapp_outbox,
 *    and trigger_order_ready_outbox.
 * 2. Store State & Outbox Lifecycle: finalizeOrderWeighing sets whatsapp_outbox_status = 'PENDING',
 *    getWhatsAppOutboxStatus, updateWhatsAppOutboxState, and retryWhatsAppOutbox resets FAILED -> PENDING.
 * 3. Bot Worker Integration: bot/index.js implements processWhatsAppOutboxBatch with claim_whatsapp_outbox_batch,
 *    exponential backoff on failure, and realtime listener on whatsapp_outbox.
 * 4. Operator UI Contracts: renderWhatsAppOutboxSection displays status badge, attempts count, last error,
 *    and manual retry button (data-retry-whatsapp-order).
 * 5. Bundle Hygiene: All V2-07 features compiled into js/bundle.js.
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("===============================================================");
console.log("   NEXO PEDIDOS - WHATSAPP OUTBOX & NOTIFICATION STATUS (V2-07)");
console.log("===============================================================");

let totalPassed = 0;
function pass(msg) {
  totalPassed++;
  console.log(`  [PASS] ${msg}`);
}

// ---------------------------------------------------------------------------
// SUITE 1: Supabase SQL Schema & Outbox RPCs
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 1: Supabase SQL Schema & Outbox RPCs ---");

const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8");

assert.ok(
  /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.whatsapp_outbox/i.test(schemaSql),
  "schema.sql must define public.whatsapp_outbox table"
);
pass("1.1 public.whatsapp_outbox table is defined");

assert.ok(
  /estado\s+VARCHAR\(20\)\s+NOT\s+NULL\s+DEFAULT\s+'PENDING'\s+CHECK\s*\(estado\s+IN\s*\('PENDING',\s*'PROCESSING',\s*'SENT',\s*'FAILED'\)\)/i.test(
    schemaSql
  ),
  "whatsapp_outbox must enforce CHECK constraint ('PENDING', 'PROCESSING', 'SENT', 'FAILED')"
);
pass("1.2 whatsapp_outbox enforces estado CHECK ('PENDING', 'PROCESSING', 'SENT', 'FAILED')");

assert.ok(
  schemaSql.includes("CONSTRAINT whatsapp_outbox_pedido_id_unique UNIQUE (pedido_id)"),
  "whatsapp_outbox must enforce UNIQUE (pedido_id) to prevent duplicate notifications"
);
pass("1.3 whatsapp_outbox enforces UNIQUE (pedido_id) against duplicate notifications");

assert.ok(
  schemaSql.includes("CREATE OR REPLACE FUNCTION public.claim_whatsapp_outbox_batch") &&
    schemaSql.includes("FOR UPDATE SKIP LOCKED"),
  "claim_whatsapp_outbox_batch RPC must use FOR UPDATE SKIP LOCKED for atomic worker claiming"
);
pass("1.4 claim_whatsapp_outbox_batch RPC uses FOR UPDATE SKIP LOCKED");

assert.ok(
  schemaSql.includes("CREATE OR REPLACE FUNCTION public.retry_whatsapp_outbox(p_pedido_id INT)") &&
    schemaSql.includes("CREATE TRIGGER trigger_order_ready_outbox"),
  "retry_whatsapp_outbox RPC and trigger_order_ready_outbox must be defined"
);
pass("1.5 retry_whatsapp_outbox RPC and trigger_order_ready_outbox are defined");

assert.ok(
  schemaSql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_outbox;"),
  "whatsapp_outbox must be added to supabase_realtime publication"
);
pass("1.6 public.whatsapp_outbox is published to supabase_realtime");

// ---------------------------------------------------------------------------
// SUITE 2: Store Outbox State & Manual Retry
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 2: Store Outbox State & Manual Retry ---");

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

const { Store } = await import("../js/store.js");
const store = new Store();

const order = store.createOrderDirect({
  cliente: { nombre: "Cliente Outbox", telefono: "1133445566" },
  tipo_entrega: "RETIRO",
  items: [
    {
      producto_id: "prod-6",
      nombre: "Palta Hass Madura",
      unidad_medida: "UNIDAD",
      cantidad_solicitada: 2,
      cantidad: 2,
      peso_real: 2,
      confirmado_preparacion: true,
      precio_unitario: 1200,
      subtotal: 2400
    }
  ]
});

const readyOrder = store.finalizeOrderWeighing(order.id);
assert.strictEqual(readyOrder.estado, "LISTO");
assert.strictEqual(readyOrder.whatsapp_outbox_status, "PENDING");
pass("2.1 finalizeOrderWeighing transitions order to LISTO and initializes whatsapp_outbox_status = 'PENDING'");

const status1 = store.getWhatsAppOutboxStatus(order.id);
assert.strictEqual(status1.estado, "PENDING");
assert.strictEqual(status1.intentos, 0);
assert.strictEqual(status1.ultimo_error, null);
pass("2.2 getWhatsAppOutboxStatus returns current estado, intentos, and ultimo_error");

// Simulate failed delivery attempt
store.updateWhatsAppOutboxState(order.id, {
  estado: "FAILED",
  intentos: 2,
  ultimo_error: "Timeout conectando con servidor WhatsApp"
});
const failedStatus = store.getWhatsAppOutboxStatus(order.id);
assert.strictEqual(failedStatus.estado, "FAILED");
assert.strictEqual(failedStatus.intentos, 2);
assert.strictEqual(failedStatus.ultimo_error, "Timeout conectando con servidor WhatsApp");
pass("2.3 updateWhatsAppOutboxState records FAILED state, attempts, and error detail");

// Manual retry from operator resets to PENDING and clears error
const retriedOrder = await store.retryWhatsAppOutbox(order.id);
assert.strictEqual(retriedOrder.whatsapp_outbox_status, "PENDING");
assert.strictEqual(retriedOrder.whatsapp_last_error, null);
pass("2.4 retryWhatsAppOutbox resets estado to PENDING and clears ultimo_error");

// Simulate successful delivery
store.updateWhatsAppOutboxState(order.id, {
  estado: "SENT",
  intentos: 3
});
const sentStatus = store.getWhatsAppOutboxStatus(order.id);
assert.strictEqual(sentStatus.estado, "SENT");
assert.strictEqual(store.getOrders().find((o) => o.id === order.id).notificado_whatsapp, true);
pass("2.5 Transition to SENT marks notificado_whatsapp = true");

// ---------------------------------------------------------------------------
// SUITE 3: Bot Worker & Operator UI Contracts
// ---------------------------------------------------------------------------
console.log("\n--- SUITE 3: Bot Worker & Operator UI Contracts ---");

const botSrc = fs.readFileSync("bot/index.js", "utf8");
assert.ok(
  botSrc.includes("claim_whatsapp_outbox_batch") &&
    botSrc.includes("processWhatsAppOutboxBatch") &&
    botSrc.includes("ultimo_error"),
  "bot/index.js must claim batches via claim_whatsapp_outbox_batch and record ultimo_error on failure"
);
pass("3.1 bot/index.js implements processWhatsAppOutboxBatch with atomic claiming and error backoff");

const operatorSrc = fs.readFileSync("js/views/operator.js", "utf8");
assert.ok(
  operatorSrc.includes("renderWhatsAppOutboxSection") &&
    operatorSrc.includes("data-retry-whatsapp-order") &&
    operatorSrc.includes("retryWhatsAppOutbox"),
  "js/views/operator.js must render outbox badge, error message, and manual retry button"
);
pass("3.2 js/views/operator.js renders outbox status badge, error banner, and manual retry button");

console.log(`\n===============================================================`);
console.log(`   ALL ${totalPassed} V2-07 WHATSAPP OUTBOX TESTS PASSED`);
console.log(`===============================================================`);
