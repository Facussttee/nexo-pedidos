/**
 * ============================================================================
 * MI HUERTA - SERVICIO CONECTOR DE WHATSAPP (BAILEYS + SUPABASE REALTIME)
 * ============================================================================
 * Responsabilidades:
 * 1. Conectar al WhatsApp de la verdulería mediante código QR local.
 * 2. Responder al primer mensaje del cliente con su link personalizado (?tel=...)
 *    y aplicar una ventana de silencio (Cooldown) de 3 horas para no molestar
 *    si el cliente sigue conversando con el dueño.
 * 3. Escuchar en tiempo real la tabla "pedidos" de Supabase: cuando el operario
 *    en la balanza pasa un pedido a estado "LISTO", enviar automáticamente
 *    el detalle pesado ítem por ítem, el total exacto y el Alias de pago.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import qrcode from "qrcode-terminal";
import pino from "pino";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { createStaticServer } from "./static-server.js";
import { buildPublic, DEFAULT_PUBLIC_ROOT } from "../scripts/build-public.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

// Detectar IP local (priorizando Wi-Fi real) para permitir acceso desde celulares en la misma red
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let candidate = null;
  for (const name of Object.keys(interfaces)) {
    if (/virtualbox|vbox|vmware|wsl|vEthernet/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (/wi-fi|wireless|wlan|ethernet/i.test(name) && !iface.address.startsWith("192.168.56.")) {
          return iface.address;
        }
        if (!candidate && !iface.address.startsWith("192.168.56.")) {
          candidate = iface.address;
        }
      }
    }
  }
  return candidate || "localhost";
}

const localIp = getLocalIp();
const PORT = Number(process.env.PORT || 3000);

// Configuración desde variables de entorno (.env)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const RAW_CATALOG_URL = (process.env.CATALOG_WEB_URL || "").replace(/\/$/, "");

// Si la URL es localhost o está vacía, usar la IP local para que cualquier celular en la red Wi-Fi pueda abrir el link
const CATALOG_WEB_URL =
  !RAW_CATALOG_URL || RAW_CATALOG_URL.includes("localhost")
    ? `http://${localIp}:${PORT}`
    : RAW_CATALOG_URL;

const COOLDOWN_MINUTES = Number(process.env.COOLDOWN_MINUTES || 180);
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Nexo Pedidos";
const PAYMENT_ALIAS = process.env.PAYMENT_ALIAS || "alias.demo.nexo";

// Servidor Web Local Integrado para servir únicamente la raíz pública generada (dist/public)
function startLocalWebServer() {
  const publicRoot = DEFAULT_PUBLIC_ROOT;
  buildPublic({ outDir: publicRoot });

  const server = createStaticServer({ publicRoot });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n========================================================`);
    console.log(`[SERVIDOR WEB LOCAL ACTIVO]`);
    console.log(`* Raíz pública confinada: ${publicRoot}`);
    console.log(`* En tu PC: http://localhost:${PORT}`);
    if (localIp !== "localhost") {
      console.log(`* En celulares en la misma red Wi-Fi: http://${localIp}:${PORT}`);
    }
    console.log(`* Link que enviará el Bot: ${CATALOG_WEB_URL}`);
    console.log(`========================================================\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[AVISO] El puerto ${PORT} ya está ocupado. Usando servidor web existente.`);
    } else {
      console.error("[ERROR] Falló servidor web local:", err.message);
    }
  });
}

// Iniciar servidor web local
startLocalWebServer();

// Persistencia de la ventana de silencio (Cooldown) para sobrevivir reinicios
const COOLDOWN_FILE = path.join(__dirname, ".cooldowns.json");

function loadCooldowns() {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, "utf-8"));
      const map = new Map();
      const now = Date.now();
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
      for (const [phone, ts] of Object.entries(data)) {
        if (now - Number(ts) < cooldownMs) {
          map.set(phone, Number(ts));
        }
      }
      return map;
    }
  } catch (err) {
    console.warn("[COOLDOWN] No se pudo leer archivo de cooldowns previo:", err.message);
  }
  return new Map();
}

function saveCooldowns(map) {
  try {
    const obj = Object.fromEntries(map.entries());
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.warn("[COOLDOWN] No se pudo guardar cooldowns en disco:", err.message);
  }
}

const customerCooldowns = loadCooldowns();

// Inicializar cliente Supabase si las credenciales están presentes
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabase) {
  console.warn(
    "[AVISO] No se detectaron SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env.\n" +
      "El bot responderá con el link del catálogo, pero no podrá escuchar pedidos 'LISTO' en tiempo real hasta configurar Supabase."
  );
}

// Formatear número de WhatsApp (ej: "5491123456789@s.whatsapp.net" -> "1123456789")
function extractLocalPhone(jid) {
  const digits = jid.split("@")[0].replace(/\D/g, "");
  if (digits.startsWith("549") && digits.length >= 12) {
    return digits.slice(3);
  }
  if (digits.startsWith("54") && digits.length >= 11) {
    return digits.slice(2);
  }
  return digits;
}

// Resolver el JID exacto y verificado en los servidores de WhatsApp (vital para Argentina 549 vs 54)
async function resolveWhatsAppJid(sock, rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, "");
  const candidates = [];

  if (digits.startsWith("549")) {
    candidates.push(`${digits}@s.whatsapp.net`);
    candidates.push(`54${digits.slice(3)}@s.whatsapp.net`);
  } else if (digits.startsWith("54")) {
    candidates.push(`549${digits.slice(2)}@s.whatsapp.net`);
    candidates.push(`${digits}@s.whatsapp.net`);
  } else {
    candidates.push(`549${digits}@s.whatsapp.net`);
    candidates.push(`54${digits}@s.whatsapp.net`);
    candidates.push(`${digits}@s.whatsapp.net`);
  }

  if (sock && typeof sock.onWhatsApp === "function") {
    for (const cand of candidates) {
      try {
        const [result] = await sock.onWhatsApp(cand);
        if (result && result.exists) {
          return result.jid;
        }
      } catch {}
    }
  }

  return candidates[0];
}

// Formatear teléfono local a JID de WhatsApp Argentina (fallback sincrónico)
function toWhatsAppJid(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("549")) {
    return `${digits}@s.whatsapp.net`;
  }
  return `549${digits}@s.whatsapp.net`;
}

// Construir el mensaje final con el pesaje real de balanza
function buildOrderReadyMessage(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const activeItems = items.filter((i) => !i.sin_stock);
  const outOfStockItems = items.filter((i) => i.sin_stock);

  const lines = activeItems.map((i) => {
    const unit = i.unidad_medida === "KG" ? "kg" : "u";
    const peso = i.peso_real !== null && i.peso_real !== undefined ? i.peso_real : i.cantidad_solicitada;
    const sub = Number(i.subtotal || 0).toLocaleString("es-AR");
    return `- ${i.nombre} (${peso} ${unit}): $${sub}`;
  });

  if (outOfStockItems.length > 0) {
    outOfStockItems.forEach((i) => {
      lines.push(`- ${i.nombre}: Sin stock disponible hoy ($0)`);
    });
  }

  const totalExacto = Number(order.total_real || order.total_estimado || 0).toLocaleString("es-AR");
  const entregaInfo =
    order.tipo_entrega === "DELIVERY"
      ? `Modalidad: Envío a domicilio (${order.direccion_entrega})`
      : "Modalidad: Ya podés pasar a retirarlo por el mostrador del local.";

  return (
    `¡Hola ${order.cliente_nombre || ""}! Tu pedido #${order.id} en *${BUSINESS_NAME}* ya fue pesado y está listo:\n\n` +
    `${lines.join("\n")}\n\n` +
    `*Total exacto en balanza: $${totalExacto}*\n` +
    `${entregaInfo}\n\n` +
    `Alias para transferir: *${PAYMENT_ALIAS}*\n` +
    `_(O podés abonar en efectivo al recibir)_`
  );
}

async function startWhatsAppBot() {
  const authDir = path.join(__dirname, "auth_info_baileys");
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n========================================================");
      console.log(" ESCANEÁ ESTE CÓDIGO QR DESDE EL WHATSAPP DE LA VERDULERÍA");
      console.log(" (Menú -> Dispositivos vinculados -> Vincular dispositivo)");
      console.log("========================================================\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
      console.log(`[CONEXIÓN CERRADA] Código: ${statusCode}. Desvinculado: ${isLoggedOut}`);

      if (isLoggedOut) {
        console.log("\n[SESIÓN REVOCADA / 401] La sesión fue cerrada desde el teléfono o expiró.");
        console.log("[AUTO-RECUPERACIÓN] Purgando credenciales antiguas y generando un nuevo QR en 2 segundos...");
        try {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
        } catch (err) {
          console.warn("[AVISO] No se pudo limpiar la carpeta de autenticación:", err.message);
        }
        setTimeout(startWhatsAppBot, 2000);
      } else {
        console.log("[RECONEXIÓN] Reconectando sesión existente en 3 segundos...");
        setTimeout(startWhatsAppBot, 3000);
      }
    } else if (connection === "open") {
      console.log(`\n[OK] Bot de WhatsApp ${BUSINESS_NAME} conectado y activo.`);
      setupSupabaseRealtimeListener(sock);
      reconcilePendingReadyOrders(sock);
    }
  });

  // 1. Escuchar mensajes entrantes de clientes
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || "";
      // Ignorar grupos y estados de difusión
      if (remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue;

      const localPhone = extractLocalPhone(remoteJid);
      const now = Date.now();
      const lastSent = customerCooldowns.get(localPhone) || 0;
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

      // Si ya le enviamos el link hace menos de COOLDOWN_MINUTES, guardamos silencio
      // para permitir que hable con el dueño sin que el bot interrumpa
      if (now - lastSent < cooldownMs) {
        console.log(`[COOLDOWN ACTIVO] Mensaje de ${localPhone} ignorado por el bot (ventana de silencio activa).`);
        continue;
      }

      customerCooldowns.set(localPhone, now);
      saveCooldowns(customerCooldowns);
      const personalCatalogLink = `${CATALOG_WEB_URL}/?tel=${localPhone}`;

      const welcomeText =
        `¡Hola! Bienvenido a *${BUSINESS_NAME}*.\n\n` +
        `Armá tu pedido del día con los precios actualizados entrando directamente a tu catálogo acá:\n` +
        `${personalCatalogLink}\n\n` +
        `_Elegí lo que necesites y apenas lo pesemos en la balanza del local te avisamos por acá con el importe exacto._`;

      try {
        await sock.sendMessage(remoteJid, { text: welcomeText });
        console.log(`[LINK ENVIADO] Catálogo enviado a ${localPhone}: ${personalCatalogLink}`);
      } catch (err) {
        console.error(`[ERROR] No se pudo enviar mensaje a ${localPhone}:`, err.message);
      }
    }
  });
}

// Función común y segura para despachar el mensaje de pedido pesado y listo
async function notifyOrderReady(sock, order) {
  const phone = order.cliente_telefono;
  if (!phone) return false;

  const jid = await resolveWhatsAppJid(sock, phone);
  const summaryText = buildOrderReadyMessage(order);

  try {
    await sock.sendMessage(jid, { text: summaryText });
    console.log(`\n========================================================`);
    console.log(`[WHATSAPP ENVIADO] [OK] Resumen del Pedido #${order.id} enviado a ${order.cliente_nombre || phone}`);
    console.log(`Destinatario: ${jid}`);
    console.log(`Total en balanza: $${Number(order.total_real || order.total_estimado || 0).toLocaleString("es-AR")}`);
    console.log(`========================================================\n`);

    if (supabase) {
      await supabase
        .from("pedidos")
        .update({
          notificado_whatsapp: true,
          notificado_at: new Date().toISOString()
        })
        .eq("id", order.id);
    }
    return true;
  } catch (err) {
    console.error(`[ERROR] Falló el envío del resumen del pedido #${order.id}:`, err.message);
    return false;
  }
}

// Reconciliación: enviar avisos a pedidos LISTO que se prepararon mientras el bot estaba apagado
async function reconcilePendingReadyOrders(sock) {
  if (!supabase) return;
  try {
    const { data: pending, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("estado", "LISTO")
      .eq("notificado_whatsapp", false);

    if (error) {
      console.warn("[RECONCILIACIÓN] Error consultando pedidos pendientes:", error.message);
      return;
    }

    if (pending && pending.length > 0) {
      console.log(`[RECONCILIACIÓN] Recuperando ${pending.length} pedido(s) listos sin notificar...`);
      for (const order of pending) {
        await notifyOrderReady(sock, order);
      }
    }
  } catch (err) {
    console.warn("[RECONCILIACIÓN] Excepción durante el proceso de recuperación:", err.message);
  }
}

// 2. Suscribirse en tiempo real a los pedidos que pasan a estado "LISTO" en Supabase
let realtimeChannel = null;

function setupSupabaseRealtimeListener(sock) {
  if (!supabase) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  console.log("[REALTIME] Escuchando pedidos listos en Supabase...");

  realtimeChannel = supabase
    .channel("bot-pedidos-listos")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pedidos"
      },
      async (payload) => {
        const nuevo = payload.new;

        // Disparar mensaje cuando el estado es LISTO y aún no fue notificado por WhatsApp
        if (nuevo && nuevo.estado === "LISTO" && !nuevo.notificado_whatsapp) {
          await notifyOrderReady(sock, nuevo);
        }
      }
    )
    .subscribe();
}

startWhatsAppBot();
