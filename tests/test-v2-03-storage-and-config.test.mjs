import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Store } from "../js/store.js";
import { saveProductImage, isDirectImageUrl } from "../js/images.js";

// Mock localStorage for Store testing
const memStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => memStorage.get(k) ?? null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: (k) => memStorage.delete(k),
  clear: () => memStorage.clear()
};

test("Task V2-03: Supabase Storage Images & Comercio Config Suite", async (t) => {
  const schemaPath = path.resolve("supabase/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // ===========================================================================
  // 1. SQL Schema Invariants for imagen_url & public.comercio_config
  // ===========================================================================
  await t.test("1. SQL Schema - Product imagen_url and comercio_config singleton definition", () => {
    // 1.1 Column imagen_url in public.productos
    assert.ok(
      schemaSql.includes("imagen_url TEXT DEFAULT NULL"),
      "Schema must declare imagen_url TEXT DEFAULT NULL in public.productos"
    );
    assert.ok(
      schemaSql.includes("ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url TEXT DEFAULT NULL;"),
      "Schema must include idempotent ALTER TABLE for imagen_url in productos"
    );

    // 1.2 Table public.comercio_config definition
    assert.ok(
      schemaSql.includes("CREATE TABLE IF NOT EXISTS public.comercio_config ("),
      "Schema must define public.comercio_config table"
    );
    assert.ok(
      schemaSql.includes("id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1)"),
      "comercio_config must enforce singleton id = 1 check"
    );
    assert.ok(
      schemaSql.includes("nombre VARCHAR(120) NOT NULL"),
      "comercio_config must declare nombre column"
    );
    assert.ok(
      schemaSql.includes("alias VARCHAR(60) NOT NULL"),
      "comercio_config must declare alias column"
    );
    assert.ok(
      schemaSql.includes("whatsapp VARCHAR(25) NOT NULL"),
      "comercio_config must declare whatsapp column"
    );
    assert.ok(
      schemaSql.includes("costo_envio NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0)"),
      "comercio_config must declare non-negative costo_envio"
    );
    assert.ok(
      schemaSql.includes("compra_minima NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (compra_minima >= 0)"),
      "comercio_config must declare non-negative compra_minima"
    );
    assert.ok(
      schemaSql.includes("horarios VARCHAR(250) DEFAULT ''"),
      "comercio_config must declare horarios column"
    );
    assert.ok(
      schemaSql.includes("updated_at TIMESTAMPTZ DEFAULT NOW()"),
      "comercio_config must declare updated_at column"
    );

    // 1.3 Row Level Security on comercio_config
    assert.ok(
      schemaSql.includes("ALTER TABLE public.comercio_config ENABLE ROW LEVEL SECURITY;"),
      "Must enable RLS on public.comercio_config"
    );
    assert.ok(
      schemaSql.includes("CREATE POLICY \"comercio_config_select_public\" ON public.comercio_config FOR SELECT TO anon, authenticated USING (true);"),
      "Must define public select policy for comercio_config"
    );
    assert.ok(
      schemaSql.includes("CREATE POLICY \"comercio_config_write_staff\" ON public.comercio_config FOR ALL TO anon, authenticated USING (public.verify_staff_pin_header()) WITH CHECK (public.verify_staff_pin_header());"),
      "Must define staff pin write policy for comercio_config"
    );

    // 1.4 Seed default singleton row
    assert.ok(
      schemaSql.includes("INSERT INTO public.comercio_config"),
      "Schema must seed initial default row in comercio_config"
    );
    assert.ok(
      schemaSql.includes("ON CONFLICT (id) DO NOTHING;"),
      "Seed insert must be idempotent with ON CONFLICT (id) DO NOTHING"
    );

    // 1.5 Realtime publication
    assert.ok(
      schemaSql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.comercio_config;"),
      "Realtime publication must include public.comercio_config"
    );
  });

  // ===========================================================================
  // 2. Hybrid Images Pipeline: Branching & Direct URL Validation
  // ===========================================================================
  await t.test("2. Hybrid Images Pipeline - Direct URLs and saveProductImage", async () => {
    // 2.1 isDirectImageUrl detection
    assert.equal(isDirectImageUrl("https://supabase.co/storage/v1/object/public/product-images/products/p1.jpg"), true);
    assert.equal(isDirectImageUrl("http://localhost:3000/images/test.jpg"), true);
    assert.equal(isDirectImageUrl("img_123456_abcdef"), false);
    assert.equal(isDirectImageUrl(""), false);
    assert.equal(isDirectImageUrl(null), false);
    assert.equal(isDirectImageUrl(undefined), false);

    // 2.2 saveProductImage in Demo mode uses IndexedDB putImage
    const fakeBlob = new Blob([new Uint8Array(100)], { type: "image/jpeg" });

    let idbPutCalled = false;
    let idbSavedKey = null;
    globalThis.indexedDB = {
      open: () => {
        const req = {
          result: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        const dbMock = {
          objectStoreNames: { contains: () => true },
          transaction: () => {
            const tx = {
              objectStore: () => ({
                put: (_blob, key) => {
                  idbPutCalled = true;
                  idbSavedKey = key;
                  return {};
                }
              }),
              oncomplete: null,
              onerror: null,
              onabort: null
            };
            setTimeout(() => {
              if (tx.oncomplete) tx.oncomplete();
            }, 5);
            return tx;
          },
          close: () => {}
        };
        req.result = dbMock;
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 5);
        return req;
      }
    };

    const demoImgResult = await saveProductImage(fakeBlob, { isDemo: true });
    assert.ok(demoImgResult.startsWith("img_"), "Demo saveProductImage must return opaque img_* id");
    assert.ok(idbPutCalled, "Demo saveProductImage must persist to IndexedDB");

    // 2.3 saveProductImage in Production mode uploads to Supabase Storage
    let uploadCalled = false;
    let uploadPath = null;
    let uploadHeaders = null;
    const fakePublicUrl = "https://example-supabase.co/storage/v1/object/public/product-images/products/prod-99.jpg";

    const mockSupabase = {
      storage: {
        from: (bucket) => {
          assert.equal(bucket, "product-images", "Must upload to 'product-images' bucket");
          return {
            upload: async (destPath, _data, options) => {
              uploadCalled = true;
              uploadPath = destPath;
              uploadHeaders = options?.headers;
              return { data: { path: destPath }, error: null };
            },
            getPublicUrl: (destPath) => {
              return { data: { publicUrl: fakePublicUrl } };
            }
          };
        }
      }
    };

    const prodImgResult = await saveProductImage(fakeBlob, {
      isDemo: false,
      supabase: mockSupabase,
      staffPin: "9999",
      productId: "prod-99"
    });

    assert.equal(prodImgResult, fakePublicUrl, "Must return public HTTPS URL from Supabase Storage");
    assert.ok(uploadCalled, "Must call Supabase storage upload");
    assert.equal(uploadPath, "products/prod-99.jpg", "Path must be products/<productId>.jpg");
    assert.deepEqual(uploadHeaders, { "x-nexo-staff-pin": "9999" }, "Must include x-nexo-staff-pin header");
  });

  // ===========================================================================
  // 3. Store Comercio Config in Demo Mode
  // ===========================================================================
  await t.test("3. Store Comercio Config - Demo persistence and synchronization", async () => {
    memStorage.clear();
    const demoConfig = {
      supabaseUrl: "",
      supabaseAnonKey: "",
      mode: "demo",
      ok: true,
      reason: null
    };
    const store = new Store(demoConfig);

    // Initial default config
    const initialConfig = store.getComercioConfigSync();
    assert.equal(initialConfig.costo_envio, 0, "Default demo costo_envio must be 0");
    assert.equal(initialConfig.compra_minima, 0, "Default demo compra_minima must be 0");
    assert.ok(typeof initialConfig.nombre === "string" && initialConfig.nombre.length > 0);

    // Save updated config
    const saved = await store.saveComercioConfig({
      nombre: "Verdulería Don Pepe",
      alias: "donpepe",
      whatsapp: "5491155554444",
      costo_envio: 500,
      compra_minima: 3000,
      horarios: "Lun a Sáb 8 a 20hs"
    });

    assert.equal(saved.nombre, "Verdulería Don Pepe");
    assert.equal(saved.costo_envio, 500);
    assert.equal(saved.compra_minima, 3000);
    assert.equal(saved.horarios, "Lun a Sáb 8 a 20hs");

    // Verify localStorage key
    const rawSaved = JSON.parse(memStorage.get("nexo_demo_v1_business_config"));
    assert.equal(rawSaved.nombre, "Verdulería Don Pepe");
    assert.equal(rawSaved.costo_envio, 500);
    assert.equal(rawSaved.compra_minima, 3000);

    // Re-read synchronously and asynchronously
    const syncRead = store.getComercioConfigSync();
    assert.equal(syncRead.costo_envio, 500);
    const asyncRead = await store.getComercioConfig();
    assert.equal(asyncRead.compra_minima, 3000);

    // Validation: negative values rejected
    await assert.rejects(
      () => store.saveComercioConfig({ costo_envio: -100 }),
      /El costo de envío no puede ser negativo/
    );
    await assert.rejects(
      () => store.saveComercioConfig({ compra_minima: -50 }),
      /La compra mínima no puede ser negativa/
    );
  });

  // ===========================================================================
  // 4. Store Comercio Config in Production Mode (Supabase + Staff PIN)
  // ===========================================================================
  await t.test("4. Store Comercio Config - Production upsert with staff PIN", async () => {
    memStorage.clear();
    const prodConfig = {
      supabaseUrl: "https://mock.supabase.co",
      supabaseAnonKey: "mock-key",
      mode: "production",
      ok: true,
      reason: null
    };

    let upsertCalled = false;
    let upsertPayload = null;
    let upsertHeaders = null;

    const mockSupabase = {
      from: (table) => {
        if (table === "comercio_config") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 1,
                    nombre: "Huerta Producción",
                    alias: "huertaprod",
                    whatsapp: "5491122223333",
                    costo_envio: 750,
                    compra_minima: 4000,
                    horarios: "8:00 a 19:00"
                  },
                  error: null
                })
              })
            }),
            upsert: (payload) => {
              upsertCalled = true;
              upsertPayload = payload;
              const builder = {
                setHeader: (name, val) => {
                  if (!upsertHeaders) upsertHeaders = {};
                  upsertHeaders[name] = val;
                  return builder;
                },
                select: () => ({
                  single: async () => ({ data: payload, error: null })
                })
              };
              return builder;
            }
          };
        }
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        };
      },
      channel: () => ({
        on: function() { return this; },
        subscribe: function() { return this; }
      }),
      removeChannel: () => {}
    };

    const store = new Store(prodConfig, { supabaseClient: mockSupabase });

    // Without staff PIN, saving should reject
    await assert.rejects(
      () => store.saveComercioConfig({ nombre: "Intento Sin PIN" }),
      /Se requiere el PIN de administración/
    );

    // Save with staff PIN
    const saved = await store.saveComercioConfig(
      {
        nombre: "Huerta Central",
        alias: "huertacentral",
        whatsapp: "5491199998888",
        costo_envio: 1200,
        compra_minima: 5000,
        horarios: "Lunes a Viernes 9 a 18 hs"
      },
      { staffPin: "1234" }
    );

    assert.ok(upsertCalled, "Must call Supabase upsert on comercio_config");
    assert.equal(upsertPayload.id, 1, "Must upsert singleton id = 1");
    assert.equal(upsertPayload.nombre, "Huerta Central");
    assert.equal(upsertPayload.costo_envio, 1200);
    assert.equal(upsertPayload.compra_minima, 5000);
    assert.deepEqual(upsertHeaders, { "x-nexo-staff-pin": "1234" }, "Must include x-nexo-staff-pin header");
  });

  // ===========================================================================
  // 5. Cart Calculations: Shipping Cost & Compra Mínima Validation
  // ===========================================================================
  await t.test("5. Cart Calculations - Shipping cost and minimum purchase enforcement", async () => {
    memStorage.clear();
    const demoConfig = {
      supabaseUrl: "",
      supabaseAnonKey: "",
      mode: "demo",
      ok: true,
      reason: null
    };
    const store = new Store(demoConfig);

    // Configure store: envio $600, compra minima $3000
    await store.saveComercioConfig({
      costo_envio: 600,
      compra_minima: 3000
    });

    const products = store.getProducts();
    const prod1 = products[0]; // Banana $1800/kg
    assert.ok(prod1, "Must have catalog product");

    // Add 1kg Banana ($1800) -> subtotal $1800 < $3000 minimum
    store.addToCart(prod1.id, 1);

    // 5.1 Test Retiro en Local
    const summaryRetiro = store.getCartSummary({ tipo_entrega: "RETIRO" });
    assert.equal(summaryRetiro.subtotal, 1800);
    assert.equal(summaryRetiro.costo_envio, 0, "Retiro en local has 0 shipping cost");
    assert.equal(summaryRetiro.totalEstimado, 1800);
    assert.equal(summaryRetiro.cumpleMinimo, false, "Subtotal $1800 does not meet $3000 minimum");

    // 5.2 Test Delivery
    const summaryDelivery = store.getCartSummary({ tipo_entrega: "DELIVERY" });
    assert.equal(summaryDelivery.subtotal, 1800);
    assert.equal(summaryDelivery.costo_envio, 600, "Delivery has $600 shipping cost");
    assert.equal(summaryDelivery.totalEstimado, 2400, "Total estimado = subtotal $1800 + shipping $600");
    assert.equal(summaryDelivery.cumpleMinimo, false);

    // 5.3 Attempting checkout below minimum purchase must throw
    const client = { nombre: "Juan Perez", telefono: "1144445555" };
    assert.throws(
      () => store.createOrder({
        cliente: client,
        tipo_entrega: "DELIVERY",
        direccion_entrega: "Av. Corrientes 1234"
      }),
      /La compra mínima es de \$3\.000/
    );

    // 5.4 Add more items so subtotal >= $3000
    store.addToCart(prod1.id, 1); // 2kg Banana = $3600 >= $3000
    const summaryUpdated = store.getCartSummary({ tipo_entrega: "DELIVERY" });
    assert.equal(summaryUpdated.subtotal, 3600);
    assert.equal(summaryUpdated.costo_envio, 600);
    assert.equal(summaryUpdated.totalEstimado, 4200);
    assert.equal(summaryUpdated.cumpleMinimo, true);

    // Checkout now succeeds and order includes shipping in total_estimado
    const order = store.createOrder({
      cliente: client,
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Av. Corrientes 1234"
    });

    assert.ok(order, "Order creation must succeed when minimum is reached");
    assert.equal(order.tipo_entrega, "DELIVERY");
    assert.equal(order.direccion_entrega, "Av. Corrientes 1234");
    assert.equal(order.total_estimado, 4200, "Order total_estimado must include shipping cost");
  });

  // ===========================================================================
  // 6. Product Mapping & Image URL Synchronization
  // ===========================================================================
  await t.test("6. Product Mapping - imagen_url preservation in sync", async () => {
    memStorage.clear();
    const store = new Store({
      supabaseUrl: "",
      supabaseAnonKey: "",
      mode: "demo",
      ok: true,
      reason: null
    });

    const p = store.getProducts()[0];
    const updated = store.saveProduct({
      ...p,
      imagen_url: "https://example.com/banana.jpg"
    }, p.id);

    assert.equal(updated.imagen_url, "https://example.com/banana.jpg", "Product must preserve imagen_url");
    const read = store.getProducts().find(item => item.id === p.id);
    assert.equal(read.imagen_url, "https://example.com/banana.jpg");
  });
});
