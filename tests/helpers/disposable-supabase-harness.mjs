/**
 * NEXO PEDIDOS — DISPOSABLE IN-MEMORY SUPABASE HARNESS (AUD-02)
 *
 * Emula Auth, PostgREST (tablas productos, clientes, pedidos, staff_members)
 * y RPCs en memoria para pruebas rápidas sin Docker/Supabase CLI.
 * NOTA HONESTA: isRealPostgresRls es siempre false; NO sustituye pruebas RLS en PostgreSQL real.
 */

import { validateTestTargetUrl } from "../test-aud-02-disposable-backend.test.mjs";

export function createDisposableHarnessShell({
  targetUrl = "http://127.0.0.1:54321",
  anonKey = "sb_publishable_local_disposable_anon_key",
  products = []
} = {}) {
  validateTestTargetUrl(targetUrl);
  if (/service_role|sb_secret_/i.test(String(anonKey))) {
    throw new Error("Harness rechaza credenciales service_role/secret.");
  }

  return {
    targetUrl,
    isRealPostgresRls: false,
    note: "Simulated local harness — does NOT prove real PostgreSQL RLS enforcement.",
    products: products.map((p) => ({ ...p }))
  };
}
