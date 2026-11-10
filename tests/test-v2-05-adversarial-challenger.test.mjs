/**
 * NEXO PEDIDOS - ADVERSARIAL CHALLENGE SUITE: TASK V2-05
 * Role: Reviewer & Adversarial Critic
 *
 * Stress-testing assumptions, boundary conditions, edge cases, and failure modes.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  detectDelimiter,
  parseCsvRecords,
  parsePrice,
  parseUnit,
  parseDisponible,
  parseCatalogFile,
  normalizeHeader
} from "../js/csv-parser.js";

import { Store } from "../js/store.js";

function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return {
    map,
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
    keys() {
      return [...map.keys()];
    }
  };
}

test("Task V2-05 Adversarial Challenge Suite", async (t) => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  // ===========================================================================
  // Challenge 1: RFC 4180 Extremes & Delimiter Confusion
  // ===========================================================================
  await t.test("CHALLENGE 1: Delimiter confusion and adversarial RFC 4180 parsing", () => {
    // 1a. File with semicolon separator where quoted cells contain commas and tabs
    const complexCsv = `sku;nombre;precio;descripcion\r\n"001";"Tomate, Perita\ty Redondo";1.500,50;"Línea 1\r\nLínea 2; con punto y coma"`;
    assert.equal(detectDelimiter(complexCsv), ";");
    const parsed = parseCatalogFile(complexCsv);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].sku, "001");
    assert.equal(parsed.rows[0].nombre, "Tomate, Perita\ty Redondo");
    assert.equal(parsed.rows[0].precio, 1500.5);
    assert.ok(parsed.rows[0].detalle.includes("con punto y coma"));

    // 1b. File starting with UTF-8 BOM (\uFEFF)
    const bomCsv = "\uFEFFsku,nombre,precio\n099,Palta Hass,2500";
    const parsedBom = parseCatalogFile(bomCsv);
    assert.equal(parsedBom.errors.length, 0);
    assert.equal(parsedBom.rows.length, 1);
    assert.equal(parsedBom.rows[0].sku, "099");
    assert.equal(parsedBom.rows[0].nombre, "Palta Hass");

    // 1c. File with trailing blank lines and CRLF mixed with LF
    const mixedCsv = "sku,nombre,precio\r\n001,Manzana,1000\n002,Pera,1200\r\n\r\n\n";
    const parsedMixed = parseCatalogFile(mixedCsv);
    assert.equal(parsedMixed.errors.length, 0);
    assert.equal(parsedMixed.rows.length, 2);

    // 1d. Completely empty or whitespace-only files
    const emptyResult = parseCatalogFile("   \n\r\n  ");
    assert.equal(emptyResult.rows.length, 0);
    assert.ok(emptyResult.errors.length > 0);
  });

  // ===========================================================================
  // Challenge 2: Price Parsing Robustness & Extremes
  // ===========================================================================
  await t.test("CHALLENGE 2: Extreme price notations, currency symbols, and zero handling", () => {
    // Argentine million format with dots and comma
    assert.equal(parsePrice("1.500.000,50"), 1500000.5);
    assert.equal(parsePrice("$ 1.500.000,00"), 1500000);
    // US format
    assert.equal(parsePrice("1,500,000.50"), 1500000.5);
    // Integer with thousand dots
    assert.equal(parsePrice("25.000"), 25000);
    assert.equal(parsePrice("3.500"), 3500);
    // Simple decimal
    assert.equal(parsePrice("0,75"), 0.75);
    assert.equal(parsePrice(".50"), 0.5);
    // Zero prices (allowed in wholesale/demo)
    assert.equal(parsePrice("0"), 0);
    assert.equal(parsePrice("$0,00"), 0);
    // Negative numbers and non-finite must fail
    assert.equal(parsePrice("-0.01"), null);
    assert.equal(parsePrice("-1500"), null);
    assert.equal(parsePrice("Infinity"), null);
    assert.equal(parsePrice("-Infinity"), null);
    assert.equal(parsePrice("NaN"), null);
    assert.equal(parsePrice("gratis"), null);
    assert.equal(parsePrice(undefined), null);
    assert.equal(parsePrice(null), null);
  });

  // ===========================================================================
  // Challenge 3: SKU Exactness & Matching Priority
  // ===========================================================================
  await t.test("CHALLENGE 3: SKU string preservation and matching hierarchy", async () => {
    mockStorage.clear();
    const config = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_sku_products",
        ORDERS: "test_sku_orders",
        CUSTOMERS: "test_sku_cust",
        LOCAL_SETTINGS: "test_sku_settings"
      }
    };

    // Existing catalog with leading zero SKU and valid paso
    const initialProducts = [
      { id: "P-1", nombre: "Aceite 1L", codigo: "00042", precio: 2000, unidad_medida: "UNIDAD", paso: 1, categoria: "Almacen", disponible: true },
      { id: "P-2", nombre: "Aceite 500ml", codigo: "00043", precio: 1200, unidad_medida: "UNIDAD", paso: 1, categoria: "Almacen", disponible: true }
    ];
    mockStorage.setItem(config.storageKeys.PRODUCTS, JSON.stringify(initialProducts));
    const store = new Store(config);

    // Batch where SKU "00042" has different name -> matches by SKU, preserves P-1
    // And item without SKU matches by exact name "Aceite 500ml" -> matches P-2
    // And new item with SKU "00099" -> new item
    const batch = [
      { sku: "00042", nombre: "Aceite de Girasol 1L", precio: 2400 },
      { sku: "", nombre: "Aceite 500ml", precio: 1500 },
      { sku: "00099", nombre: "Vinagre 500ml", precio: 800 }
    ];

    const res = await store.importCatalogBatch(batch);
    assert.equal(res.updatedCount, 2);
    assert.equal(res.createdCount, 1);

    const updatedCatalog = store.getAdminProducts();
    const p1 = updatedCatalog.find(p => p.id === "P-1");
    assert.ok(p1);
    assert.equal(p1.codigo, "00042");
    assert.equal(p1.nombre, "Aceite de Girasol 1L");
    assert.equal(p1.precio, 2400);

    const p2 = updatedCatalog.find(p => p.id === "P-2");
    assert.ok(p2);
    assert.equal(p2.codigo, "00043"); // preserved old SKU
    assert.equal(p2.precio, 1500);

    const pNew = updatedCatalog.find(p => p.codigo === "00099");
    assert.ok(pNew);
    assert.equal(typeof pNew.id, "number");
    assert.equal(pNew.codigo, "00099");
  });

  // ===========================================================================
  // Challenge 4: Non-persisting Preview Lifecycle
  // ===========================================================================
  await t.test("CHALLENGE 4: Preview lifecycle guarantee (zero persistence before confirm)", () => {
    mockStorage.clear();
    const config = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_prev_products",
        ORDERS: "test_prev_orders",
        CUSTOMERS: "test_prev_cust",
        LOCAL_SETTINGS: "test_prev_settings"
      }
    };

    const initial = [{ id: 1, nombre: "Zanahoria", precio: 500, unidad_medida: "KG", paso: 0.5, categoria: "Verduras", disponible: true }];
    mockStorage.setItem(config.storageKeys.PRODUCTS, JSON.stringify(initial));
    const store = new Store(config);

    const snapshotBefore = JSON.stringify(store.getAdminProducts());

    // Parse untrusted CSV with price modifications and malformed rows
    const untrustedFile = `sku,nombre,precio\nZAN-01,Zanahoria,99999\n,Invalido,no_num\nNUEVO-01,Papa,800`;
    const parsed = parseCatalogFile(untrustedFile);

    // Verify parsing produced rows and errors
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.errors.length, 1);

    // Verify store has NOT changed at all
    const snapshotAfterParse = JSON.stringify(store.getAdminProducts());
    assert.equal(snapshotBefore, snapshotAfterParse);

    // Verify localStorage has no backups or mutations yet
    for (const key of mockStorage.keys()) {
      assert.ok(!key.startsWith("products_backup_"));
    }
  });

  // ===========================================================================
  // Challenge 5: Historical Order Immutability Under Destructive Catalog Operations
  // ===========================================================================
  await t.test("CHALLENGE 5: Historical order immutability when catalog prices swing or change modality", async () => {
    mockStorage.clear();
    const config = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_hist_products",
        ORDERS: "test_hist_orders",
        CUSTOMERS: "test_hist_cust",
        LOCAL_SETTINGS: "test_hist_settings"
      }
    };

    const initialCatalog = [
      { id: "PROD-A", nombre: "Cerezas", precio: 3000, unidad_medida: "KG", paso: 0.5, categoria: "Frutas", disponible: true, codigo: "CER-01" },
      { id: "PROD-B", nombre: "Bolsa Ecologica", precio: 500, unidad_medida: "UNIDAD", paso: 1, categoria: "Varios", disponible: true, codigo: "BOL-01" }
    ];
    mockStorage.setItem(config.storageKeys.PRODUCTS, JSON.stringify(initialCatalog));

    const historicalOrders = [
      {
        id: 501,
        cliente: { nombre: "Cliente Fiel", telefono: "1155443322" },
        tipo_entrega: "ENVIO",
        estado: "ENTREGADO",
        total_estimado: 6500,
        total_real: 6500,
        items: [
          { producto_id: "PROD-A", nombre: "Cerezas", unidad_medida: "KG", precio_unitario: 3000, cantidad_solicitada: 2, subtotal: 6000 },
          { producto_id: "PROD-B", nombre: "Bolsa Ecologica", unidad_medida: "UNIDAD", precio_unitario: 500, cantidad_solicitada: 1, subtotal: 500 }
        ]
      }
    ];
    mockStorage.setItem(config.storageKeys.ORDERS, JSON.stringify(historicalOrders));

    const store = new Store(config);

    // Import batch with 5x price increase for Cerezas and new unit for Bolsa
    const updates = [
      { sku: "CER-01", nombre: "Cerezas", precio: 15000, unidad_medida: "KG" },
      { sku: "BOL-01", nombre: "Bolsa Ecologica", precio: 1200, unidad_medida: "UNIDAD" }
    ];

    const importRes = await store.importCatalogBatch(updates);
    assert.equal(importRes.ok, true);

    // Historical order must remain 100% untouched
    const storedOrders = store.getOrders();
    assert.equal(storedOrders.length, 1);
    const order501 = storedOrders[0];
    assert.equal(order501.id, 501);
    assert.equal(order501.total_estimado, 6500);
    assert.equal(order501.total_real, 6500);
    assert.equal(order501.items[0].precio_unitario, 3000);
    assert.equal(order501.items[0].subtotal, 6000);
    assert.equal(order501.items[1].precio_unitario, 500);
    assert.equal(order501.items[1].subtotal, 500);
  });

  // ===========================================================================
  // Challenge 6: Production Fail-Closed PIN Authorization
  // ===========================================================================
  await t.test("CHALLENGE 6: Production fail-closed PIN enforcement and error handling", async () => {
    mockStorage.clear();
    const prodConfig = {
      mode: "production",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_sec_products",
        ORDERS: "test_sec_orders",
        CUSTOMERS: "test_sec_cust",
        LOCAL_SETTINGS: "test_sec_settings"
      }
    };

    const makeMockClient = (upsertImpl) => {
      const channelObj = {
        on: () => channelObj,
        subscribe: () => channelObj
      };
      return {
        channel: () => channelObj,
        removeChannel: () => {},
        from: (tbl) => ({
          select: () => ({
            order: () => Promise.resolve({ data: [] }),
            eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }), maybeSingle: () => Promise.resolve({ data: null }) })
          }),
          upsert: upsertImpl
        })
      };
    };

    // 6a. Production without PIN in staff headers
    mockStorage.setItem(prodConfig.storageKeys.LOCAL_SETTINGS, JSON.stringify({}));
    const mockSupabaseNoPin = makeMockClient(() => Promise.resolve({ data: [], error: null }));
    const storeNoPin = new Store(prodConfig, { supabaseClient: mockSupabaseNoPin });
    storeNoPin.getStaffPinHeaders = () => ({}); // simulate absence of PIN
    await assert.rejects(
      async () => {
        await storeNoPin.importCatalogBatch([{ nombre: "Manzana", precio: 1000 }]);
      },
      /Se requiere PIN de administración/
    );

    // 6b. Supabase returns error on upsert
    mockStorage.setItem(prodConfig.storageKeys.LOCAL_SETTINGS, JSON.stringify({ staffPin: "9999" }));
    const errorSupabase = makeMockClient(() => {
      const p = Promise.resolve({ data: null, error: { message: "RLS violation: invalid staff pin" } });
      p.setHeader = () => {};
      return p;
    });
    const storeError = new Store(prodConfig, { supabaseClient: errorSupabase });
    await assert.rejects(
      async () => {
        await storeError.importCatalogBatch([{ nombre: "Manzana", precio: 1000 }]);
      },
      /RLS violation: invalid staff pin/
    );
  });

  // ===========================================================================
  // Challenge 7: Unique Numeric ID Progression With Mixed ID Types
  // ===========================================================================
  await t.test("CHALLENGE 7: Unique numeric ID assignment with legacy string and numeric IDs", async () => {
    mockStorage.clear();
    const config = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_ids_products",
        ORDERS: "test_ids_orders",
        CUSTOMERS: "test_ids_cust",
        LOCAL_SETTINGS: "test_ids_settings"
      }
    };

    // Catalog with mixture of legacy IDs ("prod-10", 25, "custom-50") and valid paso
    const existing = [
      { id: "prod-10", nombre: "Item 10", precio: 100, unidad_medida: "UNIDAD", paso: 1, categoria: "General", disponible: true },
      { id: 25, nombre: "Item 25", precio: 200, unidad_medida: "UNIDAD", paso: 1, categoria: "General", disponible: true },
      { id: "custom-50", nombre: "Item 50", precio: 300, unidad_medida: "UNIDAD", paso: 1, categoria: "General", disponible: true }
    ];
    mockStorage.setItem(config.storageKeys.PRODUCTS, JSON.stringify(existing));
    const store = new Store(config);

    const newItems = [
      { nombre: "Nuevo Alpha", precio: 400 },
      { nombre: "Nuevo Beta", precio: 500 }
    ];

    const res = await store.importCatalogBatch(newItems);
    assert.equal(res.createdCount, 2);

    const catalog = store.getAdminProducts();
    const alpha = catalog.find(p => p.nombre === "Nuevo Alpha");
    const beta = catalog.find(p => p.nombre === "Nuevo Beta");

    // Highest numeric ID was 50 (from custom-50)
    assert.equal(alpha.id, 51);
    assert.equal(beta.id, 52);
  });
});
