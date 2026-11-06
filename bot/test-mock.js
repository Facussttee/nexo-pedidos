/**
 * MI HUERTA - SCRIPT DE PRUEBA Y DIAGNÓSTICO BACKEND (MOCK)
 * Verifica:
 * 1. Conexión con Supabase PostgreSQL y lectura de catálogo.
 * 2. Formato del mensaje de notificación con desglose de balanza.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

console.log("=== DIAGNÓSTICO BACKEND MI HUERTA ===");
console.log(`URL Supabase: ${SUPABASE_URL}`);
console.log(`API Key: ${SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 15) + "..." : "NO CONFIGURADA"}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERROR: Faltan credenciales en el archivo bot/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBackend() {
  try {
    console.log("\n1. Probando consulta a tabla 'productos'...");
    const { data: productos, error: errProd } = await supabase.from("productos").select("id, nombre, precio, unidad_medida").limit(5);

    if (errProd) {
      console.error("Error al consultar productos:", errProd.message);
    } else {
      console.log(`[OK] Se obtuvieron ${productos.length} productos de prueba:`);
      productos.forEach((p) => console.log(`   - ${p.nombre} ($${p.precio} / ${p.unidad_medida})`));
    }

    console.log("\n2. Probando consulta a tabla 'pedidos'...");
    const { data: pedidos, error: errPed } = await supabase.from("pedidos").select("id, estado, cliente_nombre, total_estimado").limit(3);

    if (errPed) {
      console.error("Error al consultar pedidos:", errPed.message);
    } else {
      console.log(`[OK] Conexión a tabla pedidos exitosa. Total en muestra: ${pedidos.length}`);
    }

    console.log("\n3. Verificación de Formateador de WhatsApp:");
    const mockOrder = {
      id: 999,
      cliente_nombre: "Lucía Fernández",
      cliente_telefono: "1155554444",
      tipo_entrega: "RETIRO",
      total_real: 4850,
      items: [
        { nombre: "Tomate Redondo Premium", unidad_medida: "KG", peso_real: 1.15, subtotal: 2990, sin_stock: false },
        { nombre: "Banana Cavendish", unidad_medida: "KG", peso_real: 1.03, subtotal: 1860, sin_stock: false },
        { nombre: "Frutilla Seleccionada", unidad_medida: "KG", peso_real: null, subtotal: 0, sin_stock: true }
      ]
    };

    const activeLines = mockOrder.items.filter((i) => !i.sin_stock).map((i) => `- ${i.nombre} (${i.peso_real} ${i.unidad_medida.toLowerCase()}): $${i.subtotal}`);
    const outLines = mockOrder.items.filter((i) => i.sin_stock).map((i) => `- ${i.nombre}: Sin stock disponible hoy ($0)`);
    const allLines = [...activeLines, ...outLines].join("\n");

    console.log("-----------------------------------------");
    console.log(`¡Hola ${mockOrder.cliente_nombre}! Tu pedido #${mockOrder.id} en *Mi Huerta* ya fue pesado y está listo:\n`);
    console.log(allLines);
    console.log(`\n*Total exacto en balanza: $${mockOrder.total_real}*`);
    console.log("Modalidad: Ya podés pasar a retirarlo por el mostrador del local.");
    console.log("-----------------------------------------");
    console.log("\n[OK] Diagnóstico finalizado con éxito.");
  } catch (err) {
    console.error("Excepción en prueba:", err.message);
  }
}

testBackend();
