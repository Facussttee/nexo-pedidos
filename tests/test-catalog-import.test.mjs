/**
 * NEXO PEDIDOS - TEST SUITE: LOCAL CSV/TSV CATALOG IMPORTER (V2-05)
 *
 * Verificaciones:
 * 1. Parser RFC 4180 con delimitadores coma (,), tab (\t) y punto y coma (;).
 * 2. Campos entrecomillados con delimitadores, comillas dobles ("") y saltos de línea (CRLF/LF).
 * 3. Preservación estricta de SKU como string (ceros iniciales y alfanumérico intacto).
 * 4. Normalización y parseo de precios ($1.500,50, 1500.50, enteros, espacios).
 * 5. Reporte de errores por fila para nombres faltantes o precios inválidos.
 * 6. Lógica de previsualización sin mutar el store.
 * 7. Importación por lote: actualización por SKU/nombre preservando ID original y altas con ID numérico único.
 * 8. Respaldo local automático en localStorage antes de aplicar cambios.
 * 9. Inmutabilidad estricta de snapshots históricos en pedidos existentes.
 * 10. Modo producción: upsert a Supabase con header x-nexo-staff-pin y fail-closed si no hay conexión.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  detectDelimiter,
  parseCsvRecords,
  parsePrice,
  parseCatalogFile,
  normalizeHeader
} from "../js/csv-parser.js";

import { Store } from "../js/store.js";

// Helper para crear almacenamiento local simulado en memoria
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

test("V2-05: Catalog Importer Test Suite", async (t) => {
  // Configurar localStorage global para las pruebas
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  await t.test("1. Pure RFC 4180 parsing with comma, tab (TSV), and semicolon", () => {
    // 1a. Delimitador coma
    const csvComma = `sku,nombre,precio,categoria,unidad\n001,Manzana,1500.50,Frutas,KG\n002,Naranja,1200,Frutas,UNIDAD`;
    assert.equal(detectDelimiter(csvComma), ",");
    const resComma = parseCatalogFile(csvComma);
    assert.equal(resComma.errors.length, 0);
    assert.equal(resComma.rows.length, 2);
    assert.equal(resComma.rows[0].nombre, "Manzana");
    assert.equal(resComma.rows[0].precio, 1500.50);
    assert.equal(resComma.rows[0].sku, "001");

    // 1b. Delimitador punto y coma
    const csvSemi = `codigo;producto;precio_unitario;rubro;medida\r\n003;Banana;1800,00;Frutas;KG\r\n004;Pera;2200;Frutas;UNIDAD`;
    assert.equal(detectDelimiter(csvSemi), ";");
    const resSemi = parseCatalogFile(csvSemi);
    assert.equal(resSemi.errors.length, 0);
    assert.equal(resSemi.rows.length, 2);
    assert.equal(resSemi.rows[0].nombre, "Banana");
    assert.equal(resSemi.rows[0].precio, 1800);
    assert.equal(resSemi.rows[0].sku, "003");

    // 1c. Delimitador tabulador (TSV)
    const tsv = `sku\titem\tcosto\tcategoria\tunidad\n005\tLechuga\t800\tVerduras\tUNIDAD\n006\tTomate\t1600\tVerduras\tKG`;
    assert.equal(detectDelimiter(tsv), "\t");
    const resTsv = parseCatalogFile(tsv);
    assert.equal(resTsv.errors.length, 0);
    assert.equal(resTsv.rows.length, 2);
    assert.equal(resTsv.rows[0].nombre, "Lechuga");
    assert.equal(resTsv.rows[0].precio, 800);
    assert.equal(resTsv.rows[0].sku, "005");
  });

  await t.test("2. Quoted fields containing delimiters, quotes inside, and multi-line cells", () => {
    const csvQuoted = `sku,nombre,precio,categoria,descripcion
"SKU-100","Tomate, Perita, Seleccionado",1450.00,"Verduras","Fruto fresco,
ideal para ensaladas.
Calidad exportación."
"SKU-200","Manzana ""Red Delicious""",2300,"Frutas","Manzana roja ""muy crujiente"""`;

    const result = parseCatalogFile(csvQuoted);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows.length, 2);

    // Coma dentro de comillas
    assert.equal(result.rows[0].nombre, "Tomate, Perita, Seleccionado");
    // Salto de línea dentro de celda
    assert.ok(result.rows[0].detalle.includes("Fruto fresco,\nideal para ensaladas.\nCalidad exportación."));

    // Comilla escapada "" convertida a "
    assert.equal(result.rows[1].nombre, 'Manzana "Red Delicious"');
    assert.equal(result.rows[1].detalle, 'Manzana roja "muy crujiente"');
  });

  await t.test("3. SKU preservation as string with leading zeroes and alphanumeric characters", () => {
    const csvSku = `sku,nombre,precio\n000123,Producto Ceros,100\n078,Producto 78,200\nA-090-X,Producto Alfa,300`;
    const result = parseCatalogFile(csvSku);

    assert.equal(result.errors.length, 0);
    assert.equal(typeof result.rows[0].sku, "string");
    assert.equal(result.rows[0].sku, "000123");
    assert.equal(result.rows[1].sku, "078");
    assert.equal(result.rows[2].sku, "A-090-X");
  });

  await t.test("4. Price parsing with Argentine, US, currency symbols and spaces", () => {
    assert.equal(parsePrice("$1.500,50"), 1500.50);
    assert.equal(parsePrice("1500.50"), 1500.50);
    assert.equal(parsePrice("$ 2.300"), 2300);
    assert.equal(parsePrice("1,250.75"), 1250.75);
    assert.equal(parsePrice("1250,75"), 1250.75);
    assert.equal(parsePrice(" 0 "), 0);
    assert.equal(parsePrice("$0,00"), 0);

    // Precios inválidos
    assert.equal(parsePrice("-150"), null);
    assert.equal(parsePrice("gratis"), null);
    assert.equal(parsePrice(""), null);
  });

  await t.test("5. Error reporting for rows missing required fields or invalid values", () => {
    const csvWithErrors = `sku,nombre,precio\n001,,1500\n002,Naranja Invalida,no_es_precio\n003,Banana Valida,1800`;
    const result = parseCatalogFile(csvWithErrors);

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].nombre, "Banana Valida");

    assert.equal(result.errors.length, 2);
    // Fila 2: nombre vacío
    assert.equal(result.errors[0].row, 2);
    assert.ok(result.errors[0].error.toLowerCase().includes("nombre"));
    // Fila 3: precio no numérico
    assert.equal(result.errors[1].row, 3);
    assert.ok(result.errors[1].error.toLowerCase().includes("precio"));

    // Archivo sin columna de nombre
    const missingCol = `sku,valor\n001,1500`;
    const resMissing = parseCatalogFile(missingCol);
    assert.equal(resMissing.rows.length, 0);
    assert.ok(resMissing.errors[0].error.includes("columna obligatoria"));
  });

  await t.test("6. Preview logic calculates altas and actualizaciones without mutating store", () => {
    mockStorage.clear();
    const demoConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "nexo_test_products",
        ORDERS: "nexo_test_orders",
        CUSTOMERS: "nexo_test_customers",
        LOCAL_SETTINGS: "nexo_test_local_settings"
      }
    };

    const initialStoreProducts = [
      {
        id: "prod-1",
        nombre: "Banana Cavendish",
        categoria: "Frutas",
        unidad_medida: "KG",
        precio: 1800,
        disponible: true,
        paso: 0.5,
        codigo: "BAN-01"
      }
    ];
    mockStorage.setItem(demoConfig.storageKeys.PRODUCTS, JSON.stringify(initialStoreProducts));

    const testStore = new Store(demoConfig);
    const catalogBefore = testStore.getAdminProducts();
    assert.equal(catalogBefore.length, 1);
    assert.equal(catalogBefore[0].precio, 1800);

    // CSV de previsualización con 1 actualización y 1 alta
    const csvContent = `sku,nombre,precio,categoria\nBAN-01,Banana Cavendish,2100,Frutas\nMAN-01,Manzana Roja,2500,Frutas`;
    const parsed = parseCatalogFile(csvContent);

    // Simular el cálculo de previsualización que realiza el modal de Admin
    let altas = 0;
    let actualizaciones = 0;
    const previewList = [];

    for (const item of parsed.rows) {
      const matched = catalogBefore.find(p => p.codigo === item.sku);
      if (matched) {
        actualizaciones++;
        previewList.push({ status: "ACTUALIZAR", oldPrice: matched.precio, newPrice: item.precio });
      } else {
        altas++;
        previewList.push({ status: "NUEVO", newPrice: item.precio });
      }
    }

    assert.equal(altas, 1);
    assert.equal(actualizaciones, 1);
    assert.equal(previewList[0].status, "ACTUALIZAR");
    assert.equal(previewList[0].oldPrice, 1800);
    assert.equal(previewList[0].newPrice, 2100);

    // Verificar que el store NO fue mutado durante la previsualización
    const catalogAfterPreview = testStore.getAdminProducts();
    assert.equal(catalogAfterPreview.length, 1);
    assert.equal(catalogAfterPreview[0].precio, 1800);
  });

  await t.test("7. Batch import upserts new and existing products, assigns unique numeric IDs, and creates backup", async () => {
    mockStorage.clear();
    const demoConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "nexo_test_products_batch",
        ORDERS: "nexo_test_orders_batch",
        CUSTOMERS: "nexo_test_customers_batch",
        LOCAL_SETTINGS: "nexo_test_local_settings_batch"
      }
    };

    const initialCatalog = [
      {
        id: "prod-1",
        nombre: "Banana Cavendish",
        categoria: "Frutas",
        unidad_medida: "KG",
        precio: 1800,
        disponible: true,
        paso: 0.5,
        codigo: "BAN-01",
        detalle: "Origen Ecuador"
      }
    ];
    mockStorage.setItem(demoConfig.storageKeys.PRODUCTS, JSON.stringify(initialCatalog));

    const testStore = new Store(demoConfig);

    const itemsToImport = [
      {
        sku: "BAN-01",
        nombre: "Banana Cavendish Premium",
        categoria: "Frutas",
        precio: 2200,
        unidad_medida: "KG",
        disponible: true,
        detalle: "Ecuador Seleccionada"
      },
      {
        sku: "NAR-01",
        nombre: "Naranja Ombligo",
        categoria: "Citricos",
        precio: 1400,
        unidad_medida: "KG",
        disponible: true,
        detalle: "De San Pedro"
      }
    ];

    let notifiedProductsChanged = false;
    testStore.subscribe((event) => {
      if (event === "products_changed") notifiedProductsChanged = true;
    });

    const importResult = await testStore.importCatalogBatch(itemsToImport, { createBackup: true });

    assert.equal(importResult.ok, true);
    assert.equal(importResult.updatedCount, 1);
    assert.equal(importResult.createdCount, 1);
    assert.equal(notifiedProductsChanged, true);

    // Verificar respaldo creado en localStorage
    assert.ok(importResult.backupKey);
    const backupRaw = mockStorage.getItem(importResult.backupKey);
    assert.ok(backupRaw);
    assert.ok(backupRaw.includes("1800")); // contiene el precio original de la banana

    // Verificar catálogo resultante
    const finalProducts = testStore.getAdminProducts();
    assert.equal(finalProducts.length, 2);

    // Producto actualizado: conserva ID 'prod-1'
    const banana = finalProducts.find(p => p.codigo === "BAN-01");
    assert.equal(banana.id, "prod-1");
    assert.equal(banana.nombre, "Banana Cavendish Premium");
    assert.equal(banana.precio, 2200);

    // Producto nuevo: tiene ID numérico único asignado
    const naranja = finalProducts.find(p => p.codigo === "NAR-01");
    assert.ok(naranja);
    assert.equal(typeof naranja.id, "number");
    assert.ok(naranja.id > 0);
    assert.equal(naranja.precio, 1400);
  });

  await t.test("8. Historical order snapshot immutability: existing orders retain original item prices", async () => {
    mockStorage.clear();
    const demoConfig = {
      mode: "demo",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "nexo_test_products_immut",
        ORDERS: "nexo_test_orders_immut",
        CUSTOMERS: "nexo_test_customers_immut",
        LOCAL_SETTINGS: "nexo_test_local_settings_immut"
      }
    };

    const initialCatalog = [
      {
        id: "prod-10",
        nombre: "Frutilla Coronda",
        categoria: "Frutas",
        unidad_medida: "KG",
        precio: 4500,
        disponible: true,
        paso: 0.5,
        codigo: "FRUT-10"
      }
    ];
    mockStorage.setItem(demoConfig.storageKeys.PRODUCTS, JSON.stringify(initialCatalog));

    // Pedido histórico creado en el pasado cuando la frutilla valía $4500
    const historicalOrder = {
      id: 101,
      cliente: { nombre: "Juan Perez", telefono: "1122334455" },
      tipo_entrega: "RETIRO",
      estado: "ENTREGADO",
      total_estimado: 9000,
      total_real: 9000,
      items: [
        {
          producto_id: "prod-10",
          nombre: "Frutilla Coronda",
          unidad_medida: "KG",
          precio_unitario: 4500,
          cantidad_solicitada: 2,
          peso_real: 2,
          subtotal: 9000
        }
      ]
    };
    mockStorage.setItem(demoConfig.storageKeys.ORDERS, JSON.stringify([historicalOrder]));

    const testStore = new Store(demoConfig);

    // Se importa una actualización donde la frutilla aumenta drásticamente a $8000
    const newCatalogBatch = [
      {
        sku: "FRUT-10",
        nombre: "Frutilla Coronda",
        precio: 8000,
        categoria: "Frutas",
        unidad_medida: "KG"
      }
    ];
    await testStore.importCatalogBatch(newCatalogBatch);

    // El catálogo actual ahora refleja $8000
    const productInStore = testStore.getAdminProducts().find(p => p.id === "prod-10");
    assert.equal(productInStore.precio, 8000);

    // Pero el pedido histórico en el Store DEBE conservar inmutable el precio original de $4500
    const ordersAfterImport = testStore.getOrders();
    assert.equal(ordersAfterImport.length, 1);
    const storedOrder = ordersAfterImport[0];

    assert.equal(storedOrder.id, 101);
    assert.equal(storedOrder.total_estimado, 9000);
    assert.equal(storedOrder.total_real, 9000);
    assert.equal(storedOrder.items[0].precio_unitario, 4500);
    assert.equal(storedOrder.items[0].subtotal, 9000);
  });

  await t.test("9. Production mode fail-closed and Supabase upsert with x-nexo-staff-pin", async () => {
    mockStorage.clear();
    const prodConfig = {
      mode: "production",
      ok: true,
      errors: [],
      storageKeys: {
        PRODUCTS: "nexo_test_prod_products",
        ORDERS: "nexo_test_prod_orders",
        CUSTOMERS: "nexo_test_prod_customers",
        LOCAL_SETTINGS: "nexo_test_prod_local_settings"
      }
    };

    mockStorage.setItem(prodConfig.storageKeys.LOCAL_SETTINGS, JSON.stringify({ staffPin: "4321" }));
    mockStorage.setItem(prodConfig.storageKeys.PRODUCTS, JSON.stringify([]));

    // 9a. Fail-closed: sin Supabase conectado lanza error explícito
    const disconnectedStore = new Store(prodConfig, { supabaseClient: null });
    await assert.rejects(
      async () => {
        await disconnectedStore.importCatalogBatch([{ nombre: "Manzana", precio: 1000 }]);
      },
      /No se puede importar el catálogo en producción sin conexión a Supabase/
    );

    // 9b. Conexión exitosa: envía upsert a Supabase con x-nexo-staff-pin
    const upsertCalls = [];
    const mockSupabase = {
      channel() {
        return {
          on() {
            return this;
          },
          subscribe() {
            return this;
          }
        };
      },
      removeChannel() {},
      from(table) {
        if (table === "productos") {
          return {
            select() {
              return {
                order() {
                  return Promise.resolve({ data: [] });
                }
              };
            },
            upsert(payload) {
              let capturedHeaders = {};
              const queryPromise = Promise.resolve({ data: payload, error: null });
              queryPromise.setHeader = (header, val) => {
                capturedHeaders[header] = val;
              };
              upsertCalls.push({ payload, getHeaders: () => capturedHeaders });
              return queryPromise;
            }
          };
        }
        return {
          select() {
            return {
              order() {
                return {
                  limit() {
                    return Promise.resolve({ data: [] });
                  }
                };
              },
              eq() {
                return {
                  order() {
                    return {
                      limit() {
                        return Promise.resolve({ data: [] });
                      }
                    };
                  },
                  maybeSingle() {
                    return Promise.resolve({ data: null });
                  }
                };
              }
            };
          }
        };
      }
    };

    const connectedStore = new Store(prodConfig, { supabaseClient: mockSupabase });
    const importItems = [
      { sku: "SKU-99", nombre: "Uva Moscatel", precio: 3000, categoria: "Frutas", unidad_medida: "KG" }
    ];

    const prodResult = await connectedStore.importCatalogBatch(importItems);
    assert.equal(prodResult.ok, true);
    assert.equal(upsertCalls.length, 1);
    assert.equal(upsertCalls[0].getHeaders()["x-nexo-staff-pin"], "4321");
    assert.equal(upsertCalls[0].payload[0].codigo, "SKU-99");
    assert.equal(upsertCalls[0].payload[0].precio, 3000);
  });
});
