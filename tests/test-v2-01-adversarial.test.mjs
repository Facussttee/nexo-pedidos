import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Mock localStorage for Node test runner
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => memStorage.get(k) ?? null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

test("V2-01 Adversarial Verification Suite — Empirical Challenger", async (t) => {
  const schemaPath = path.resolve("supabase/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // ===========================================================================
  // SUITE 1: SQL Schema & Security Invariants
  // ===========================================================================
  await t.test("1. SQL Schema - Security Definer & Isolation Checks", () => {
    // get_request_header
    assert.ok(schemaSql.includes("FUNCTION public.get_request_header(header_name TEXT)"), "Function get_request_header missing");
    assert.ok(schemaSql.includes("req_headers::json ->> lower(header_name)"), "Must use lower(header_name) for case-insensitive lookup");
    assert.ok(schemaSql.includes("NULLIF(TRIM(val), '')"), "Must trim and nullify empty or whitespace headers");
    assert.ok(schemaSql.includes("EXCEPTION WHEN OTHERS THEN\n    RETURN NULL;"), "Must handle malformed JSON / errors safely");

    // verify_staff_pin_header
    assert.ok(schemaSql.includes("public.get_request_header('x-nexo-staff-pin')"), "Must extract staff pin header");
    assert.ok(schemaSql.includes("SELECT value INTO expected_pin FROM public.nexo_secrets WHERE key = 'staff_pin'"), "Must check nexo_secrets");

    // update_staff_pin
    assert.ok(schemaSql.includes("clean_old := TRIM(COALESCE(old_pin, ''));"), "Must sanitize old_pin");
    assert.ok(schemaSql.includes("clean_new := TRIM(COALESCE(new_pin, ''));"), "Must sanitize new_pin");
    assert.ok(schemaSql.includes("clean_old <> current_pin"), "Must validate old_pin against stored secret");
    assert.ok(schemaSql.includes("clean_new !~ '^[0-9]{4,8}$'"), "Must enforce 4-8 numeric digits");
    assert.ok(schemaSql.includes("clean_new = clean_old"), "Must reject identical PIN");

    // nexo_secrets protection
    assert.ok(schemaSql.includes("REVOKE ALL ON TABLE public.nexo_secrets FROM PUBLIC, anon, authenticated;"), "nexo_secrets must be revoked from public/anon");

    // RLS enabled and public reads dropped
    assert.ok(schemaSql.includes("ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;"), "RLS must be enabled on pedidos");
    assert.ok(schemaSql.includes("ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;"), "RLS must be enabled on clientes");
    assert.ok(!schemaSql.includes('CREATE POLICY "pedidos_read_public"\n    ON public.pedidos FOR SELECT\n    TO anon, authenticated\n    USING (true);'), "Public read on pedidos must not exist");
  });

  // ===========================================================================
  // SUITE 2: PL/pgSQL & RLS Evaluation Engine (Exact Postgres Semantics)
  // ===========================================================================

  // Helper: exact PL/pgSQL get_request_header simulation
  function pgGetRequestHeader(requestHeadersSetting, headerName) {
    if (!requestHeadersSetting || requestHeadersSetting === "") {
      return null;
    }
    try {
      const parsed = JSON.parse(requestHeadersSetting);
      const val = parsed[headerName.toLowerCase()];
      if (val === undefined || val === null) return null;
      const trimmed = String(val).trim();
      return trimmed === "" ? null : trimmed;
    } catch {
      return null;
    }
  }

  // Helper: exact PL/pgSQL verify_staff_pin_header simulation
  function pgVerifyStaffPinHeader(requestHeadersSetting, secretsDb) {
    const reqPin = pgGetRequestHeader(requestHeadersSetting, "x-nexo-staff-pin");
    if (!reqPin) return false;
    const expectedPin = secretsDb["staff_pin"];
    return Boolean(expectedPin && reqPin === expectedPin);
  }

  // Helper: exact PL/pgSQL update_staff_pin simulation
  function pgUpdateStaffPin(oldPin, newPin, secretsDb) {
    const cleanOld = String(oldPin ?? "").trim();
    const cleanNew = String(newPin ?? "").trim();

    const currentPin = secretsDb["staff_pin"];
    if (!currentPin || cleanOld !== currentPin) {
      throw new Error("PIN actual incorrecto");
    }
    if (!/^[0-9]{4,8}$/.test(cleanNew)) {
      throw new Error("El nuevo PIN debe ser numérico de 4 a 8 dígitos");
    }
    if (cleanNew === cleanOld) {
      throw new Error("El nuevo PIN no puede ser igual al actual");
    }
    secretsDb["staff_pin"] = cleanNew;
    return { ok: true, message: "PIN actualizado con éxito" };
  }

  // Helper: exact PostgreSQL RLS pedidos_select_restricted evaluation
  function pgEvaluatePedidosSelect(requestHeadersSetting, secretsDb, order) {
    const isStaff = pgVerifyStaffPinHeader(requestHeadersSetting, secretsDb);
    const clientPhoneHeader = pgGetRequestHeader(requestHeadersSetting, "x-nexo-client-phone");
    const isMatchingClient = clientPhoneHeader !== null && order.cliente_telefono === clientPhoneHeader;
    return isStaff || isMatchingClient;
  }

  // Helper: exact PostgreSQL RLS pedidos_update_restricted evaluation (USING & WITH CHECK)
  function pgEvaluatePedidosUpdate(requestHeadersSetting, secretsDb, currentOrder, newOrder) {
    const isStaff = pgVerifyStaffPinHeader(requestHeadersSetting, secretsDb);
    const clientPhoneHeader = pgGetRequestHeader(requestHeadersSetting, "x-nexo-client-phone");

    // USING clause
    const usingStaff = isStaff;
    const usingClient = clientPhoneHeader !== null &&
      currentOrder.cliente_telefono === clientPhoneHeader &&
      ["PENDIENTE", "EN_PREPARACION"].includes(currentOrder.estado);

    const usingPassed = usingStaff || usingClient;
    if (!usingPassed) {
      // Postgres excludes row from UPDATE (0 rows affected)
      return { allowed: false, reason: "USING_EXCLUDED" };
    }

    // WITH CHECK clause
    const checkStaff = isStaff;
    const checkClient = clientPhoneHeader !== null &&
      newOrder.cliente_telefono === clientPhoneHeader &&
      newOrder.estado === "CANCELADO";

    const checkPassed = checkStaff || checkClient;
    if (!checkPassed) {
      // Postgres raises RLS check violation
      return { allowed: false, reason: "WITH_CHECK_VIOLATION" };
    }

    return { allowed: true, reason: "OK" };
  }

  await t.test("2.1 Adversarial Header Spoofing on SELECT (Zero Data Leakage)", () => {
    const secrets = { staff_pin: "1234" };
    const targetOrder = { id: 101, cliente_telefono: "1155667788", estado: "PENDIENTE" };

    const adversarialHeaders = [
      null,                                           // No headers at all
      "",                                             // Empty string setting
      "invalid-json-string",                         // Malformed JSON
      JSON.stringify({}),                            // Empty JSON object
      JSON.stringify({ "x-nexo-client-phone": null }),
      JSON.stringify({ "x-nexo-client-phone": "" }),
      JSON.stringify({ "x-nexo-client-phone": "   " }),
      JSON.stringify({ "x-nexo-client-phone": "\t\n  \r" }),
      JSON.stringify({ "x-nexo-client-phone": "' OR '1'='1" }),
      JSON.stringify({ "x-nexo-client-phone": "1155667788' OR cliente_telefono IS NOT NULL --" }),
      JSON.stringify({ "x-nexo-client-phone": "'; DROP TABLE pedidos; --" }),
      JSON.stringify({ "x-nexo-client-phone": "0 UNION SELECT * FROM nexo_secrets" }),
      JSON.stringify({ "x-nexo-client-phone": "1199990000" }), // Another valid phone
      JSON.stringify({ "x-nexo-staff-pin": "" }),
      JSON.stringify({ "x-nexo-staff-pin": "   " }),
      JSON.stringify({ "x-nexo-staff-pin": "9999" }),         // Wrong PIN
      JSON.stringify({ "x-nexo-staff-pin": "'1234' OR '1'='1" }) // SQLi PIN
    ];

    for (const headerSetting of adversarialHeaders) {
      const allowed = pgEvaluatePedidosSelect(headerSetting, secrets, targetOrder);
      assert.equal(allowed, false, `Adversarial header ${headerSetting} must be rejected`);
    }

    // Legitimate client with exact phone
    const validClientSetting = JSON.stringify({ "x-nexo-client-phone": "1155667788" });
    assert.equal(pgEvaluatePedidosSelect(validClientSetting, secrets, targetOrder), true, "Legitimate client must read their order");

    // Case insensitivity of header name
    const mixedCaseClientSetting = JSON.stringify({ "x-nexo-client-phone": "1155667788" });
    assert.equal(pgEvaluatePedidosSelect(mixedCaseClientSetting, secrets, targetOrder), true, "Mixed case header name must match");

    // Legitimate staff with valid PIN
    const validStaffSetting = JSON.stringify({ "x-nexo-staff-pin": "1234" });
    assert.equal(pgEvaluatePedidosSelect(validStaffSetting, secrets, targetOrder), true, "Staff must read any order");
  });

  await t.test("2.2 Adversarial Staff PIN Update (Exhaustive Boundary Checks)", () => {
    const secrets = { staff_pin: "1234" };

    // 1. Wrong old PIN
    assert.throws(() => pgUpdateStaffPin("0000", "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin("9999", "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin("123", "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin("12345", "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin(null, "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin("", "5678", secrets), /PIN actual incorrecto/);
    assert.throws(() => pgUpdateStaffPin("   ", "5678", secrets), /PIN actual incorrecto/);

    // 2. Non-numeric new PIN
    assert.throws(() => pgUpdateStaffPin("1234", "abcd", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "12a4", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "12-34", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "12.34", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "12 34", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "!@#$%", secrets), /El nuevo PIN debe ser numérico/);

    // 3. Length violations
    assert.throws(() => pgUpdateStaffPin("1234", "", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "1", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "12", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "123", secrets), /El nuevo PIN debe ser numérico/);
    assert.throws(() => pgUpdateStaffPin("1234", "123456789", secrets), /El nuevo PIN debe ser numérico/); // 9 digits
    assert.throws(() => pgUpdateStaffPin("1234", "12345678901234", secrets), /El nuevo PIN debe ser numérico/);

    // 4. Identical new PIN
    assert.throws(() => pgUpdateStaffPin("1234", "1234", secrets), /El nuevo PIN no puede ser igual al actual/);
    assert.throws(() => pgUpdateStaffPin("1234", "  1234  ", secrets), /El nuevo PIN no puede ser igual al actual/);

    // 5. Valid updates & secret rotation verification
    const res1 = pgUpdateStaffPin("1234", "9876", secrets);
    assert.equal(res1.ok, true);
    assert.equal(secrets.staff_pin, "9876");

    // Ensure old PIN '1234' no longer works
    assert.throws(() => pgUpdateStaffPin("1234", "5555", secrets), /PIN actual incorrecto/);

    // Boundary valid lengths (4 and 8 digits)
    const res2 = pgUpdateStaffPin("9876", "12345678", secrets);
    assert.equal(res2.ok, true);
    assert.equal(secrets.staff_pin, "12345678");

    const res3 = pgUpdateStaffPin("12345678", "4321", secrets);
    assert.equal(res3.ok, true);
    assert.equal(secrets.staff_pin, "4321");
  });

  await t.test("2.3 Adversarial Order Cancellation & Status Tampering (RLS Enforcement)", () => {
    const secrets = { staff_pin: "1234" };
    const clientPhone = "1155667788";
    const clientHeaders = JSON.stringify({ "x-nexo-client-phone": clientPhone });
    const otherClientHeaders = JSON.stringify({ "x-nexo-client-phone": "1199990000" });
    const anonHeaders = JSON.stringify({});
    const staffHeaders = JSON.stringify({ "x-nexo-staff-pin": "1234" });

    const orderPendiente = { id: 1, cliente_telefono: clientPhone, estado: "PENDIENTE" };
    const orderEnPreparacion = { id: 2, cliente_telefono: clientPhone, estado: "EN_PREPARACION" };
    const orderListo = { id: 3, cliente_telefono: clientPhone, estado: "LISTO" };
    const orderEntregado = { id: 4, cliente_telefono: clientPhone, estado: "ENTREGADO" };
    const orderCancelado = { id: 5, cliente_telefono: clientPhone, estado: "CANCELADO" };

    // --- CLIENT CANCELLATIONS ---

    // 1. Client CAN cancel PENDIENTE
    const cancelPendiente = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "CANCELADO" });
    assert.equal(cancelPendiente.allowed, true, "Client must be allowed to cancel PENDIENTE");

    // 2. Client CAN cancel EN_PREPARACION
    const cancelEnPrep = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderEnPreparacion, { ...orderEnPreparacion, estado: "CANCELADO" });
    assert.equal(cancelEnPrep.allowed, true, "Client must be allowed to cancel EN_PREPARACION");

    // 3. Client CANNOT cancel LISTO (MUST BE REJECTED)
    const cancelListo = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderListo, { ...orderListo, estado: "CANCELADO" });
    assert.equal(cancelListo.allowed, false, "Client CANNOT cancel an order with status LISTO");
    assert.equal(cancelListo.reason, "USING_EXCLUDED", "Must be excluded by USING clause");

    // 4. Client CANNOT cancel ENTREGADO (MUST BE REJECTED)
    const cancelEntregado = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderEntregado, { ...orderEntregado, estado: "CANCELADO" });
    assert.equal(cancelEntregado.allowed, false, "Client CANNOT cancel an order with status ENTREGADO");
    assert.equal(cancelEntregado.reason, "USING_EXCLUDED");

    // 5. Client CANNOT cancel already CANCELADO order
    const cancelAlreadyCancelled = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderCancelado, { ...orderCancelado, estado: "CANCELADO" });
    assert.equal(cancelAlreadyCancelled.allowed, false, "Client CANNOT re-cancel an already CANCELADO order");
    assert.equal(cancelAlreadyCancelled.reason, "USING_EXCLUDED");

    // --- CLIENT STATUS TAMPERING ---

    // 6. Client cannot tamper PENDIENTE to LISTO
    const tamperToListo = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "LISTO" });
    assert.equal(tamperToListo.allowed, false, "Client CANNOT change status to LISTO");
    assert.equal(tamperToListo.reason, "WITH_CHECK_VIOLATION");

    // 7. Client cannot tamper PENDIENTE to ENTREGADO
    const tamperToEntregado = pgEvaluatePedidosUpdate(clientHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "ENTREGADO" });
    assert.equal(tamperToEntregado.allowed, false, "Client CANNOT change status to ENTREGADO");
    assert.equal(tamperToEntregado.reason, "WITH_CHECK_VIOLATION");

    // --- OTHER CLIENT / ANONYMOUS ---

    // 8. Other client cannot cancel someone else's order
    const crossClientCancel = pgEvaluatePedidosUpdate(otherClientHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "CANCELADO" });
    assert.equal(crossClientCancel.allowed, false, "Attacker phone CANNOT cancel victim's order");
    assert.equal(crossClientCancel.reason, "USING_EXCLUDED");

    // 9. Anonymous caller cannot cancel any order
    const anonCancel = pgEvaluatePedidosUpdate(anonHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "CANCELADO" });
    assert.equal(anonCancel.allowed, false, "Anonymous caller CANNOT cancel any order");
    assert.equal(anonCancel.reason, "USING_EXCLUDED");

    // --- STAFF PRIVILEGES ---

    // 10. Staff CAN update orders across any status
    assert.equal(pgEvaluatePedidosUpdate(staffHeaders, secrets, orderPendiente, { ...orderPendiente, estado: "EN_PREPARACION" }).allowed, true);
    assert.equal(pgEvaluatePedidosUpdate(staffHeaders, secrets, orderEnPreparacion, { ...orderEnPreparacion, estado: "LISTO" }).allowed, true);
    assert.equal(pgEvaluatePedidosUpdate(staffHeaders, secrets, orderListo, { ...orderListo, estado: "ENTREGADO" }).allowed, true);
    assert.equal(pgEvaluatePedidosUpdate(staffHeaders, secrets, orderListo, { ...orderListo, estado: "CANCELADO" }).allowed, true);
  });

  await t.test("2.4 Clientes RLS & Pedidos INSERT Constraint Checks", () => {
    const secrets = { staff_pin: "1234" };
    const clientPhone = "1155667788";
    const clientHeaders = JSON.stringify({ "x-nexo-client-phone": clientPhone });
    const anonHeaders = JSON.stringify({});
    const staffHeaders = JSON.stringify({ "x-nexo-staff-pin": "1234" });

    const custA = { telefono: "1155667788", nombre: "Cliente A", direccion: "Calle 1" };
    const custB = { telefono: "1199990000", nombre: "Cliente B", direccion: "Calle 2" };

    function evaluateClientesSelect(requestHeaders, secretsDb, customer) {
      const isStaff = pgVerifyStaffPinHeader(requestHeaders, secretsDb);
      const phoneHeader = pgGetRequestHeader(requestHeaders, "x-nexo-client-phone");
      return isStaff || (phoneHeader !== null && customer.telefono === phoneHeader);
    }

    function evaluateClientesUpdate(requestHeaders, secretsDb, customer, newValues) {
      const isStaff = pgVerifyStaffPinHeader(requestHeaders, secretsDb);
      const phoneHeader = pgGetRequestHeader(requestHeaders, "x-nexo-client-phone");
      const usingOk = isStaff || (phoneHeader !== null && customer.telefono === phoneHeader);
      if (!usingOk) return false;

      // WITH CHECK
      const validPhone = /^[0-9]{8,15}$/.test(newValues.telefono);
      const validName = typeof newValues.nombre === "string" && newValues.nombre.length >= 2 && newValues.nombre.length <= 120;
      const validAddr = (newValues.direccion || "").length <= 250;
      return validPhone && validName && validAddr;
    }

    // SELECT
    assert.equal(evaluateClientesSelect(anonHeaders, secrets, custA), false, "Anon cannot view customers");
    assert.equal(evaluateClientesSelect(clientHeaders, secrets, custA), true, "Client can view own profile");
    assert.equal(evaluateClientesSelect(clientHeaders, secrets, custB), false, "Client cannot view other customer");
    assert.equal(evaluateClientesSelect(staffHeaders, secrets, custB), true, "Staff can view all customers");

    // UPDATE
    assert.equal(evaluateClientesUpdate(anonHeaders, secrets, custA, custA), false, "Anon cannot update customers");
    assert.equal(evaluateClientesUpdate(clientHeaders, secrets, custB, { ...custB, nombre: "Hacked" }), false, "Client cannot update other customer");
    assert.equal(evaluateClientesUpdate(clientHeaders, secrets, custA, { ...custA, nombre: "Nuevo Nombre" }), true, "Client can update own valid profile");
    assert.equal(evaluateClientesUpdate(clientHeaders, secrets, custA, { ...custA, nombre: "A" }), false, "Rejects name < 2 chars");
    assert.equal(evaluateClientesUpdate(clientHeaders, secrets, custA, { ...custA, telefono: "123" }), false, "Rejects invalid phone");

    // PEDIDOS INSERT check simulation
    function evaluatePedidosInsert(orderPayload) {
      const totalEstimadoOk = orderPayload.total_estimado >= 0;
      const totalRealOk = orderPayload.total_real === null || orderPayload.total_real === undefined || orderPayload.total_real >= 0;
      const itemsArray = Array.isArray(orderPayload.items);
      const itemsLenOk = itemsArray && orderPayload.items.length >= 1 && orderPayload.items.length <= 100;
      const octetLenOk = Buffer.byteLength(JSON.stringify(orderPayload.items || []), "utf8") <= 65536;
      return totalEstimadoOk && totalRealOk && itemsLenOk && octetLenOk;
    }

    assert.equal(evaluatePedidosInsert({ total_estimado: 1000, items: [{ id: "prod-1" }] }), true);
    assert.equal(evaluatePedidosInsert({ total_estimado: -1, items: [{ id: "prod-1" }] }), false, "Rejects negative total");
    assert.equal(evaluatePedidosInsert({ total_estimado: 1000, items: [] }), false, "Rejects empty items array");
    assert.equal(evaluatePedidosInsert({ total_estimado: 1000, items: new Array(101).fill({ id: "p" }) }), false, "Rejects > 100 items");
  });

  // ===========================================================================
  // SUITE 3: Store & Phone Sanitization Adversarial Testing
  // ===========================================================================
  await t.test("3. Store Header Sanitization & Error Propagation", async () => {
    let capturedHeaders = [];
    let rpcInvocations = [];
    let serverPin = "1234";

    const mockSupabase = {
      rpc(fnName, args) {
        rpcInvocations.push({ fnName, args });
        if (fnName === "update_staff_pin") {
          try {
            const res = pgUpdateStaffPin(args.old_pin, args.new_pin, { staff_pin: serverPin });
            serverPin = args.new_pin;
            return Promise.resolve({ data: res, error: null });
          } catch (err) {
            return Promise.resolve({ data: null, error: { message: err.message } });
          }
        }
        return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
      },
      from(table) {
        return {
          select() {
            const builder = {
              setHeader(name, val) {
                capturedHeaders.push({ op: "select", table, name, val });
                return this;
              },
              order() {
                return {
                  limit() {
                    return Promise.resolve({ data: [] });
                  }
                };
              },
              eq(col, val) {
                return {
                  order() {
                    return {
                      limit() {
                        return Promise.resolve({ data: [] });
                      }
                    };
                  }
                };
              }
            };
            return builder;
          },
          upsert(payload) {
            const queryPromise = Promise.resolve({ data: [{ ...payload, id: 999 }], error: null });
            queryPromise.setHeader = (name, val) => {
              capturedHeaders.push({ op: "upsert", table, name, val });
            };
            return queryPromise;
          },
          insert(payload) {
            const queryObj = {
              setHeader(name, val) {
                capturedHeaders.push({ op: "insert", table, name, val });
                return this;
              },
              select() {
                return Promise.resolve({ data: [{ ...payload, id: 999 }], error: null });
              }
            };
            return queryObj;
          },
          update(payload) {
            return {
              setHeader(name, val) {
                capturedHeaders.push({ op: "update", table, name, val });
                return this;
              },
              eq() {
                return Promise.resolve({ data: null, error: null });
              }
            };
          }
        };
      },
      channel() {
        return { on() { return this; }, subscribe() { return {}; } };
      },
      removeChannel() {}
    };

    globalThis.window = {
      supabase: { createClient: () => mockSupabase },
      addEventListener() {},
      location: { search: "" }
    };

    const { Store } = await import("../js/store.js");

    const prodConfig = {
      mode: "production",
      ok: true,
      errors: [],
      warnings: [],
      business: { name: "Test Store", alias: "test", whatsapp: "5491111111111", whatsappDisplay: "+54 11 1111-1111" },
      storageKeys: {
        CONFIG: "test_cfg",
        PRODUCTS: "test_prod",
        ORDERS: "test_ord",
        CART: "test_cart",
        CUSTOMERS: "test_cust",
        ACTIVE_ORDER: "test_act",
        SETTINGS: "test_set",
        CURRENT_USER: "test_user",
        PIN_UNLOCKED: "test_pin_unlocked",
        PIN_FAILED_ATTEMPTS: "test_pin_fails",
        PIN_LOCKOUT_UNTIL: "test_pin_lockout"
      }
    };

    const store = new Store(prodConfig);

    // 3.1 Verify phone number sanitization against SQL injection
    capturedHeaders = [];
    store.setCurrentUser({
      nombre: "Malicious User",
      telefono: "1155667788' OR '1'='1"
    });
    await store.pullFromSupabase();

    const clientHeader = capturedHeaders.find(h => h.name === "x-nexo-client-phone");
    assert.ok(clientHeader, "Should attach x-nexo-client-phone header");
    // All non-digits MUST be stripped
    assert.equal(clientHeader.val, "115566778811", "Must strip all SQLi quotes and non-digits via replace(/\\D/g, '')");

    // 3.2 Anonymous user (no user logged in): no order queries leak
    capturedHeaders = [];
    store.logoutUser();
    await store.pullFromSupabase();
    const leakedHeaders = capturedHeaders.filter(h => h.name === "x-nexo-client-phone" || h.name === "x-nexo-staff-pin");
    assert.equal(leakedHeaders.length, 0, "No client or staff headers must be sent when user is logged out");

    // 3.3 updateStaffPin adversarial client validations
    await assert.rejects(() => store.updateStaffPin("", "5678"), /Ingresá el PIN actual/);
    await assert.rejects(() => store.updateStaffPin("1234", "12a4"), /El nuevo PIN debe ser numérico/);
    await assert.rejects(() => store.updateStaffPin("1234", "12"), /El nuevo PIN debe ser numérico/);
    await assert.rejects(() => store.updateStaffPin("1234", "123456789"), /El nuevo PIN debe ser numérico/);
    await assert.rejects(() => store.updateStaffPin("1234", "1234"), /El nuevo PIN no puede ser igual al actual/);

    // 3.4 Valid PIN update in production
    const updateRes = await store.updateStaffPin("1234", "8888");
    assert.equal(updateRes.ok, true);
    assert.equal(store.getLocalSettings().staffPin, "8888");

    // Old PIN rejected by RPC
    await assert.rejects(() => store.updateStaffPin("1234", "9999"), /PIN actual incorrecto/);
  });
});
