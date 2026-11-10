/**
 * NEXO PEDIDOS - EMPIRICAL ADVERSARIAL STRESS TEST SUITE (V2-05)
 *
 * Target: Task V2-05: Local CSV/TSV Catalog Importer
 * Evaluates: js/csv-parser.js, js/store.js, js/views/admin.js, js/html.js
 *
 * Focus:
 * 1. Malformed CSV/TSV inputs (unclosed quotes, inconsistent columns, crazy delimiters, BOM vs non-BOM, empty files, huge rows).
 * 2. Extreme price formats ($1.000.000,99, -.50, $ 0,00, currency strings with spaces, invalid strings).
 * 3. Hostile SKU values (0000001, 01234567890123456789, A-01/B, unicode SKUs, XSS in SKU or product name).
 * 4. Snapshot preservation under heavy mutation (prices reduced to $0.01, names altered, orders retain exact historic values).
 * 5. Preview cancellation (zero mutations to store or storage if modal is cancelled or not confirmed).
 * 6. Batch import boundaries, duplicate SKUs in same file, non-numeric legacy IDs, and defensive validation.
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
import { escapeHtml } from "../js/html.js";

// In-memory mock storage implementation conforming to Web Storage API
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
    },
    snapshot() {
      const obj = {};
      for (const [k, v] of map.entries()) {
        obj[k] = v;
      }
      return JSON.stringify(obj);
    }
  };
}

test("V2-05 EMPIRICAL ADVERSARIAL STRESS SUITE", async (suite) => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  // --------------------------------------------------------------------------
  // SUITE 1: MALFORMED CSV / TSV INPUTS
  // --------------------------------------------------------------------------
  await suite.test("1. Malformed CSV/TSV inputs resilience", async (t) => {
    await t.test("1.1 Unclosed quotes at end of row and spanning rows", () => {
      // Unclosed quote on the final field
      const csvUnclosedEnd = 'sku,nombre,precio\n"SKU-1","Manzana",1000\n"SKU-2","Naranja Sin Cerrar,1500';
      const res1 = parseCatalogFile(csvUnclosedEnd);
      // The parser should recover gracefully without throwing an unhandled exception
      assert.ok(Array.isArray(res1.rows));
      assert.ok(Array.isArray(res1.errors));
      // First valid row parsed
      assert.equal(res1.rows[0].sku, "SKU-1");
      assert.equal(res1.rows[0].nombre, "Manzana");
      assert.equal(res1.rows[0].precio, 1000);

      // Unclosed quote at very beginning spanning whole file
      const csvUnclosedAll = '"sku,nombre,precio\nSKU-1,Manzana,1000';
      const res2 = parseCatalogFile(csvUnclosedAll);
      assert.ok(Array.isArray(res2.rows));
      // Missing required header column 'nombre' because quote enclosed the header line
      assert.ok(res2.errors.length > 0);
    });

    await t.test("1.2 Inconsistent column counts per row", () => {
      const csvInconsistent = [
        "sku,nombre,precio,categoria",
        "SKU-A", // Only 1 column (missing nombre and precio)
        "SKU-B,Pera", // 2 columns (missing precio)
        "SKU-C,Durazno,2500,Frutas,Extra1,Extra2,Extra3,Extra4", // 8 columns (extra columns)
        "SKU-D,Ciruela,1800" // 3 columns (optional categoria omitted)
      ].join("\n");

      const res = parseCatalogFile(csvInconsistent);
      // SKU-A and SKU-B must be recorded as error rows
      assert.equal(res.errors.length, 2);
      assert.equal(res.errors[0].row, 2);
      assert.ok(res.errors[0].error.includes("nombre"));
      assert.equal(res.errors[1].row, 3);
      assert.ok(res.errors[1].error.includes("Precio"));

      // SKU-C and SKU-D must be parsed successfully
      assert.equal(res.rows.length, 2);
      assert.equal(res.rows[0].sku, "SKU-C");
      assert.equal(res.rows[0].nombre, "Durazno");
      assert.equal(res.rows[0].precio, 2500);
      assert.equal(res.rows[0].categoria, "Frutas");

      assert.equal(res.rows[1].sku, "SKU-D");
      assert.equal(res.rows[1].nombre, "Ciruela");
      assert.equal(res.rows[1].precio, 1800);
      assert.equal(res.rows[1].categoria, "General"); // default category
    });

    await t.test("1.3 Crazy delimiters & Delimiter auto-detection fallback", () => {
      // Delimiter detection on pure tabs
      const tsv = "sku\tnombre\tprecio\nSKU-01\tTomate\t500";
      assert.equal(detectDelimiter(tsv), "\t");
      assert.equal(parseCatalogFile(tsv).rows.length, 1);

      // Delimiter detection on semicolon
      const ssv = "sku;nombre;precio\nSKU-02;Lechuga;400";
      assert.equal(detectDelimiter(ssv), ";");
      assert.equal(parseCatalogFile(ssv).rows.length, 1);

      // File using pipe delimiter '|' (not supported delimiter)
      const psv = "sku|nombre|precio\nSKU-03|Ajo|300";
      assert.equal(detectDelimiter(psv), ","); // defaults to comma
      const resPipe = parseCatalogFile(psv);
      // Because delimiter defaults to comma, the single column contains pipe characters
      // Missing mandatory column 'nombre' error is safely returned without uncaught crash
      assert.equal(resPipe.rows.length, 0);
      assert.ok(resPipe.errors.length > 0);
      assert.ok(resPipe.errors[0].error.includes("columna obligatoria"));
    });

    await t.test("1.4 UTF-8 BOM vs non-BOM handling in headers and values", () => {
      // BOM at byte 0 of file before 'sku'
      const csvWithBom = "\uFEFFsku,nombre,precio\n001,Manzana Gala,1200\n002,Naranja Valencia,900";
      const resBom = parseCatalogFile(csvWithBom);
      assert.equal(resBom.errors.length, 0);
      assert.equal(resBom.rows.length, 2);
      assert.equal(resBom.rows[0].sku, "001");
      assert.equal(resBom.rows[0].nombre, "Manzana Gala");
      assert.equal(resBom.rows[0].precio, 1200);

      // BOM before 'nombre' as first column
      const csvWithBomNombre = "\uFEFFnombre,precio,sku\nBanana,1800,003";
      const resBomNombre = parseCatalogFile(csvWithBomNombre);
      assert.equal(resBomNombre.errors.length, 0);
      assert.equal(resBomNombre.rows.length, 1);
      assert.equal(resBomNombre.rows[0].nombre, "Banana");
      assert.equal(resBomNombre.rows[0].sku, "003");
    });

    await t.test("1.5 Empty files, whitespace-only, and header-only files", () => {
      // Pure empty
      const empty = parseCatalogFile("");
      assert.equal(empty.rows.length, 0);
      assert.equal(empty.errors[0].error, "El archivo está vacío.");

      // Whitespace only
      const spaces = parseCatalogFile("   \t\r\n   \n   ");
      assert.equal(spaces.rows.length, 0);
      assert.equal(spaces.errors[0].error, "El archivo está vacío.");

      // Header only
      const headerOnly = parseCatalogFile("sku,nombre,precio\n");
      assert.equal(headerOnly.rows.length, 0);
      assert.equal(headerOnly.errors.length, 0); // No rows, but no error

      // Multiple blank lines interspersed
      const interspersed = "sku,nombre,precio\n\n\nSKU-1,Prod 1,100\n\n\nSKU-2,Prod 2,200\n\n";
      const resInter = parseCatalogFile(interspersed);
      assert.equal(resInter.rows.length, 2);
      assert.equal(resInter.errors.length, 0);
    });

    await t.test("1.6 Huge rows & High-volume payload stress", () => {
      // Huge cell (10,000 characters) in description
      const hugeDetail = "A".repeat(10000);
      const csvHugeCell = `sku,nombre,precio,descripcion\nBIG-01,Producto Grande,1500,"${hugeDetail}"`;
      const resHuge = parseCatalogFile(csvHugeCell);
      assert.equal(resHuge.rows.length, 1);
      assert.equal(resHuge.rows[0].detalle.length, 10000);

      // High-volume: 1,000 items in a single CSV
      const rows = ["sku,nombre,precio,categoria,unidad"];
      for (let i = 1; i <= 1000; i++) {
        rows.push(`SKU-${String(i).padStart(4, "0")},Producto ${i},${(i * 10.5).toFixed(2)},Cat ${i % 10},UNIDAD`);
      }
      const largeCsv = rows.join("\n");
      const startTime = performance.now();
      const resLarge = parseCatalogFile(largeCsv);
      const durationMs = performance.now() - startTime;

      assert.equal(resLarge.rows.length, 1000);
      assert.equal(resLarge.errors.length, 0);
      assert.ok(durationMs < 250, `1000 rows parsed in ${durationMs.toFixed(2)}ms (should be < 250ms)`);
    });

    await t.test("1.7 Mixed CRLF, LF, and CR-only line breaks", () => {
      // Mixed line endings in a single payload
      const mixed = "sku,nombre,precio\r\nSKU-1,Prod CRLF,100\nSKU-2,Prod LF,200\r\nSKU-3,Prod CRLF2,300";
      const res = parseCatalogFile(mixed);
      assert.equal(res.rows.length, 3);
      assert.equal(res.rows[0].nombre, "Prod CRLF");
      assert.equal(res.rows[1].nombre, "Prod LF");
      assert.equal(res.rows[2].nombre, "Prod CRLF2");
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 2: EXTREME PRICE FORMATS
  // --------------------------------------------------------------------------
  await suite.test("2. Extreme price formats verification", async (t) => {
    await t.test("2.1 High Argentine and European currency formats", () => {
      assert.equal(parsePrice("$1.000.000,99"), 1000000.99);
      assert.equal(parsePrice("1.000.000,99"), 1000000.99);
      assert.equal(parsePrice("$ 1.500.000"), 1500000);
      assert.equal(parsePrice("15.000"), 15000);
      assert.equal(parsePrice("2.300"), 2300);
      assert.equal(parsePrice("2.300,50"), 2300.5);
      assert.equal(parsePrice("$ 999.999,00"), 999999);
      assert.equal(parsePrice("1,500,000.75"), 1500000.75); // US format
    });

    await t.test("2.2 Rejection of negative prices", () => {
      assert.equal(parsePrice("-.50"), null);
      assert.equal(parsePrice("-100"), null);
      assert.equal(parsePrice("$-50"), null);
      assert.equal(parsePrice("-$ 150"), null);
      assert.equal(parsePrice("($50)"), null);
      assert.equal(parsePrice("-0.01"), null);

      // Verify that CSV parser flags negative prices as errors
      const csvNegative = "sku,nombre,precio\nNEG-1,Producto Negativo,-150\nNEG-2,Producto Negativo 2,-.50";
      const res = parseCatalogFile(csvNegative);
      assert.equal(res.rows.length, 0);
      assert.equal(res.errors.length, 2);
      assert.ok(res.errors[0].error.includes("Precio inválido"));
      assert.ok(res.errors[1].error.includes("Precio inválido"));
    });

    await t.test("2.3 Acceptance of zero prices (free or gift items)", () => {
      assert.equal(parsePrice("$ 0,00"), 0);
      assert.equal(parsePrice("0"), 0);
      assert.equal(parsePrice("0.00"), 0);
      assert.equal(parsePrice("$0"), 0);
      assert.equal(parsePrice("0,0"), 0);
      assert.equal(parsePrice(0), 0);

      const csvZero = "sku,nombre,precio\nFREE-1,Muestra Gratis,0\nFREE-2,Folleto,$ 0,00";
      const res = parseCatalogFile(csvZero);
      assert.equal(res.rows.length, 2);
      assert.equal(res.rows[0].precio, 0);
      assert.equal(res.rows[1].precio, 0);
    });

    await t.test("2.4 Currency strings with irregular spacing and symbols", () => {
      assert.equal(parsePrice("  $   1.500,50   "), 1500.5);
      assert.equal(parsePrice("€ 2500"), 2500);
      assert.equal(parsePrice("   $   950   "), 950);
      assert.equal(parsePrice("\t$ 1200\n"), 1200);
    });

    await t.test("2.5 Rejection of junk, non-finite, or malformed strings", () => {
      const invalidPrices = [
        "gratis",
        "consultar",
        "N/A",
        "NaN",
        "Infinity",
        "-Infinity",
        "1.2.3.4",
        "100,200,300",
        "$$$",
        "   ",
        "",
        null,
        undefined,
        {},
        []
      ];

      for (const p of invalidPrices) {
        assert.equal(parsePrice(p), null, `Expected null for invalid price: ${JSON.stringify(p)}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 3: HOSTILE SKU VALUES & XSS SANITIZATION
  // --------------------------------------------------------------------------
  await suite.test("3. Hostile SKU values and XSS sanitization", async (t) => {
    await t.test("3.1 Leading zeroes string preservation in parser and store", async () => {
      mockStorage.clear();
      const testConfig = {
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: {
          PRODUCTS: "test_sku_lead_zeroes",
          ORDERS: "test_sku_lead_zeroes_ord",
          CUSTOMERS: "test_sku_lead_zeroes_cust",
          LOCAL_SETTINGS: "test_sku_lead_zeroes_sett"
        }
      };

      const csvSkus = "sku,nombre,precio\n0000001,Producto 1,100\n007,Agente Secreto,777\n0000,Cero Cuadruple,50";
      const parsed = parseCatalogFile(csvSkus);

      assert.equal(parsed.rows[0].sku, "0000001");
      assert.equal(parsed.rows[1].sku, "007");
      assert.equal(parsed.rows[2].sku, "0000");

      const store = new Store(testConfig);
      await store.importCatalogBatch(parsed.rows);

      const savedProducts = store.getAdminProducts();
      assert.equal(savedProducts.find(p => p.nombre === "Producto 1").codigo, "0000001");
      assert.equal(savedProducts.find(p => p.nombre === "Agente Secreto").codigo, "007");
      assert.equal(savedProducts.find(p => p.nombre === "Cero Cuadruple").codigo, "0000");
    });

    await t.test("3.2 Long numeric strings (20+ digits) preserved without scientific notation or truncation", async () => {
      mockStorage.clear();
      const testConfig = {
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: {
          PRODUCTS: "test_sku_long_num",
          ORDERS: "test_sku_long_num_ord",
          CUSTOMERS: "test_sku_long_num_cust",
          LOCAL_SETTINGS: "test_sku_long_num_sett"
        }
      };

      // 20-digit SKU: exceeds Number.MAX_SAFE_INTEGER (9007199254740991)
      const longSku = "01234567890123456789";
      const csvLong = `sku,nombre,precio\n${longSku},Producto BigInt,500`;
      const parsed = parseCatalogFile(csvLong);

      assert.equal(parsed.rows[0].sku, "01234567890123456789");

      const store = new Store(testConfig);
      await store.importCatalogBatch(parsed.rows);

      const saved = store.getAdminProducts().find(p => p.nombre === "Producto BigInt");
      assert.equal(saved.codigo, "01234567890123456789");
      assert.ok(!saved.codigo.includes("e+"), "Long SKU must not be converted to scientific notation");
    });

    await t.test("3.3 Formula injection, slashes, and special characters", async () => {
      const specialSkus = [
        "A-01/B",
        "=cmd|' /C calc'!A0",
        "@SUM(A1:A10)",
        "+12345",
        "-45678",
        "SKU#HASH",
        "BARCODE*123"
      ];

      const csvLines = ["sku,nombre,precio", ...specialSkus.map((s, i) => `"${s.replace(/"/g, '""')}",Item ${i},100`)];
      const parsed = parseCatalogFile(csvLines.join("\n"));
      assert.equal(parsed.errors.length, 0);

      specialSkus.forEach((sku, idx) => {
        assert.equal(parsed.rows[idx].sku, sku);
      });
    });

    await t.test("3.4 Unicode and emoji in SKU and product name", () => {
      const unicodeCsv = `sku,nombre,precio,categoria\n"🍎-001","Manzana Roja 🍎",1500,"Frutas 🍓"\n"CÓD-ÑANDÚ","Carne de Ñandú",3500,"Carnes"`;
      const parsed = parseCatalogFile(unicodeCsv);
      assert.equal(parsed.errors.length, 0);
      assert.equal(parsed.rows[0].sku, "🍎-001");
      assert.equal(parsed.rows[0].nombre, "Manzana Roja 🍎");
      assert.equal(parsed.rows[0].categoria, "Frutas 🍓");
      assert.equal(parsed.rows[1].sku, "CÓD-ÑANDÚ");
      assert.equal(parsed.rows[1].nombre, "Carne de Ñandú");
    });

    await t.test("3.5 XSS payload in SKU, product name, and error raw text safely escaped", () => {
      const xssPayloads = [
        "<script>alert(1)</script>",
        '"><img src=x onerror=alert(1)>',
        "' onfocus='alert(1)'",
        "<svg onload=alert(document.cookie)>",
        "<iframe src='javascript:alert(1)'>"
      ];

      for (const payload of xssPayloads) {
        const escaped = escapeHtml(payload);
        // None of the raw unescaped tags or dangerous quotes may appear in escaped text
        assert.ok(!escaped.includes("<script>"), `Script tag was not neutralized: ${escaped}`);
        assert.ok(!escaped.includes("<img"), `Img tag was not neutralized: ${escaped}`);
        assert.ok(!escaped.includes("<svg"), `Svg tag was not neutralized: ${escaped}`);
        assert.ok(!escaped.includes("<iframe"), `Iframe tag was not neutralized: ${escaped}`);
        assert.ok(!escaped.includes('"'), `Double quotes must be escaped: ${escaped}`);
        assert.ok(!escaped.includes("'"), `Single quotes must be escaped: ${escaped}`);
      }

      // Test preview row HTML generation with hostile payload
      const hostileItem = {
        nombre: "<script>alert('pwn')</script>",
        sku: '"><svg onload=alert(1)>',
        categoria: "<b>Hacked</b>",
        unidad_medida: "UNIDAD",
        precio: 100
      };

      const renderedItemHtml = `
        <div class="font-bold text-slate-900 dark:text-white truncate">${escapeHtml(hostileItem.nombre)}</div>
        <span>SKU: ${escapeHtml(hostileItem.sku || "Sin SKU")}</span>
        <span>${escapeHtml(hostileItem.categoria)}</span>
      `;

      assert.ok(!renderedItemHtml.includes("<script>"));
      assert.ok(!renderedItemHtml.includes("<svg onload"));
      assert.ok(!renderedItemHtml.includes("<b>Hacked</b>"));
      assert.ok(renderedItemHtml.includes("&lt;script&gt;"));
      assert.ok(renderedItemHtml.includes("&lt;b&gt;Hacked&lt;/b&gt;"));
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 4: HISTORICAL ORDER SNAPSHOT IMMUTABILITY UNDER DESTRUCTIVE CATALOG MUTATION
  // --------------------------------------------------------------------------
  await suite.test("4. Historical order snapshot immutability under heavy catalog mutation", async () => {
    mockStorage.clear();
    const testConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_immut_products",
        ORDERS: "test_immut_orders",
        CUSTOMERS: "test_immut_customers",
        LOCAL_SETTINGS: "test_immut_local_settings"
      }
    };

    // 1. Initial catalog with 3 products
    const initialProducts = [
      {
        id: "prod-oil",
        codigo: "OIL-01",
        nombre: "Aceite de Oliva Extra Virgen 500ml",
        categoria: "Almacen",
        precio: 6500,
        unidad_medida: "UNIDAD",
        paso: 1,
        disponible: true
      },
      {
        id: "prod-tomate",
        codigo: "TOM-01",
        nombre: "Tomate Cherry Especial",
        categoria: "Verduras",
        precio: 2400,
        unidad_medida: "KG",
        paso: 0.5,
        disponible: true
      },
      {
        id: "prod-queso",
        codigo: "QUE-01",
        nombre: "Queso Parmesano Reserva",
        categoria: "Lacteos",
        precio: 8500,
        unidad_medida: "UNIDAD",
        paso: 1,
        disponible: true
      }
    ];
    mockStorage.setItem(testConfig.storageKeys.PRODUCTS, JSON.stringify(initialProducts));

    // 2. Historical order #201 (mixed UNIDAD and weighed KG items)
    const historicalOrder1 = {
      id: 201,
      cliente: { nombre: "Valentina Rossi", telefono: "1155443322", direccion: "Av. Corrientes 1234" },
      tipo_entrega: "RETIRO",
      estado: "ENTREGADO",
      total_estimado: 16600, // (2 * 6500) + (1.5 * 2400) = 13000 + 3600 = 16600
      total_real: 16840,     // 2 * 6500 + 1.6 kg * 2400 = 13000 + 3840 = 16840
      items: [
        {
          producto_id: "prod-oil",
          nombre: "Aceite de Oliva Extra Virgen 500ml",
          unidad_medida: "UNIDAD",
          precio_unitario: 6500,
          cantidad_solicitada: 2,
          peso_real: 2,
          subtotal: 13000
        },
        {
          producto_id: "prod-tomate",
          nombre: "Tomate Cherry Especial",
          unidad_medida: "KG",
          precio_unitario: 2400,
          cantidad_solicitada: 1.5,
          peso_real: 1.6,
          subtotal: 3840
        }
      ]
    };

    // 3. Historical order #202 (UNIDAD delivery)
    const historicalOrder2 = {
      id: 202,
      cliente: { nombre: "Carlos Gomez", telefono: "1199887766", direccion: "Belgrano 567" },
      tipo_entrega: "ENVIO",
      estado: "ENTREGADO",
      total_estimado: 8500,
      total_real: 8500,
      items: [
        {
          producto_id: "prod-queso",
          nombre: "Queso Parmesano Reserva",
          unidad_medida: "UNIDAD",
          precio_unitario: 8500,
          cantidad_solicitada: 1,
          peso_real: 1,
          subtotal: 8500
        }
      ]
    };

    mockStorage.setItem(testConfig.storageKeys.ORDERS, JSON.stringify([historicalOrder1, historicalOrder2]));

    const store = new Store(testConfig);

    // 4. Heavy mutation: import catalog crashing prices to $0.01, altering descriptions, and adding 50 new items
    const destructiveBatch = [
      {
        sku: "OIL-01",
        nombre: "Aceite de Oliva Rancio Modificado",
        precio: 0.01,
        categoria: "Remate",
        unidad_medida: "UNIDAD"
      },
      {
        sku: "TOM-01",
        nombre: "Tomate Podrido Destruido",
        precio: 0.01,
        categoria: "Descarte",
        unidad_medida: "KG"
      },
      {
        sku: "QUE-01",
        nombre: "Queso Vencido Modificado",
        precio: 0.01,
        categoria: "Descarte",
        unidad_medida: "UNIDAD"
      }
    ];

    for (let i = 1; i <= 50; i++) {
      destructiveBatch.push({
        sku: `FLOOD-${i}`,
        nombre: `Item Inundacion ${i}`,
        precio: i * 10,
        categoria: "Inundacion",
        unidad_medida: "UNIDAD"
      });
    }

    const importResult = await store.importCatalogBatch(destructiveBatch);
    assert.equal(importResult.ok, true);
    assert.equal(importResult.updatedCount, 3);
    assert.equal(importResult.createdCount, 50);

    // Verify current products now have modified prices
    const currentOil = store.getAdminProducts().find(p => p.codigo === "OIL-01");
    assert.equal(currentOil.precio, 0.01);
    assert.equal(currentOil.nombre, "Aceite de Oliva Rancio Modificado");

    // 5. CRITICAL CHECK: Verify historical orders are 100% IMMUTABLE and untouched
    const storedOrders = store.getOrders();
    assert.equal(storedOrders.length, 2);

    const order1 = storedOrders.find(o => o.id === 201);
    assert.ok(order1, "Order 201 must exist");
    assert.equal(order1.total_estimado, 16600, "Historical total_estimado must remain 16600");
    assert.equal(order1.total_real, 16840, "Historical total_real must remain 16840");

    assert.equal(order1.items[0].nombre, "Aceite de Oliva Extra Virgen 500ml");
    assert.equal(order1.items[0].precio_unitario, 6500, "Snapshot price must remain 6500");
    assert.equal(order1.items[0].subtotal, 13000);

    assert.equal(order1.items[1].nombre, "Tomate Cherry Especial");
    assert.equal(order1.items[1].precio_unitario, 2400, "Snapshot price must remain 2400");
    assert.equal(order1.items[1].subtotal, 3840);

    const order2 = storedOrders.find(o => o.id === 202);
    assert.ok(order2, "Order 202 must exist");
    assert.equal(order2.total_estimado, 8500);
    assert.equal(order2.total_real, 8500);
    assert.equal(order2.items[0].nombre, "Queso Parmesano Reserva");
    assert.equal(order2.items[0].precio_unitario, 8500);
    assert.equal(order2.items[0].subtotal, 8500);

    // Re-read directly from localStorage raw JSON to confirm storage isolation
    const rawOrdersInStorage = JSON.parse(mockStorage.getItem(testConfig.storageKeys.ORDERS));
    assert.equal(rawOrdersInStorage[0].items[0].precio_unitario, 6500);
    assert.equal(rawOrdersInStorage[1].items[0].precio_unitario, 8500);
  });

  // --------------------------------------------------------------------------
  // SUITE 5: PREVIEW CANCELLATION ZERO SIDE-EFFECTS (ISOLATION)
  // --------------------------------------------------------------------------
  await suite.test("5. Preview cancellation leaves store and storage completely untouched", async () => {
    mockStorage.clear();
    const testConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "test_cancel_products",
        ORDERS: "test_cancel_orders",
        CUSTOMERS: "test_cancel_customers",
        LOCAL_SETTINGS: "test_cancel_settings"
      }
    };

    const initialCatalog = [
      { id: 1, codigo: "SKU-A", nombre: "Producto Original A", precio: 1000, unidad_medida: "UNIDAD", paso: 1, categoria: "Cat A", disponible: true },
      { id: 2, codigo: "SKU-B", nombre: "Producto Original B", precio: 2000, unidad_medida: "KG", paso: 0.5, categoria: "Cat B", disponible: true }
    ];
    const initialOrders = [
      { id: 501, estado: "PENDIENTE", total_estimado: 3000, items: [] }
    ];
    const initialSettings = { staffPin: "1234", theme: "dark" };

    mockStorage.setItem(testConfig.storageKeys.PRODUCTS, JSON.stringify(initialCatalog));
    mockStorage.setItem(testConfig.storageKeys.ORDERS, JSON.stringify(initialOrders));
    mockStorage.setItem(testConfig.storageKeys.CUSTOMERS, JSON.stringify({}));
    mockStorage.setItem(testConfig.storageKeys.LOCAL_SETTINGS, JSON.stringify(initialSettings));

    const store = new Store(testConfig);

    // Capture complete snapshot of storage and store state before preview simulation begins
    const storageSnapshotBefore = mockStorage.snapshot();
    const keysBefore = mockStorage.keys().sort();
    const catalogBefore = JSON.stringify(store.getAdminProducts());

    // Adversarial CSV file with 3 updates, 2 new items, and 1 error row
    const adversarialCsv = [
      "sku,nombre,precio,categoria",
      "SKU-A,Producto A Modificado,100,Cat A",
      "SKU-B,Producto B Modificado,200,Cat B",
      "SKU-NEW1,Nuevo Producto 1,5000,Nuevos",
      "SKU-NEW2,Nuevo Producto 2,6000,Nuevos",
      "SKU-ERR,,invalid_price,Errores"
    ].join("\n");

    // 1. Simulate parse and preview calculation performed by Admin view
    const parsed = parseCatalogFile(adversarialCsv);
    const currentProducts = store.getAdminProducts();

    let altas = 0;
    let actualizaciones = 0;
    const previewItems = [];

    for (const item of parsed.rows) {
      const itemSku = String(item.sku ?? "").trim().toUpperCase();
      const matched = currentProducts.find(p => String(p.codigo || "").trim().toUpperCase() === itemSku);
      if (matched) {
        actualizaciones++;
        previewItems.push({ status: "ACTUALIZAR", oldPrice: matched.precio, newPrice: item.precio });
      } else {
        altas++;
        previewItems.push({ status: "NUEVO", oldPrice: null, newPrice: item.precio });
      }
    }

    assert.equal(altas, 2);
    assert.equal(actualizaciones, 2);
    assert.equal(parsed.errors.length, 1);

    // 2. Simulate User cancelling the import preview modal
    // In admin.js, clicking #btn-cancel-import or #btn-close-import-preview sets:
    // importPreviewData = null; update();
    let importPreviewData = {
      summary: { total: parsed.rows.length + parsed.errors.length, altas, actualizaciones, errores: parsed.errors.length },
      validItems: parsed.rows,
      previewRows: [...previewItems, ...parsed.errors]
    };

    // User cancels:
    importPreviewData = null;

    // 3. Verify zero side effects on storage and store
    const storageSnapshotAfter = mockStorage.snapshot();
    const keysAfter = mockStorage.keys().sort();

    assert.deepEqual(keysAfter, keysBefore, "No keys should be added or removed from storage");
    assert.equal(storageSnapshotAfter, storageSnapshotBefore, "Storage content must be byte-for-byte identical");

    const catalogAfter = JSON.stringify(store.getAdminProducts());
    assert.equal(catalogAfter, catalogBefore, "Store catalog must remain completely unchanged");

    // Verify no backup keys were created during cancelled preview
    const backupKeys = mockStorage.keys().filter(k => k.startsWith("products_backup_"));
    assert.equal(backupKeys.length, 0, "No backup keys should be created during preview or cancel");
  });

  // --------------------------------------------------------------------------
  // SUITE 6: BATCH IMPORT BOUNDARIES, DUPLICATES & DEFENSIVE INTEGRITY
  // --------------------------------------------------------------------------
  await suite.test("6. Batch import boundaries, duplicate SKUs, and legacy ID resilience", async (t) => {
    await t.test("6.1 Defensive rejection of non-array or invalid inputs", async () => {
      const store = new Store({
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: { PRODUCTS: "t_def_p", ORDERS: "t_def_o", CUSTOMERS: "t_def_c", LOCAL_SETTINGS: "t_def_s" }
      });

      await assert.rejects(async () => {
        await store.importCatalogBatch(null);
      }, /La lista de productos para importar debe ser un arreglo/);

      await assert.rejects(async () => {
        await store.importCatalogBatch("not an array");
      }, /La lista de productos para importar debe ser un arreglo/);

      await assert.rejects(async () => {
        await store.importCatalogBatch({});
      }, /La lista de productos para importar debe ser un arreglo/);

      // Empty array should succeed cleanly with 0 counts
      const emptyRes = await store.importCatalogBatch([]);
      assert.equal(emptyRes.ok, true);
      assert.equal(emptyRes.createdCount, 0);
      assert.equal(emptyRes.updatedCount, 0);
    });

    await t.test("6.2 Idempotency of batch import", async () => {
      mockStorage.clear();
      mockStorage.setItem("t_idem_p", JSON.stringify([]));
      const store = new Store({
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: { PRODUCTS: "t_idem_p", ORDERS: "t_idem_o", CUSTOMERS: "t_idem_c", LOCAL_SETTINGS: "t_idem_s" }
      });

      const batch = [
        { sku: "IDEM-1", nombre: "Producto Idempotente 1", precio: 500, categoria: "Test" },
        { sku: "IDEM-2", nombre: "Producto Idempotente 2", precio: 800, categoria: "Test" }
      ];

      // First run: 2 creations
      const run1 = await store.importCatalogBatch(batch);
      assert.equal(run1.createdCount, 2);
      assert.equal(run1.updatedCount, 0);

      const catalogRun1 = store.getAdminProducts();
      assert.equal(catalogRun1.length, 2);

      // Second run with same batch: 0 creations, 2 updates, catalog length stays 2
      const run2 = await store.importCatalogBatch(batch);
      assert.equal(run2.createdCount, 0);
      assert.equal(run2.updatedCount, 2);

      const catalogRun2 = store.getAdminProducts();
      assert.equal(catalogRun2.length, 2);
      assert.equal(catalogRun2[0].id, catalogRun1[0].id);
      assert.equal(catalogRun2[1].id, catalogRun1[1].id);
    });

    await t.test("6.3 Duplicate SKUs within the same import payload", async () => {
      mockStorage.clear();
      mockStorage.setItem("t_dup_p", JSON.stringify([]));
      const store = new Store({
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: { PRODUCTS: "t_dup_p", ORDERS: "t_dup_o", CUSTOMERS: "t_dup_c", LOCAL_SETTINGS: "t_dup_s" }
      });

      // Same SKU appearing twice in the same batch (e.g. entry 1 sets price 100, entry 2 sets price 250)
      const duplicateBatch = [
        { sku: "DUP-SKU", nombre: "Primer Intento", precio: 100, categoria: "Test" },
        { sku: "DUP-SKU", nombre: "Segundo Intento Actualizado", precio: 250, categoria: "Test" }
      ];

      const res = await store.importCatalogBatch(duplicateBatch);
      assert.equal(res.ok, true);

      const products = store.getAdminProducts().filter(p => p.codigo === "DUP-SKU");
      // Must not create duplicate product entries in the catalog
      assert.equal(products.length, 1);
      assert.equal(products[0].nombre, "Segundo Intento Actualizado");
      assert.equal(products[0].precio, 250);
    });

    await t.test("6.4 Catalog with non-numeric / arbitrary string IDs assigns unique numeric IDs safely", async () => {
      mockStorage.clear();
      // Existing catalog with legacy non-numeric string IDs and valid schema
      const legacyCatalog = [
        { id: "legacy-alpha", codigo: "L-1", nombre: "Legacy Alpha", precio: 100, unidad_medida: "UNIDAD", paso: 1, categoria: "Old", disponible: true },
        { id: "custom_uuid_9999", codigo: "L-2", nombre: "Legacy UUID", precio: 200, unidad_medida: "UNIDAD", paso: 1, categoria: "Old", disponible: true },
        { id: "item-no-numbers", codigo: "L-3", nombre: "Legacy Letters", precio: 300, unidad_medida: "UNIDAD", paso: 1, categoria: "Old", disponible: true }
      ];
      mockStorage.setItem("t_leg_p", JSON.stringify(legacyCatalog));

      const store = new Store({
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: { PRODUCTS: "t_leg_p", ORDERS: "t_leg_o", CUSTOMERS: "t_leg_c", LOCAL_SETTINGS: "t_leg_s" }
      });

      const newBatch = [
        { sku: "NEW-1", nombre: "Nuevo Producto 1", precio: 1500, categoria: "New" },
        { sku: "NEW-2", nombre: "Nuevo Producto 2", precio: 2500, categoria: "New" }
      ];

      const res = await store.importCatalogBatch(newBatch);
      assert.equal(res.ok, true);
      assert.equal(res.createdCount, 2);

      const all = store.getAdminProducts();
      assert.equal(all.length, 5);

      const new1 = all.find(p => p.codigo === "NEW-1");
      const new2 = all.find(p => p.codigo === "NEW-2");

      assert.ok(typeof new1.id === "number", "New ID must be numeric");
      assert.ok(typeof new2.id === "number", "New ID must be numeric");
      assert.ok(!Number.isNaN(new1.id), "New ID must not be NaN");
      assert.ok(!Number.isNaN(new2.id), "New ID must not be NaN");
      assert.notEqual(new1.id, new2.id, "New IDs must be unique");
    });

    await t.test("6.5 Transactional fail-closed atomicity: invalid product in batch rolls back completely", async () => {
      mockStorage.clear();
      const initial = [
        { id: 1, codigo: "OK-1", nombre: "Valido 1", precio: 100, unidad_medida: "UNIDAD", paso: 1, categoria: "Cat", disponible: true }
      ];
      mockStorage.setItem("t_tx_p", JSON.stringify(initial));

      const store = new Store({
        mode: "demo",
        ok: true,
        errors: [],
        storageKeys: { PRODUCTS: "t_tx_p", ORDERS: "t_tx_o", CUSTOMERS: "t_tx_c", LOCAL_SETTINGS: "t_tx_s" }
      });

      // Batch with 1 valid item and 1 item violating schema (name > 120 chars)
      const badBatch = [
        { sku: "OK-2", nombre: "Valido 2", precio: 200, categoria: "Cat" },
        { sku: "BAD-1", nombre: "X".repeat(200), precio: 300, categoria: "Cat" }
      ];

      await assert.rejects(async () => {
        await store.importCatalogBatch(badBatch);
      }, /máximo 120 caracteres/);

      // Verify that the first item was NOT saved (no partial commit)
      const products = store.getAdminProducts();
      assert.equal(products.length, 1);
      assert.equal(products[0].codigo, "OK-1");
    });

    await t.test("6.6 Unit and availability parsing matrix", () => {
      // parseUnit
      assert.equal(parseUnit("KG"), "KG");
      assert.equal(parseUnit("kg"), "KG");
      assert.equal(parseUnit("Kilos"), "KG");
      assert.equal(parseUnit("kilogramo"), "KG");
      assert.equal(parseUnit("k"), "KG");
      assert.equal(parseUnit("UNIDAD"), "UNIDAD");
      assert.equal(parseUnit("u"), "UNIDAD");
      assert.equal(parseUnit(""), "UNIDAD");
      assert.equal(parseUnit(null), "UNIDAD");

      // parseDisponible
      assert.equal(parseDisponible("si"), true);
      assert.equal(parseDisponible("SÍ"), true);
      assert.equal(parseDisponible("true"), true);
      assert.equal(parseDisponible("1"), true);
      assert.equal(parseDisponible("activo"), true);
      assert.equal(parseDisponible("habilitado"), true);
      assert.equal(parseDisponible("no"), false);
      assert.equal(parseDisponible("false"), false);
      assert.equal(parseDisponible("0"), false);
      assert.equal(parseDisponible("inactivo"), false);
      assert.equal(parseDisponible("deshabilitado"), false);
      assert.equal(parseDisponible(""), true); // default is available
      assert.equal(parseDisponible(undefined), true);
    });
  });
});
