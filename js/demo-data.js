// ==============================================================================
// Nexo Pedidos - Datos sintéticos de demostración
// Todas las personas, teléfonos, direcciones y alias son ficticios y están
// marcados como "Demo". Rango telefónico reservado 11000000xx (no asignado).
// ==============================================================================

const DEMO_CUSTOMERS = Object.freeze({
  "1100000001": Object.freeze({
    telefono: "1100000001",
    nombre: "Ana Demo (sintética)",
    direccion: "Calle Ficticia 101 (demo)"
  }),
  "1100000002": Object.freeze({
    telefono: "1100000002",
    nombre: "Bruno Demo (sintético)",
    direccion: "Retiro en Local"
  })
});

const DEMO_QUICK_CUSTOMER = DEMO_CUSTOMERS["1100000001"];

function buildDemoOrders(now = Date.now()) {
  return [
    {
      id: 101,
      demo: true,
      cliente: {
        nombre: "Ana Demo (sintética)",
        telefono: "1100000001",
        direccion: "Calle Ficticia 101 (demo)"
      },
      tipo_entrega: "DELIVERY",
      direccion_entrega: "Calle Ficticia 101 (demo)",
      estado: "PENDIENTE",
      fecha: new Date(now - 15 * 60 * 1000).toISOString(),
      total_estimado: 6400,
      total_real: null,
      items: [
        { producto_id: "prod-9", nombre: "Tomate Redondo Premium", unidad_medida: "KG", precio_unitario: 2600, cantidad_solicitada: 1.0, peso_real: null, subtotal: 2600, sin_stock: false },
        { producto_id: "prod-1", nombre: "Banana Cavendish", unidad_medida: "KG", precio_unitario: 1800, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1800, sin_stock: false },
        { producto_id: "prod-2", nombre: "Manzana Roja Elegida", unidad_medida: "KG", precio_unitario: 2200, cantidad_solicitada: 0.5, peso_real: null, subtotal: 1100, sin_stock: false },
        { producto_id: "prod-13", nombre: "Acelga de Huerta", unidad_medida: "UNIDAD", precio_unitario: 900, cantidad_solicitada: 1, peso_real: 1, subtotal: 900, sin_stock: false }
      ]
    },
    {
      id: 102,
      demo: true,
      cliente: {
        nombre: "Bruno Demo (sintético)",
        telefono: "1100000002",
        direccion: "Retiro en Local"
      },
      tipo_entrega: "RETIRO",
      direccion_entrega: "Retiro por Mostrador",
      estado: "EN_PREPARACION",
      fecha: new Date(now - 35 * 60 * 1000).toISOString(),
      total_estimado: 4700,
      total_real: null,
      items: [
        { producto_id: "prod-7", nombre: "Papa Negra Cepillada", unidad_medida: "KG", precio_unitario: 950, cantidad_solicitada: 2.0, peso_real: 2.15, subtotal: 2043, sin_stock: false },
        { producto_id: "prod-10", nombre: "Zanahoria Fresca", unidad_medida: "KG", precio_unitario: 1300, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1300, sin_stock: false },
        { producto_id: "prod-3", nombre: "Naranja de Jugo", unidad_medida: "KG", precio_unitario: 1400, cantidad_solicitada: 1.0, peso_real: null, subtotal: 1400, sin_stock: false }
      ]
    }
  ];
}

function cloneDemoCustomers() {
  const out = {};
  Object.keys(DEMO_CUSTOMERS).forEach((k) => {
    out[k] = { ...DEMO_CUSTOMERS[k] };
  });
  return out;
}

export { DEMO_CUSTOMERS, DEMO_QUICK_CUSTOMER, buildDemoOrders, cloneDemoCustomers };
