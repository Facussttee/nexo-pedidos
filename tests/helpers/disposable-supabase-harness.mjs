/**
 * NEXO PEDIDOS — DISPOSABLE IN-MEMORY SUPABASE HARNESS (AUD-02..12)
 *
 * Emula Auth, PostgREST (productos, clientes, pedidos, staff_members, rate_limit_config)
 * y las RPCs de migraciones AUD-04..12 en memoria para pruebas aisladas sin Docker/Supabase CLI.
 * NOTA HONESTA: isRealPostgresRls es siempre false; NO prueba ejecución real en PostgreSQL.
 */

import { createHash, randomBytes } from "node:crypto";
import { validateTestTargetUrl } from "../test-aud-02-disposable-backend.test.mjs";

function sha256HexSync(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function sanitizeOrderPublic(order) {
  const copy = cloneJson(order);
  delete copy.tracking_token_hash;
  delete copy.tracking_token_revoked_at;
  delete copy.payload_hash;
  return copy;
}

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

export function createDisposableSupabaseHarness({
  targetUrl = "http://127.0.0.1:54321",
  anonKey = "sb_publishable_local_disposable_anon_key",
  products = [],
  staffUsers = [],
  rateLimitConfig = {
    id: 1,
    customer_window_seconds: 300,
    customer_max_orders: 3,
    source_window_seconds: 60,
    source_max_orders: 10,
    global_window_seconds: 60,
    global_max_orders: 30
  },
  initialNowMs = Date.now()
} = {}) {
  validateTestTargetUrl(targetUrl);
  if (/service_role|sb_secret_/i.test(String(anonKey))) {
    throw new Error("Harness rechaza credenciales service_role/secret.");
  }

  let currentNowMs = Number(initialNowMs);
  let nextOrderId = 501;

  const db = {
    products: products.map((p) => ({
      disponible: true,
      archivado: false,
      paso: p.unidad_medida === "UNIDAD" ? 1 : 0.5,
      codigo: "",
      detalle: "",
      imagen_id: null,
      ...cloneJson(p)
    })),
    clientes: new Map(),
    pedidos: [],
    staffMembers: staffUsers.map((u) => ({ ...cloneJson(u) })),
    rateLimitConfig: rateLimitConfig ? { ...cloneJson(rateLimitConfig) } : null,
    rateLimitEvents: []
  };

  const logs = {
    productUpserts: [],
    orderSelects: [],
    customerQueries: [],
    rpcCalls: [],
    realtimeSubscriptions: [],
    capturedHeaders: {}
  };

  const faults = {
    rpc: new Map(),
    table: new Map()
  };

  function setNextRpcFault(rpcName, mode) {
    faults.rpc.set(rpcName, mode);
  }

  function setNextTableFault(table, mode) {
    faults.table.set(table, mode);
  }

  function advanceTimeMs(ms) {
    currentNowMs += Number(ms);
  }

  function setNowMs(ms) {
    currentNowMs = Number(ms);
  }

  function nowIso() {
    return new Date(currentNowMs).toISOString();
  }

  function checkAndRecordRateLimit(customerPhone, sourceKey) {
    const cfg = db.rateLimitConfig;
    if (
      !cfg ||
      !Number.isFinite(cfg.customer_window_seconds) || cfg.customer_window_seconds <= 0 ||
      !Number.isFinite(cfg.customer_max_orders) || cfg.customer_max_orders <= 0 ||
      !Number.isFinite(cfg.source_window_seconds) || cfg.source_window_seconds <= 0 ||
      !Number.isFinite(cfg.source_max_orders) || cfg.source_max_orders <= 0 ||
      !Number.isFinite(cfg.global_window_seconds) || cfg.global_window_seconds <= 0 ||
      !Number.isFinite(cfg.global_max_orders) || cfg.global_max_orders <= 0
    ) {
      return {
        error: { message: "RATE_LIMIT_UNCONFIGURED: Límites de pedidos no configurados o inválidos.", status: 400 }
      };
    }

    const customerKey = String(customerPhone || "").replace(/\D/g, "") || "unknown";
    const srcKey = String(sourceKey || "source:unattributed");

    const customerHits = db.rateLimitEvents.filter(
      (e) => e.customer_key === customerKey && e.created_at_ms >= currentNowMs - cfg.customer_window_seconds * 1000
    );
    if (customerHits.length >= cfg.customer_max_orders) {
      const oldest = Math.min(...customerHits.map((h) => h.created_at_ms));
      const retryAfter = Math.max(1, Math.ceil((oldest + cfg.customer_window_seconds * 1000 - currentNowMs) / 1000));
      return {
        error: { message: `RATE_LIMIT_EXCEEDED: Demasiados pedidos recientes. RETRY_AFTER:${retryAfter}`, status: 429 }
      };
    }

    const sourceHits = db.rateLimitEvents.filter(
      (e) => e.source_key === srcKey && e.created_at_ms >= currentNowMs - cfg.source_window_seconds * 1000
    );
    if (sourceHits.length >= cfg.source_max_orders) {
      const oldest = Math.min(...sourceHits.map((h) => h.created_at_ms));
      const retryAfter = Math.max(1, Math.ceil((oldest + cfg.source_window_seconds * 1000 - currentNowMs) / 1000));
      return {
        error: { message: `RATE_LIMIT_EXCEEDED: Límite temporal de origen alcanzado. RETRY_AFTER:${retryAfter}`, status: 429 }
      };
    }

    const globalHits = db.rateLimitEvents.filter(
      (e) => e.created_at_ms >= currentNowMs - cfg.global_window_seconds * 1000
    );
    if (globalHits.length >= cfg.global_max_orders) {
      const oldest = Math.min(...globalHits.map((h) => h.created_at_ms));
      const retryAfter = Math.max(1, Math.ceil((oldest + cfg.global_window_seconds * 1000 - currentNowMs) / 1000));
      return {
        error: { message: `RATE_LIMIT_EXCEEDED: Alta demanda en el comercio. RETRY_AFTER:${retryAfter}`, status: 429 }
      };
    }

    db.rateLimitEvents.push({
      customer_key: customerKey,
      source_key: srcKey,
      created_at_ms: currentNowMs
    });
    return { error: null };
  }

  function createClient({ sourceKey = "source:local-1" } = {}) {
    let currentSession = null;

    function getActor() {
      if (!currentSession || !currentSession.user) {
        return { role: "anon", uid: null, staff: null };
      }
      const expMs = Number(currentSession.expires_at) > 1e12
        ? Number(currentSession.expires_at)
        : Number(currentSession.expires_at) * 1000;
      if (!Number.isFinite(expMs) || expMs <= currentNowMs) {
        return { role: "anon", uid: null, staff: null, expired: true };
      }
      const member = db.staffMembers.find((m) => m.user_id === currentSession.user.id) || null;
      const isActive = Boolean(member && member.active === true && ["owner", "operator"].includes(member.role));
      return {
        role: isActive ? member.role : "authenticated_non_staff",
        uid: currentSession.user.id,
        staff: isActive ? member : null,
        isActiveStaff: isActive,
        isActiveOwner: Boolean(isActive && member.role === "owner")
      };
    }

    function executeSelect(table, state) {
      const tableFault = faults.table.get(table);
      if (tableFault) {
        faults.table.delete(table);
        return { data: null, error: { message: `Simulated table error on ${table}`, status: 500 } };
      }

      const actor = getActor();

      if (table === "staff_members") {
        if (!actor.uid) {
          return { data: null, error: { code: "42501", message: "permission denied for table staff_members", status: 403 } };
        }
        let rows = db.staffMembers.filter((m) => m.user_id === actor.uid || actor.isActiveOwner);
        for (const f of state.filters) {
          rows = rows.filter((r) => r[f.col] === f.val);
        }
        const projected = rows.map((m) => ({
          user_id: m.user_id,
          email: m.email,
          role: m.role,
          active: Boolean(m.active)
        }));
        if (state.singleMode === "maybeSingle") return { data: projected[0] || null, error: null };
        if (state.singleMode === "single") {
          return projected.length === 1
            ? { data: projected[0], error: null }
            : { data: null, error: { message: "Row count mismatch" } };
        }
        return { data: projected, error: null };
      }

      if (table === "productos") {
        let rows = db.products.filter((p) => !p.archivado || actor.isActiveStaff);
        for (const f of state.filters) {
          rows = rows.filter((r) => r[f.col] === f.val);
        }
        if (state.orderBy) {
          const { col, ascending } = state.orderBy;
          rows = [...rows].sort((a, b) => {
            if (a[col] === b[col]) return 0;
            return (a[col] > b[col] ? 1 : -1) * (ascending ? 1 : -1);
          });
        }
        if (Number.isInteger(state.limitVal)) {
          rows = rows.slice(0, state.limitVal);
        }
        return { data: cloneJson(rows), error: null };
      }

      if (table === "clientes") {
        logs.customerQueries.push({ actorRole: actor.role, filters: cloneJson(state.filters) });
        if (!actor.isActiveStaff) {
          return { data: null, error: { code: "42501", message: "permission denied for table clientes", status: 403 } };
        }
        let rows = [...db.clientes.values()];
        for (const f of state.filters) {
          rows = rows.filter((r) => r[f.col] === f.val);
        }
        return { data: cloneJson(rows), error: null };
      }

      if (table === "pedidos") {
        logs.orderSelects.push({
          actorRole: actor.role,
          isGlobal: state.filters.length === 0,
          filters: cloneJson(state.filters),
          limit: state.limitVal ?? null
        });
        if (!actor.isActiveStaff) {
          return { data: null, error: { code: "42501", message: "permission denied for table pedidos", status: 403 } };
        }
        let rows = db.pedidos.map(sanitizeOrderPublic);
        for (const f of state.filters) {
          rows = rows.filter((r) => r[f.col] === f.val);
        }
        if (state.orderBy) {
          const { col, ascending } = state.orderBy;
          rows = [...rows].sort((a, b) => {
            if (a[col] === b[col]) return 0;
            return (a[col] > b[col] ? 1 : -1) * (ascending ? 1 : -1);
          });
        }
        if (Number.isInteger(state.limitVal)) {
          rows = rows.slice(0, state.limitVal);
        }
        return { data: rows, error: null };
      }

      return { data: null, error: { code: "42P01", message: `Unknown table ${table}` } };
    }

    function executeWrite(table, op, payload, filters = []) {
      const actor = getActor();

      if (table === "productos") {
        if (!actor.isActiveOwner) {
          return {
            data: null,
            error: {
              code: "42501",
              message: "new row violates row-level security policy for table productos",
              status: 403
            }
          };
        }
        if (op === "upsert" || op === "insert") {
          const rows = Array.isArray(payload) ? payload : [payload];
          for (const item of rows) {
            const normalized = {
              disponible: true,
              archivado: false,
              paso: item.unidad_medida === "UNIDAD" ? 1 : 0.5,
              codigo: "",
              detalle: "",
              imagen_id: null,
              ...cloneJson(item)
            };
            const idx = db.products.findIndex((p) => p.id === normalized.id);
            if (idx >= 0) db.products[idx] = normalized;
            else db.products.push(normalized);
            logs.productUpserts.push(cloneJson(normalized));
          }
          return { data: cloneJson(payload), error: null };
        }
      }

      if (table === "staff_members") {
        if (!actor.isActiveOwner) {
          return { data: null, error: { code: "42501", message: "permission denied for table staff_members", status: 403 } };
        }
        if (op === "upsert" || op === "insert") {
          const idx = db.staffMembers.findIndex((m) => m.user_id === payload.user_id);
          if (idx >= 0) db.staffMembers[idx] = { ...db.staffMembers[idx], ...cloneJson(payload) };
          else db.staffMembers.push(cloneJson(payload));
          return { data: cloneJson(payload), error: null };
        }
      }

      if (table === "clientes") {
        if (!actor.isActiveStaff || op !== "update") {
          return { data: null, error: { code: "42501", message: "permission denied for table clientes", status: 403 } };
        }
        let rows = [...db.clientes.values()];
        for (const f of filters) {
          rows = rows.filter((r) => r[f.col] === f.val);
        }
        for (const r of rows) {
          Object.assign(r, cloneJson(payload));
        }
        return { data: cloneJson(rows), error: null };
      }

      if (table === "pedidos") {
        return {
          data: null,
          error: {
            code: "42501",
            message: "Direct mutation to pedidos forbidden; use authoritative RPC.",
            status: 403
          }
        };
      }

      return { data: null, error: { code: "42501", message: `Write denied on ${table}`, status: 403 } };
    }

    return {
      // Allow test-specific session manipulation without weakening store checks
      __setSessionExpiresAt(epochSeconds) {
        if (currentSession) currentSession.expires_at = epochSeconds;
      },

      auth: {
        async signInWithPassword({ email, password }) {
          const cleanEmail = String(email || "").trim().toLowerCase();
          const user = db.staffMembers.find(
            (u) => String(u.email || "").trim().toLowerCase() === cleanEmail && u.password === password
          );
          if (!user) {
            return { data: { user: null, session: null }, error: { message: "Invalid login credentials", status: 400 } };
          }
          currentSession = {
            access_token: `tok_${randomBytes(12).toString("hex")}`,
            expires_at: Math.floor((Math.max(Date.now(), currentNowMs) + 3600_000) / 1000),
            user: { id: user.user_id, email: user.email }
          };
          return { data: { user: cloneJson(currentSession.user), session: cloneJson(currentSession) }, error: null };
        },
        async signOut() {
          currentSession = null;
          return { error: null };
        },
        async getSession() {
          return { data: { session: cloneJson(currentSession) }, error: null };
        }
      },

      from(table) {
        const state = { filters: [], orderBy: null, limitVal: null, singleMode: null };

        function makeSelectChain() {
          const chain = {
            eq(col, val) {
              state.filters.push({ col, val });
              return chain;
            },
            order(col, opts = {}) {
              state.orderBy = { col, ascending: opts.ascending !== false };
              return chain;
            },
            limit(n) {
              state.limitVal = n;
              return chain;
            },
            maybeSingle() {
              state.singleMode = "maybeSingle";
              return Promise.resolve(executeSelect(table, state));
            },
            single() {
              state.singleMode = "single";
              return Promise.resolve(executeSelect(table, state));
            },
            then(resolve, reject) {
              return Promise.resolve(executeSelect(table, state)).then(resolve, reject);
            }
          };
          return chain;
        }

        function makeWriteChain(op, payload) {
          const writeFilters = [];
          const chain = {
            eq(col, val) {
              writeFilters.push({ col, val });
              return chain;
            },
            select() {
              return Promise.resolve(executeWrite(table, op, payload, writeFilters));
            },
            setHeader(name, val) {
              logs.capturedHeaders[name] = val;
            },
            then(resolve, reject) {
              return Promise.resolve(executeWrite(table, op, payload, writeFilters)).then(resolve, reject);
            }
          };
          return chain;
        }

        return {
          select() {
            return makeSelectChain();
          },
          upsert(payload) {
            return makeWriteChain("upsert", payload);
          },
          insert(payload) {
            return makeWriteChain("insert", payload);
          },
          update(payload) {
            return makeWriteChain("update", payload);
          },
          delete() {
            return makeWriteChain("delete", null);
          }
        };
      },

      async rpc(name, params = {}) {
        logs.rpcCalls.push({ name, params: cloneJson(params), actor: getActor().role });

        const fault = faults.rpc.get(name);
        if (fault === "network_error") {
          faults.rpc.delete(name);
          throw new Error("NetworkError: Failed to fetch");
        }
        if (fault === "missing_data") {
          faults.rpc.delete(name);
          return { data: null, error: null };
        }
        if (fault === "error_500") {
          faults.rpc.delete(name);
          return { data: null, error: { message: "Internal Server Error", status: 503 } };
        }

        const actor = getActor();

        if (name === "create_order_atomic") {
          const cleanPhone = String(params.p_cliente_telefono || "").replace(/\D/g, "");
          const cleanName = String(params.p_cliente_nombre || "").trim();
          const cleanDelivery = String(params.p_tipo_entrega || "RETIRO").trim().toUpperCase();
          let cleanAddress = String(params.p_direccion_entrega || "").trim();
          const cleanKey = String(params.p_checkout_cart_key || "").trim();
          const items = params.p_items;

          if (!/^[0-9]{8,15}$/.test(cleanPhone)) {
            return { data: null, error: { message: "VALIDATION_ERROR: Teléfono de cliente inválido.", status: 400 } };
          }
          if (cleanName.length < 2 || cleanName.length > 120) {
            return { data: null, error: { message: "VALIDATION_ERROR: Nombre de cliente inválido.", status: 400 } };
          }
          if (!["RETIRO", "DELIVERY"].includes(cleanDelivery)) {
            return { data: null, error: { message: "VALIDATION_ERROR: Tipo de entrega inválido.", status: 400 } };
          }
          if (cleanDelivery === "DELIVERY" && !cleanAddress) {
            return { data: null, error: { message: "VALIDATION_ERROR: La dirección de entrega es obligatoria.", status: 400 } };
          }
          if (cleanDelivery === "RETIRO" && !cleanAddress) {
            cleanAddress = "Retiro en Mostrador";
          }
          if (!cleanKey || cleanKey.length > 200) {
            return { data: null, error: { message: "VALIDATION_ERROR: Clave de idempotencia de checkout requerida.", status: 400 } };
          }
          if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
            return { data: null, error: { message: "VALIDATION_ERROR: El pedido debe contener entre 1 y 100 productos.", status: 400 } };
          }

          let tokenHash = null;
          let generatedToken = null;
          if (params.p_tracking_token_hash !== null && params.p_tracking_token_hash !== undefined) {
            if (!/^[0-9a-f]{64}$/.test(String(params.p_tracking_token_hash))) {
              return { data: null, error: { message: "VALIDATION_ERROR: Hash de token de seguimiento inválido.", status: 400 } };
            }
            tokenHash = String(params.p_tracking_token_hash);
          }

          const canonicalItems = [...items]
            .map((el) => ({
              producto_id: String(el?.producto_id || "").trim(),
              cantidad: Number(el?.cantidad)
            }))
            .sort((a, b) => a.producto_id.localeCompare(b.producto_id));

          const payloadHash = sha256HexSync(
            JSON.stringify({
              telefono: cleanPhone,
              nombre: cleanName,
              tipo_entrega: cleanDelivery,
              direccion: cleanAddress,
              items: canonicalItems
            })
          );

          const existing = db.pedidos.find((o) => o.checkout_cart_key === cleanKey);
          if (existing) {
            if (existing.payload_hash !== payloadHash) {
              return {
                data: null,
                error: { message: "CONFLICT: La clave de checkout ya fue utilizada con contenido diferente.", status: 409 }
              };
            }
            return {
              data: { idempotent: true, order: sanitizeOrderPublic(existing) },
              error: null
            };
          }

          const rlRes = checkAndRecordRateLimit(cleanPhone, sourceKey);
          if (rlRes.error) return { data: null, error: rlRes.error };

          const serverItems = [];
          let totalEstimado = 0;

          for (const elem of items) {
            const product = db.products.find((p) => p.id === String(elem?.producto_id || "").trim());
            if (!product || product.archivado || !product.disponible) {
              return {
                data: null,
                error: { message: "PRODUCT_UNAVAILABLE: Producto no disponible o pausado.", status: 400 }
              };
            }
            const qty = Number(elem?.cantidad);
            if (!Number.isFinite(qty) || qty <= 0) {
              return {
                data: null,
                error: { message: "VALIDATION_ERROR: Cantidad solicitada inválida.", status: 400 }
              };
            }
            if (product.unidad_medida === "UNIDAD" && !Number.isInteger(qty)) {
              return {
                data: null,
                error: { message: "VALIDATION_ERROR: Los productos por unidad requieren cantidad entera.", status: 400 }
              };
            }
            if (Math.abs(qty / product.paso - Math.round(qty / product.paso)) > 0.0001) {
              return {
                data: null,
                error: { message: "VALIDATION_ERROR: Cantidad incompatible con el paso del producto.", status: 400 }
              };
            }

            const subtotal = Math.round(qty * product.precio);
            totalEstimado += subtotal;
            serverItems.push({
              producto_id: product.id,
              nombre: product.nombre,
              categoria: product.categoria,
              unidad_medida: product.unidad_medida,
              precio_unitario: product.precio,
              cantidad_solicitada: qty,
              peso_real: product.unidad_medida === "UNIDAD" ? qty : null,
              subtotal,
              sin_stock: false,
              confirmado_preparacion: false
            });
          }

          if (!tokenHash) {
            generatedToken = randomBytes(32).toString("hex");
            tokenHash = sha256HexSync(generatedToken);
          }

          const prevCust = db.clientes.get(cleanPhone);
          db.clientes.set(cleanPhone, {
            telefono: cleanPhone,
            nombre: cleanName,
            direccion: cleanAddress || prevCust?.direccion || "",
            updated_at: nowIso()
          });

          const newOrder = {
            id: nextOrderId++,
            cliente_telefono: cleanPhone,
            cliente_nombre: cleanName,
            tipo_entrega: cleanDelivery,
            direccion_entrega: cleanAddress,
            estado: "PENDIENTE",
            total_estimado: totalEstimado,
            total_real: null,
            items: serverItems,
            checkout_cart_key: cleanKey,
            payload_hash: payloadHash,
            tracking_token_hash: tokenHash,
            tracking_token_revoked_at: null,
            fecha: nowIso(),
            finalizado_at: null,
            cancelado_at: null,
            version: 1,
            updated_at: nowIso()
          };
          db.pedidos.push(newOrder);

          if (fault === "timeout_after_commit") {
            faults.rpc.delete(name);
            throw new Error("FetchError: Request timed out after commit");
          }

          return {
            data: {
              idempotent: false,
              tracking_token: generatedToken,
              order: sanitizeOrderPublic(newOrder)
            },
            error: null
          };
        }

        if (name === "get_order_by_tracking_token") {
          const orderId = Number(params.p_order_id);
          const token = typeof params.p_token === "string" ? params.p_token.trim() : "";
          if (!Number.isSafeInteger(orderId) || orderId <= 0 || token.length < 32) {
            return { data: [], error: null };
          }
          const hash = sha256HexSync(token);
          const found = db.pedidos.find(
            (o) => o.id === orderId && o.tracking_token_hash === hash && !o.tracking_token_revoked_at
          );
          if (!found) return { data: [], error: null };
          return {
            data: [{
              id: found.id,
              cliente_nombre: found.cliente_nombre,
              tipo_entrega: found.tipo_entrega,
              direccion_entrega: found.direccion_entrega,
              estado: found.estado,
              total_estimado: found.total_estimado,
              total_real: found.total_real,
              items: cloneJson(found.items),
              fecha: found.fecha,
              finalizado_at: found.finalizado_at,
              cancelado_at: found.cancelado_at,
              version: found.version
            }],
            error: null
          };
        }

        if (name === "revoke_order_tracking_token") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede revocar enlaces de seguimiento.", status: 403 } };
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order || order.tracking_token_revoked_at) return { data: false, error: null };
          order.tracking_token_revoked_at = nowIso();
          order.updated_at = nowIso();
          return { data: true, error: null };
        }

        if (name === "take_order") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede tomar pedidos.", status: 403 } };
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order) return { data: null, error: { message: "NOT_FOUND: Pedido no encontrado.", status: 404 } };
          if (order.version !== params.p_expected_version) {
            return { data: null, error: { message: `CONFLICT: El pedido fue modificado por otro operario (versión actual ${order.version}).`, status: 409 } };
          }
          if (order.estado !== "PENDIENTE") {
            return { data: null, error: { message: `INVALID_TRANSITION: Sólo se pueden tomar pedidos PENDIENTE (estado actual: ${order.estado}).`, status: 409 } };
          }
          order.estado = "EN_PREPARACION";
          order.tomado_por = actor.uid;
          order.tomado_at = nowIso();
          order.version += 1;
          order.updated_at = nowIso();
          return { data: sanitizeOrderPublic(order), error: null };
        }

        if (name === "update_order_preparation") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede preparar pedidos.", status: 403 } };
          }
          const items = params.p_items;
          if (!Array.isArray(items)) return { data: null, error: { message: "VALIDATION_ERROR: Ítems inválidos.", status: 400 } };
          if (params.p_total_real !== null && params.p_total_real !== undefined && Number(params.p_total_real) < 0) {
            return { data: null, error: { message: "VALIDATION_ERROR: Total real no puede ser negativo.", status: 400 } };
          }
          let totalEst = 0;
          for (const item of items) {
            if (
              Number(item.precio_unitario) < 0 ||
              Number(item.cantidad_solicitada) <= 0 ||
              (item.peso_real !== null && item.peso_real !== undefined && Number(item.peso_real) < 0) ||
              Number(item.subtotal || 0) < 0
            ) {
              return { data: null, error: { message: "VALIDATION_ERROR: Ítem con importe o cantidad fuera de rango.", status: 400 } };
            }
            totalEst += Math.round(Number(item.cantidad_solicitada) * Number(item.precio_unitario));
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order) return { data: null, error: { message: "NOT_FOUND: Pedido no encontrado.", status: 404 } };
          if (order.version !== params.p_expected_version) {
            return { data: null, error: { message: `CONFLICT: El pedido fue actualizado simultáneamente (versión actual ${order.version}).`, status: 409 } };
          }
          if (!["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
            return { data: null, error: { message: `INVALID_TRANSITION: No se puede editar preparación de pedido en estado ${order.estado}.`, status: 409 } };
          }
          order.items = cloneJson(items);
          order.total_estimado = totalEst;
          order.total_real = params.p_total_real ?? null;
          order.version += 1;
          order.updated_at = nowIso();
          return { data: sanitizeOrderPublic(order), error: null };
        }

        if (name === "finalize_order_preparation") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede finalizar pedidos.", status: 403 } };
          }
          const items = params.p_items;
          if (!Array.isArray(items) || items.length === 0) {
            return { data: null, error: { message: "VALIDATION_ERROR: No se puede finalizar un pedido sin ítems.", status: 400 } };
          }
          let totalReal = 0;
          for (const item of items) {
            if (!item.sin_stock) {
              if (item.peso_real === null || item.peso_real === undefined || Number(item.peso_real) <= 0) {
                return { data: null, error: { message: "VALIDATION_ERROR: Todos los ítems disponibles deben estar preparados.", status: 400 } };
              }
              totalReal += Math.round(Number(item.peso_real) * Number(item.precio_unitario));
            }
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order) return { data: null, error: { message: "NOT_FOUND: Pedido no encontrado.", status: 404 } };
          if (order.version !== params.p_expected_version) {
            return { data: null, error: { message: `CONFLICT: El pedido fue modificado simultáneamente (versión actual ${order.version}).`, status: 409 } };
          }
          if (!["PENDIENTE", "EN_PREPARACION"].includes(order.estado)) {
            return { data: null, error: { message: `INVALID_TRANSITION: El pedido ya se encuentra en estado ${order.estado}.`, status: 409 } };
          }
          order.items = cloneJson(items);
          order.total_real = totalReal;
          order.estado = "LISTO";
          order.finalizado_at = nowIso();
          order.version += 1;
          order.updated_at = nowIso();
          return { data: sanitizeOrderPublic(order), error: null };
        }

        if (name === "transition_order_status") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede cambiar estados.", status: 403 } };
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order) return { data: null, error: { message: "NOT_FOUND: Pedido no encontrado.", status: 404 } };
          if (order.version !== params.p_expected_version) {
            return { data: null, error: { message: `CONFLICT: Conflicto de versión concurrente (actual ${order.version}).`, status: 409 } };
          }
          const nextStatus = params.p_new_status;
          if (!["EN_PREPARACION", "ENTREGADO", "CANCELADO"].includes(nextStatus)) {
            return { data: null, error: { message: `INVALID_TRANSITION: Transición no permitida hacia ${nextStatus}.`, status: 409 } };
          }
          if (["LISTO", "ENTREGADO"].includes(order.estado) && nextStatus === "EN_PREPARACION") {
            return { data: null, error: { message: "INVALID_TRANSITION: Un pedido finalizado no puede volver a preparación.", status: 409 } };
          }
          if (order.estado === "CANCELADO" && nextStatus !== "CANCELADO") {
            return { data: null, error: { message: "INVALID_TRANSITION: Un pedido cancelado no puede reabrirse.", status: 409 } };
          }
          order.estado = nextStatus;
          if (nextStatus === "CANCELADO" && !order.cancelado_at) {
            order.cancelado_at = nowIso();
          }
          order.version += 1;
          order.updated_at = nowIso();
          return { data: sanitizeOrderPublic(order), error: null };
        }

        if (name === "update_order_details_staff") {
          if (!actor.isActiveStaff) {
            return { data: null, error: { message: "FORBIDDEN: Sólo personal activo puede editar datos de entrega.", status: 403 } };
          }
          const cleanPhone = String(params.p_telefono || "").replace(/\D/g, "");
          const cleanName = String(params.p_nombre || "").trim();
          if (!/^[0-9]{8,15}$/.test(cleanPhone) || cleanName.length < 2) {
            return { data: null, error: { message: "VALIDATION_ERROR: Datos de cliente inválidos.", status: 400 } };
          }
          const order = db.pedidos.find((o) => o.id === Number(params.p_order_id));
          if (!order) return { data: null, error: { message: "NOT_FOUND: Pedido no encontrado.", status: 404 } };
          if (order.version !== params.p_expected_version) {
            return { data: null, error: { message: `CONFLICT: Conflicto de versión concurrente (actual ${order.version}).`, status: 409 } };
          }
          db.clientes.set(cleanPhone, {
            telefono: cleanPhone,
            nombre: cleanName,
            direccion: String(params.p_direccion_entrega || "").trim(),
            updated_at: nowIso()
          });
          order.cliente_nombre = cleanName;
          order.cliente_telefono = cleanPhone;
          order.tipo_entrega = params.p_tipo_entrega;
          order.direccion_entrega = String(params.p_direccion_entrega || "").trim();
          order.version += 1;
          order.updated_at = nowIso();
          return { data: sanitizeOrderPublic(order), error: null };
        }

        return { data: null, error: { message: `Unknown RPC: ${name}` } };
      },

      channel(channelName) {
        const listeners = [];
        return {
          on(_event, filter, _cb) {
            listeners.push({ channelName, table: filter?.table || "*" });
            return this;
          },
          subscribe() {
            logs.realtimeSubscriptions.push(...listeners);
            return { channelName, listeners };
          }
        };
      },
      removeChannel() {}
    };
  }

  return {
    targetUrl,
    isRealPostgresRls: false,
    note: "Simulated local harness — does NOT prove real PostgreSQL RLS enforcement.",
    db,
    logs,
    createClient,
    setNextRpcFault,
    setNextTableFault,
    advanceTimeMs,
    setNowMs
  };
}
