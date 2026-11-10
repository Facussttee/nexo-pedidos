import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// In-memory localStorage mock for node test runner
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => memStorage.get(k) ?? null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

test("Task V2-01: Order Privacy, RLS & Staff PIN Suite", async (t) => {
  const schemaPath = path.resolve("supabase/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  await t.test("1. SQL Schema - Helper function get_request_header is correctly defined", () => {
    assert.ok(
      schemaSql.includes("FUNCTION public.get_request_header(header_name TEXT)"),
      "Must define get_request_header with header_name TEXT"
    );
    assert.ok(
      schemaSql.includes("SECURITY DEFINER"),
      "Must be SECURITY DEFINER"
    );
    assert.ok(
      schemaSql.includes("SET search_path = public"),
      "Must enforce search_path = public"
    );
    assert.ok(
      schemaSql.includes("current_setting('request.headers', true)") &&
      schemaSql.includes("req_headers::json ->> lower(header_name)"),
      "Must extract headers from PostgREST request.headers setting"
    );
    assert.ok(
      schemaSql.includes("GRANT EXECUTE ON FUNCTION public.get_request_header(TEXT) TO anon, authenticated"),
      "Must grant execute to anon and authenticated"
    );
  });

  await t.test("2. SQL Schema - verify_staff_pin_header uses get_request_header and validates against nexo_secrets", () => {
    assert.ok(
      schemaSql.includes("public.get_request_header('x-nexo-staff-pin')"),
      "verify_staff_pin_header must extract x-nexo-staff-pin via get_request_header"
    );
    assert.ok(
      schemaSql.includes("SELECT value INTO expected_pin FROM public.nexo_secrets WHERE key = 'staff_pin'"),
      "verify_staff_pin_header must check nexo_secrets for staff_pin"
    );
  });

  await t.test("3. SQL Schema - Secure RPC update_staff_pin validates old PIN, regex, uniqueness and updates secret", () => {
    assert.ok(
      schemaSql.includes("FUNCTION public.update_staff_pin(old_pin TEXT, new_pin TEXT)"),
      "Must define update_staff_pin(old_pin TEXT, new_pin TEXT)"
    );
    assert.ok(
      schemaSql.includes("SELECT value INTO current_pin FROM public.nexo_secrets WHERE key = 'staff_pin' FOR UPDATE;"),
      "Must lock staff_pin row with FOR UPDATE to prevent race conditions during rotation"
    );
    assert.ok(
      schemaSql.includes("clean_old <> current_pin"),
      "Must validate old_pin against current staff_pin"
    );
    assert.ok(
      schemaSql.includes("clean_new !~ '^[0-9]{4,8}$'"),
      "Must validate new_pin format numeric 4 to 8 digits"
    );
    assert.ok(
      schemaSql.includes("clean_new = clean_old"),
      "Must reject new_pin identical to old_pin"
    );
    assert.ok(
      schemaSql.includes("UPDATE public.nexo_secrets") && schemaSql.includes("SET value = clean_new"),
      "Must update public.nexo_secrets key staff_pin"
    );
    assert.ok(
      schemaSql.includes("jsonb_build_object('ok', true, 'message', 'PIN actualizado con éxito')"),
      "Must return success jsonb object"
    );
    assert.ok(
      schemaSql.includes("GRANT EXECUTE ON FUNCTION public.update_staff_pin(TEXT, TEXT) TO anon, authenticated"),
      "Must grant execute on update_staff_pin"
    );
  });

  await t.test("4. SQL Schema - Clientes RLS policies restrict SELECT and UPDATE", () => {
    assert.ok(
      schemaSql.includes('CREATE POLICY "clientes_select_restricted"'),
      "Must have clientes_select_restricted policy"
    );
    assert.ok(
      schemaSql.includes("public.verify_staff_pin_header()") &&
      schemaSql.includes("telefono = public.get_request_header('x-nexo-client-phone')"),
      "clientes_select_restricted must allow staff PIN or matching client phone"
    );
    assert.ok(
      schemaSql.includes('CREATE POLICY "clientes_update_restricted"'),
      "Must have clientes_update_restricted policy"
    );
    const clientesUpdateBlock = schemaSql.slice(schemaSql.indexOf('CREATE POLICY "clientes_update_restricted"'));
    const clientesUpdateCheck = clientesUpdateBlock.slice(0, clientesUpdateBlock.indexOf(";"));
    assert.ok(
      clientesUpdateCheck.includes("WITH CHECK") &&
      clientesUpdateCheck.includes("public.verify_staff_pin_header()") &&
      clientesUpdateCheck.includes("telefono = public.get_request_header('x-nexo-client-phone')"),
      "clientes_update_restricted WITH CHECK must enforce staff PIN or caller phone invariance"
    );
    assert.ok(
      !schemaSql.includes('CREATE POLICY "clientes_read_public"\n    ON public.clientes FOR SELECT\n    TO anon, authenticated\n    USING (true);'),
      "Public unrestricted SELECT on clientes must be removed"
    );
  });

  await t.test("5. SQL Schema - Pedidos RLS policies restrict SELECT and client UPDATE to CANCELADO", () => {
    assert.ok(
      schemaSql.includes('CREATE POLICY "pedidos_select_restricted"'),
      "Must have pedidos_select_restricted policy"
    );
    assert.ok(
      schemaSql.includes("cliente_telefono = public.get_request_header('x-nexo-client-phone')"),
      "pedidos_select_restricted must allow matching client phone"
    );
    assert.ok(
      schemaSql.includes('CREATE POLICY "pedidos_update_restricted"'),
      "Must have pedidos_update_restricted policy"
    );
    assert.ok(
      schemaSql.includes("estado IN ('PENDIENTE', 'EN_PREPARACION')"),
      "Client can only cancel while order is in PENDIENTE or EN_PREPARACION"
    );
    assert.ok(
      schemaSql.includes("estado = 'CANCELADO'"),
      "Client update check must enforce estado = 'CANCELADO'"
    );
    assert.ok(
      !schemaSql.includes('CREATE POLICY "pedidos_read_public"\n    ON public.pedidos FOR SELECT\n    TO anon, authenticated\n    USING (true);'),
      "Public unrestricted SELECT on pedidos must be removed"
    );
  });

  await t.test("6. RLS Simulation - Anonymous access without headers is strictly blocked", () => {
    // Evaluation function matching PostgreSQL RLS rules
    function evaluateOrderSelect(headers, order) {
      const isStaff = headers["x-nexo-staff-pin"] === "1234";
      const clientPhone = headers["x-nexo-client-phone"] || null;
      return isStaff || (clientPhone !== null && order.cliente_telefono === clientPhone);
    }

    function evaluateOrderUpdate(headers, currentOrder, newOrder) {
      const isStaff = headers["x-nexo-staff-pin"] === "1234";
      const clientPhone = headers["x-nexo-client-phone"] || null;
      const staffAllowed = isStaff;
      const clientUsing = clientPhone !== null && currentOrder.cliente_telefono === clientPhone && ["PENDIENTE", "EN_PREPARACION"].includes(currentOrder.estado);
      const clientCheck = clientPhone !== null && newOrder.cliente_telefono === clientPhone && newOrder.estado === "CANCELADO";

      if (staffAllowed) return true;
      if (clientUsing && clientCheck) return true;
      return false;
    }

    const testOrder = { id: 101, cliente_telefono: "1155667788", estado: "PENDIENTE" };

    // Anonymous request (no headers)
    assert.equal(evaluateOrderSelect({}, testOrder), false, "Anonymous SELECT must be blocked");
    assert.equal(evaluateOrderUpdate({}, testOrder, { ...testOrder, estado: "CANCELADO" }), false, "Anonymous UPDATE must be blocked");

    // Client with matching phone
    const clientHeaders = { "x-nexo-client-phone": "1155667788" };
    assert.equal(evaluateOrderSelect(clientHeaders, testOrder), true, "Client can SELECT their own order");
    assert.equal(evaluateOrderSelect(clientHeaders, { id: 102, cliente_telefono: "1199990000", estado: "PENDIENTE" }), false, "Client cannot SELECT other orders");

    // Client cancellation
    assert.equal(
      evaluateOrderUpdate(clientHeaders, testOrder, { ...testOrder, estado: "CANCELADO" }),
      true,
      "Client can cancel their PENDIENTE order"
    );
    assert.equal(
      evaluateOrderUpdate(clientHeaders, { ...testOrder, estado: "LISTO" }, { ...testOrder, estado: "CANCELADO" }),
      false,
      "Client cannot cancel an order in LISTO"
    );
    assert.equal(
      evaluateOrderUpdate(clientHeaders, testOrder, { ...testOrder, estado: "LISTO" }),
      false,
      "Client cannot change order to LISTO"
    );

    // Staff with staff PIN
    const staffHeaders = { "x-nexo-staff-pin": "1234" };
    assert.equal(evaluateOrderSelect(staffHeaders, testOrder), true, "Staff can SELECT all orders");
    assert.equal(evaluateOrderUpdate(staffHeaders, testOrder, { ...testOrder, estado: "EN_PREPARACION" }), true, "Staff can UPDATE order to EN_PREPARACION");
    assert.equal(evaluateOrderUpdate(staffHeaders, testOrder, { ...testOrder, estado: "LISTO" }), true, "Staff can UPDATE order to LISTO");
  });
});
