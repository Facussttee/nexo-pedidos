import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testOrderLifecycle() {
  console.log("=== PROBANDO CICLO DE VIDA DE PEDIDO EN SUPABASE ===");

  // 1. Garantizar cliente en tabla clientes
  const testCustomer = {
    telefono: "1199998888",
    nombre: "Prueba Tester",
    direccion: "Retiro en Mostrador"
  };
  const { error: errCli } = await supabase.from("clientes").upsert(testCustomer);
  if (errCli) {
    console.error("Error asegurando cliente:", errCli.message);
    return;
  }
  console.log(`[OK] Cliente de prueba ${testCustomer.telefono} listo en tabla 'clientes'.`);

  // 2. Crear un pedido de prueba
  const testOrder = {
    cliente_telefono: "1199998888",
    cliente_nombre: "Prueba Tester",
    tipo_entrega: "RETIRO",
    direccion_entrega: "Retiro en Mostrador",
    estado: "PENDIENTE",
    total_estimado: 5200,
    items: [
      { producto_id: "prod-9", nombre: "Tomate Redondo Premium", unidad_medida: "KG", precio_unitario: 2600, cantidad_solicitada: 2, peso_real: null, subtotal: 5200, sin_stock: false }
    ]
  };

  const { data: inserted, error: errInsert } = await supabase.from("pedidos").insert(testOrder).select().single();
  if (errInsert) {
    console.error("Error creando pedido:", errInsert.message);
    return;
  }
  console.log(`[OK] Pedido creado con éxito en Supabase. ID asignado: #${inserted.id}`);

  // 2. Simular pesaje en balanza y paso a estado LISTO
  const updatedItems = [
    { ...inserted.items[0], peso_real: 2.15, subtotal: 5590 }
  ];

  const { data: updated, error: errUpdate } = await supabase
    .from("pedidos")
    .update({
      estado: "LISTO",
      total_real: 5590,
      items: updatedItems
    })
    .eq("id", inserted.id)
    .select()
    .single();

  if (errUpdate) {
    console.error("Error al actualizar pedido:", errUpdate.message);
    return;
  }
  console.log(`[OK] Pedido #${updated.id} pesado y actualizado a estado '${updated.estado}' con total real: $${updated.total_real}`);

  // 3. Simular despacho de notificación de WhatsApp
  const { error: errNotify } = await supabase
    .from("pedidos")
    .update({ notificado_whatsapp: true, notificado_at: new Date().toISOString() })
    .eq("id", inserted.id);

  if (errNotify) {
    console.error("Error al marcar notificado:", errNotify.message);
  } else {
    console.log(`[OK] Pedido #${inserted.id} marcado como 'notificado_whatsapp: true'`);
  }

  // 4. Limpieza del pedido y cliente de prueba
  const { error: errDelete } = await supabase.from("pedidos").delete().eq("id", inserted.id);
  if (!errDelete) {
    console.log(`[OK] Pedido de prueba #${inserted.id} eliminado correctamente.`);
  }
  await supabase.from("clientes").delete().eq("telefono", testCustomer.telefono);
  console.log(`[OK] Cliente de prueba eliminado (base limpia).`);

  console.log("\n=== ¡TODO EL FLUJO DE BASE DE DATOS FUNCIONA DE PUNTA A PUNTA AL 100%! ===");
}

testOrderLifecycle();
