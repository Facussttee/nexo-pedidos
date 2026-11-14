-- =============================================================================
-- NEXO PEDIDOS - SCRIPT COMPLETO DE BASE DE DATOS Y TIEMPO REAL (SUPABASE / POSTGRESQL)
-- =============================================================================
-- Esquema canónico endurecido (AUD-04..AUD-12):
-- - Autenticación individual vía Supabase Auth (auth.users) + staff_members (owner/operator).
-- - Cero PIN estático en API y cero políticas USING (true) para anon.
-- - Seguimiento privado por token opaco (sólo hash SHA-256 almacenado).
-- - Checkout autoritativo e idempotente (create_order_atomic), concurrencia optimista (version)
--   y límites de tasa atómicos fail-closed gobernados por NOW().
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. TABLA DE CLIENTES (Acceso restringido a personal activo y RPCs)
CREATE TABLE IF NOT EXISTS public.clientes (
    telefono VARCHAR(25) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    direccion VARCHAR(250) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE PRODUCTOS (CATÁLOGO, PRECIOS Y STOCK)
CREATE TABLE IF NOT EXISTS public.productos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidad_medida VARCHAR(15) NOT NULL CHECK (unidad_medida IN ('KG', 'UNIDAD')),
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT TRUE,
    paso NUMERIC(5, 2) DEFAULT 0.5 CHECK (paso > 0),
    codigo VARCHAR(50) DEFAULT '',
    detalle TEXT DEFAULT '',
    archivado BOOLEAN DEFAULT FALSE,
    imagen_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PEDIDOS (CABECERA, DETALLE JSONB, CONCURRENCIA Y PRIVACIDAD)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id SERIAL PRIMARY KEY,
    cliente_telefono VARCHAR(25) REFERENCES public.clientes(telefono) ON UPDATE CASCADE,
    cliente_nombre VARCHAR(120) NOT NULL,
    tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'RETIRO' CHECK (tipo_entrega IN ('RETIRO', 'DELIVERY')),
    direccion_entrega TEXT DEFAULT 'Retiro en Mostrador',
    estado VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO')),
    total_estimado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_real NUMERIC(10, 2),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    checkout_cart_key VARCHAR(200),
    payload_hash TEXT,
    tracking_token_hash TEXT,
    tracking_token_revoked_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    tomado_por UUID REFERENCES auth.users(id),
    tomado_at TIMESTAMPTZ,
    notificado_whatsapp BOOLEAN DEFAULT FALSE,
    notificado_at TIMESTAMPTZ,
    cancelado_at TIMESTAMPTZ,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas aditivas idempotentes si la tabla ya existía
ALTER TABLE public.productos
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) DEFAULT '',
    ADD COLUMN IF NOT EXISTS detalle TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS archivado BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS imagen_id VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS checkout_cart_key VARCHAR(200),
    ADD COLUMN IF NOT EXISTS payload_hash TEXT,
    ADD COLUMN IF NOT EXISTS tracking_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS tracking_token_revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS tomado_por UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS tomado_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Iniciar secuencia de pedidos en 101 si está en valor inferior
SELECT setval(
    pg_get_serial_sequence('public.pedidos', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM public.pedidos), 100), 100)
);

-- Índices de consulta, rendimiento e idempotencia
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_tel ON public.pedidos(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_disponible ON public.productos(disponible);
CREATE INDEX IF NOT EXISTS idx_productos_archivado ON public.productos(archivado);
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_checkout_cart_key_uidx
    ON public.pedidos (checkout_cart_key) WHERE checkout_cart_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_tracking_token_hash_uidx
    ON public.pedidos (tracking_token_hash) WHERE tracking_token_hash IS NOT NULL;

-- 4. AUTENTICACIÓN INDIVIDUAL DE PERSONAL Y RBAC (AUD-04, AUD-05)
-- Sin alta pública de personal; provisionar dueño inicial mediante fixture administrativo.
CREATE TABLE IF NOT EXISTS public.staff_members (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'operator')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla heredada nexo_secrets mantenida bloqueada (sin PIN '1234' en API pública)
CREATE TABLE IF NOT EXISTS public.nexo_secrets (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);
DELETE FROM public.nexo_secrets WHERE key = 'staff_pin';
REVOKE ALL ON TABLE public.nexo_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nexo_secrets TO service_role;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON public.clientes;
CREATE TRIGGER trigger_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_productos_updated_at ON public.productos;
CREATE TRIGGER trigger_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trigger_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_staff_updated_at ON public.staff_members;
CREATE TRIGGER trigger_staff_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT sm.role
    FROM public.staff_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(public.current_staff_role() IN ('owner', 'operator'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_active_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(public.current_staff_role() = 'owner', FALSE);
$$;

-- 5. PRIVACIDAD DE SEGUIMIENTO Y HASHING SHA-256 (AUD-06)
CREATE OR REPLACE FUNCTION public.hash_tracking_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token(p_order_id INT, p_token TEXT)
RETURNS TABLE (
    id INT,
    cliente_nombre VARCHAR(120),
    tipo_entrega VARCHAR(20),
    direccion_entrega TEXT,
    estado VARCHAR(25),
    total_estimado NUMERIC(10, 2),
    total_real NUMERIC(10, 2),
    items JSONB,
    fecha TIMESTAMPTZ,
    finalizado_at TIMESTAMPTZ,
    cancelado_at TIMESTAMPTZ,
    version INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_hash TEXT;
BEGIN
    IF p_order_id IS NULL OR p_order_id <= 0 OR p_token IS NULL OR char_length(trim(p_token)) < 32 THEN
        RETURN;
    END IF;
    v_hash := public.hash_tracking_token(trim(p_token));
    RETURN QUERY
    SELECT
        p.id, p.cliente_nombre, p.tipo_entrega, p.direccion_entrega,
        p.estado, p.total_estimado, p.total_real, p.items, p.fecha,
        p.finalizado_at, p.cancelado_at, p.version
    FROM public.pedidos p
    WHERE p.id = p_order_id
      AND p.tracking_token_hash = v_hash
      AND p.tracking_token_revoked_at IS NULL
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_order_tracking_token(p_order_id INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede revocar enlaces de seguimiento.';
    END IF;
    UPDATE public.pedidos
    SET tracking_token_revoked_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id AND tracking_token_revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- 6. LÍMITES DE TASA ATÓMICOS FAIL-CLOSED Y RELOJ DE SERVIDOR NOW() (AUD-12)
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    customer_window_seconds INT NOT NULL CHECK (customer_window_seconds BETWEEN 10 AND 86400),
    customer_max_orders INT NOT NULL CHECK (customer_max_orders BETWEEN 1 AND 50),
    source_window_seconds INT NOT NULL CHECK (source_window_seconds BETWEEN 10 AND 86400),
    source_max_orders INT NOT NULL CHECK (source_max_orders BETWEEN 1 AND 100),
    global_window_seconds INT NOT NULL CHECK (global_window_seconds BETWEEN 10 AND 86400),
    global_max_orders INT NOT NULL CHECK (global_max_orders BETWEEN 1 AND 500),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE public.rate_limit_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limit_config TO service_role;

INSERT INTO public.rate_limit_config (
    id, customer_window_seconds, customer_max_orders,
    source_window_seconds, source_max_orders,
    global_window_seconds, global_max_orders
) VALUES (1, 300, 3, 60, 10, 60, 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.order_rate_limit_events (
    id BIGSERIAL PRIMARY KEY,
    customer_key TEXT NOT NULL,
    source_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_rate_limit_events_created_idx ON public.order_rate_limit_events (created_at DESC);
REVOKE ALL ON TABLE public.order_rate_limit_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.order_rate_limit_events TO service_role;

CREATE OR REPLACE FUNCTION public.extract_request_source_key()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_headers_raw TEXT;
    v_headers JSONB;
    v_ip TEXT;
BEGIN
    v_headers_raw := current_setting('request.headers', true);
    IF v_headers_raw IS NOT NULL AND v_headers_raw <> '' THEN
        BEGIN
            v_headers := v_headers_raw::jsonb;
            v_ip := COALESCE(
                NULLIF(trim(v_headers ->> 'cf-connecting-ip'), ''),
                NULLIF(trim(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
                NULLIF(trim(v_headers ->> 'x-real-ip'), '')
            );
            IF v_ip IS NOT NULL THEN RETURN 'ip:' || v_ip; END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
    IF auth.uid() IS NOT NULL THEN RETURN 'uid:' || auth.uid()::text; END IF;
    RETURN 'source:unattributed';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_record_order_rate_limit(p_customer_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cfg RECORD;
    v_source_key TEXT;
    v_customer_key TEXT;
    v_customer_count INT;
    v_source_count INT;
    v_global_count INT;
    v_oldest_ts TIMESTAMPTZ;
    v_retry_after INT;
BEGIN
    PERFORM pg_advisory_xact_lock(72839104);
    SELECT * INTO v_cfg FROM public.rate_limit_config WHERE id = 1;
    IF NOT FOUND
       OR v_cfg.customer_window_seconds IS NULL OR v_cfg.customer_window_seconds <= 0
       OR v_cfg.customer_max_orders IS NULL OR v_cfg.customer_max_orders <= 0
       OR v_cfg.source_window_seconds IS NULL OR v_cfg.source_window_seconds <= 0
       OR v_cfg.source_max_orders IS NULL OR v_cfg.source_max_orders <= 0
       OR v_cfg.global_window_seconds IS NULL OR v_cfg.global_window_seconds <= 0
       OR v_cfg.global_max_orders IS NULL OR v_cfg.global_max_orders <= 0 THEN
        RAISE EXCEPTION 'RATE_LIMIT_UNCONFIGURED: Límites de pedidos no configurados o inválidos.';
    END IF;

    v_customer_key := COALESCE(NULLIF(regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g'), ''), 'unknown');
    v_source_key := public.extract_request_source_key();

    SELECT COUNT(*), MIN(created_at) INTO v_customer_count, v_oldest_ts
    FROM public.order_rate_limit_events
    WHERE customer_key = v_customer_key AND created_at >= (NOW() - make_interval(secs => v_cfg.customer_window_seconds));
    IF v_customer_count >= v_cfg.customer_max_orders THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_oldest_ts + make_interval(secs => v_cfg.customer_window_seconds)) - NOW())))::INT);
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Demasiados pedidos recientes. RETRY_AFTER:%', v_retry_after;
    END IF;

    SELECT COUNT(*), MIN(created_at) INTO v_source_count, v_oldest_ts
    FROM public.order_rate_limit_events
    WHERE source_key = v_source_key AND created_at >= (NOW() - make_interval(secs => v_cfg.source_window_seconds));
    IF v_source_count >= v_cfg.source_max_orders THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_oldest_ts + make_interval(secs => v_cfg.source_window_seconds)) - NOW())))::INT);
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Límite temporal de origen alcanzado. RETRY_AFTER:%', v_retry_after;
    END IF;

    SELECT COUNT(*), MIN(created_at) INTO v_global_count, v_oldest_ts
    FROM public.order_rate_limit_events
    WHERE created_at >= (NOW() - make_interval(secs => v_cfg.global_window_seconds));
    IF v_global_count >= v_cfg.global_max_orders THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_oldest_ts + make_interval(secs => v_cfg.global_window_seconds)) - NOW())))::INT);
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Alta demanda en el comercio. RETRY_AFTER:%', v_retry_after;
    END IF;

    INSERT INTO public.order_rate_limit_events (customer_key, source_key, created_at)
    VALUES (v_customer_key, v_source_key, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_order_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.fecha := NOW();
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    IF COALESCE(NEW.cliente_telefono, '') <> '' THEN
        IF current_setting('nexo.atomic_checkout_rl_checked', true) IS DISTINCT FROM 'on' THEN
            PERFORM public.check_and_record_order_rate_limit(NEW.cliente_telefono);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pedidos_rate_limit ON public.pedidos;
CREATE TRIGGER trigger_pedidos_rate_limit BEFORE INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate_limit();

-- 7. CHECKOUT AUTORITATIVO E IDEMPOTENTE (AUD-07)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_cliente_telefono TEXT,
    p_cliente_nombre TEXT,
    p_tipo_entrega TEXT,
    p_direccion_entrega TEXT,
    p_items JSONB,
    p_checkout_cart_key TEXT,
    p_tracking_token_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_name TEXT;
    v_clean_delivery TEXT;
    v_clean_address TEXT;
    v_clean_key TEXT;
    v_elem JSONB;
    v_product RECORD;
    v_qty NUMERIC;
    v_subtotal NUMERIC;
    v_total_estimado NUMERIC := 0;
    v_server_items JSONB := '[]'::jsonb;
    v_canonical_items JSONB := '[]'::jsonb;
    v_payload_hash TEXT;
    v_existing RECORD;
    v_generated_token TEXT := NULL;
    v_token_hash TEXT;
    v_order_row RECORD;
BEGIN
    v_clean_phone := regexp_replace(COALESCE(p_cliente_telefono, ''), '\D', '', 'g');
    v_clean_name := trim(COALESCE(p_cliente_nombre, ''));
    v_clean_delivery := upper(trim(COALESCE(p_tipo_entrega, 'RETIRO')));
    v_clean_address := trim(COALESCE(p_direccion_entrega, ''));
    v_clean_key := trim(COALESCE(p_checkout_cart_key, ''));

    IF v_clean_phone !~ '^[0-9]{8,15}$' THEN RAISE EXCEPTION 'VALIDATION_ERROR: Teléfono de cliente inválido.'; END IF;
    IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Nombre de cliente inválido.'; END IF;
    IF v_clean_delivery NOT IN ('RETIRO', 'DELIVERY') THEN RAISE EXCEPTION 'VALIDATION_ERROR: Tipo de entrega inválido.'; END IF;
    IF v_clean_delivery = 'DELIVERY' AND v_clean_address = '' THEN RAISE EXCEPTION 'VALIDATION_ERROR: La dirección de entrega es obligatoria.'; END IF;
    IF v_clean_delivery = 'RETIRO' AND v_clean_address = '' THEN v_clean_address := 'Retiro en Mostrador'; END IF;
    IF v_clean_key = '' OR char_length(v_clean_key) > 200 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Clave de idempotencia de checkout requerida.'; END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: El pedido debe contener entre 1 y 100 productos.';
    END IF;
    IF p_tracking_token_hash IS NOT NULL THEN
        IF p_tracking_token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'VALIDATION_ERROR: Hash de token inválido.'; END IF;
        v_token_hash := p_tracking_token_hash;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('checkout:' || v_clean_key));

    SELECT jsonb_agg(jsonb_build_object('producto_id', trim(COALESCE(el ->> 'producto_id', '')), 'cantidad', (el ->> 'cantidad')::NUMERIC) ORDER BY trim(COALESCE(el ->> 'producto_id', '')))
    INTO v_canonical_items
    FROM jsonb_array_elements(p_items) AS el;

    v_payload_hash := encode(extensions.digest(convert_to(jsonb_build_object('telefono', v_clean_phone, 'nombre', v_clean_name, 'tipo_entrega', v_clean_delivery, 'direccion', v_clean_address, 'items', v_canonical_items)::text, 'UTF8'), 'sha256'), 'hex');

    SELECT * INTO v_existing FROM public.pedidos WHERE checkout_cart_key = v_clean_key LIMIT 1;
    IF FOUND THEN
        IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
            RAISE EXCEPTION 'CONFLICT: La clave de checkout ya fue utilizada con contenido diferente.';
        END IF;
        RETURN jsonb_build_object(
            'idempotent', TRUE,
            'order', jsonb_build_object(
                'id', v_existing.id, 'cliente_telefono', v_existing.cliente_telefono, 'cliente_nombre', v_existing.cliente_nombre,
                'tipo_entrega', v_existing.tipo_entrega, 'direccion_entrega', v_existing.direccion_entrega,
                'estado', v_existing.estado, 'total_estimado', v_existing.total_estimado, 'total_real', v_existing.total_real,
                'items', v_existing.items, 'checkout_cart_key', v_existing.checkout_cart_key, 'fecha', v_existing.fecha, 'version', v_existing.version
            )
        );
    END IF;

    PERFORM public.check_and_record_order_rate_limit(v_clean_phone);
    PERFORM set_config('nexo.atomic_checkout_rl_checked', 'on', true);

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product FROM public.productos WHERE id = trim(COALESCE(v_elem ->> 'producto_id', '')) FOR SHARE;
        IF NOT FOUND OR COALESCE(v_product.archivado, FALSE) = TRUE OR COALESCE(v_product.disponible, FALSE) = FALSE THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Producto no disponible o pausado.';
        END IF;
        v_qty := (v_elem ->> 'cantidad')::NUMERIC;
        IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Cantidad solicitada inválida.'; END IF;
        IF v_product.unidad_medida = 'UNIDAD' AND v_qty <> FLOOR(v_qty) THEN RAISE EXCEPTION 'VALIDATION_ERROR: Los productos por unidad requieren cantidad entera.'; END IF;
        IF ABS((v_qty / v_product.paso) - ROUND(v_qty / v_product.paso)) > 0.0001 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Cantidad incompatible con el paso del producto.'; END IF;

        v_subtotal := ROUND(v_qty * v_product.precio);
        v_total_estimado := v_total_estimado + v_subtotal;
        v_server_items := v_server_items || jsonb_build_array(jsonb_build_object(
            'producto_id', v_product.id, 'nombre', v_product.nombre, 'categoria', v_product.categoria,
            'unidad_medida', v_product.unidad_medida, 'precio_unitario', v_product.precio, 'cantidad_solicitada', v_qty,
            'peso_real', CASE WHEN v_product.unidad_medida = 'UNIDAD' THEN v_qty ELSE NULL END,
            'subtotal', v_subtotal, 'sin_stock', FALSE, 'confirmado_preparacion', FALSE
        ));
    END LOOP;

    IF v_token_hash IS NULL THEN
        v_generated_token := encode(extensions.gen_random_bytes(32), 'hex');
        v_token_hash := public.hash_tracking_token(v_generated_token);
    END IF;

    INSERT INTO public.clientes (telefono, nombre, direccion, updated_at)
    VALUES (v_clean_phone, v_clean_name, v_clean_address, NOW())
    ON CONFLICT (telefono) DO UPDATE SET nombre = EXCLUDED.nombre, direccion = CASE WHEN EXCLUDED.direccion <> '' THEN EXCLUDED.direccion ELSE public.clientes.direccion END, updated_at = NOW();

    INSERT INTO public.pedidos (cliente_telefono, cliente_nombre, tipo_entrega, direccion_entrega, estado, total_estimado, total_real, items, checkout_cart_key, payload_hash, tracking_token_hash, fecha, version)
    VALUES (v_clean_phone, v_clean_name, v_clean_delivery, v_clean_address, 'PENDIENTE', v_total_estimado, NULL, v_server_items, v_clean_key, v_payload_hash, v_token_hash, NOW(), 1)
    RETURNING * INTO v_order_row;

    RETURN jsonb_build_object(
        'idempotent', FALSE, 'tracking_token', v_generated_token,
        'order', jsonb_build_object(
            'id', v_order_row.id, 'cliente_telefono', v_order_row.cliente_telefono, 'cliente_nombre', v_order_row.cliente_nombre,
            'tipo_entrega', v_order_row.tipo_entrega, 'direccion_entrega', v_order_row.direccion_entrega,
            'estado', v_order_row.estado, 'total_estimado', v_order_row.total_estimado, 'total_real', v_order_row.total_real,
            'items', v_order_row.items, 'checkout_cart_key', v_order_row.checkout_cart_key, 'fecha', v_order_row.fecha, 'version', v_order_row.version
        )
    );
END;
$$;

-- 8. PREPARACIÓN Y CONCURRENCIA OPTIMISTA (AUD-09)
CREATE OR REPLACE FUNCTION public.take_order(p_order_id INT, p_expected_version INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
BEGIN
    IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede tomar pedidos.'; END IF;
    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.'; END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'CONFLICT: El pedido fue modificado por otro operario (versión actual %).', v_order.version; END IF;
    IF v_order.estado <> 'PENDIENTE' THEN RAISE EXCEPTION 'INVALID_TRANSITION: Sólo se pueden tomar pedidos PENDIENTE.'; END IF;
    UPDATE public.pedidos SET estado = 'EN_PREPARACION', tomado_por = auth.uid(), tomado_at = NOW(), version = version + 1, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_updated;
    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_preparation(p_order_id INT, p_expected_version INT, p_items JSONB, p_total_real NUMERIC DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
    v_item JSONB;
    v_total_est NUMERIC := 0;
BEGIN
    IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede preparar pedidos.'; END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'VALIDATION_ERROR: Ítems inválidos.'; END IF;
    IF p_total_real IS NOT NULL AND p_total_real < 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Total real no puede ser negativo.'; END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item ->> 'precio_unitario')::NUMERIC < 0 OR (v_item ->> 'cantidad_solicitada')::NUMERIC <= 0
           OR ((v_item ->> 'peso_real') IS NOT NULL AND (v_item ->> 'peso_real')::NUMERIC < 0)
           OR (COALESCE((v_item ->> 'subtotal')::NUMERIC, 0) < 0) THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Ítem fuera de rango.';
        END IF;
        v_total_est := v_total_est + ROUND((v_item ->> 'cantidad_solicitada')::NUMERIC * (v_item ->> 'precio_unitario')::NUMERIC);
    END LOOP;
    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.'; END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'CONFLICT: El pedido fue actualizado simultáneamente (versión actual %).', v_order.version; END IF;
    IF v_order.estado NOT IN ('PENDIENTE', 'EN_PREPARACION') THEN RAISE EXCEPTION 'INVALID_TRANSITION: Estado no editable.'; END IF;
    UPDATE public.pedidos SET items = p_items, total_estimado = v_total_est, total_real = p_total_real, version = version + 1, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_updated;
    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_preparation(p_order_id INT, p_expected_version INT, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
    v_item JSONB;
    v_total_real NUMERIC := 0;
BEGIN
    IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede finalizar pedidos.'; END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Pedido sin ítems.'; END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF NOT COALESCE((v_item ->> 'sin_stock')::BOOLEAN, FALSE) THEN
            IF (v_item ->> 'peso_real') IS NULL OR (v_item ->> 'peso_real')::NUMERIC <= 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Faltan ítems por preparar.'; END IF;
            v_total_real := v_total_real + ROUND((v_item ->> 'peso_real')::NUMERIC * (v_item ->> 'precio_unitario')::NUMERIC);
        END IF;
    END LOOP;
    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.'; END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'CONFLICT: Conflicto de versión concurrente (actual %).', v_order.version; END IF;
    IF v_order.estado NOT IN ('PENDIENTE', 'EN_PREPARACION') THEN RAISE EXCEPTION 'INVALID_TRANSITION: Estado no finalizable.'; END IF;
    UPDATE public.pedidos SET items = p_items, total_real = v_total_real, estado = 'LISTO', finalizado_at = NOW(), version = version + 1, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_updated;
    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_order_status(p_order_id INT, p_expected_version INT, p_new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
BEGIN
    IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede cambiar estados.'; END IF;
    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.'; END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'CONFLICT: Conflicto de versión concurrente (actual %).', v_order.version; END IF;
    IF p_new_status NOT IN ('EN_PREPARACION', 'ENTREGADO', 'CANCELADO') THEN RAISE EXCEPTION 'INVALID_TRANSITION: Destino inválido.'; END IF;
    IF v_order.estado IN ('LISTO', 'ENTREGADO') AND p_new_status = 'EN_PREPARACION' THEN RAISE EXCEPTION 'INVALID_TRANSITION: No reabrir.'; END IF;
    IF v_order.estado = 'CANCELADO' AND p_new_status <> 'CANCELADO' THEN RAISE EXCEPTION 'INVALID_TRANSITION: No reabrir cancelado.'; END IF;
    UPDATE public.pedidos SET estado = p_new_status, cancelado_at = CASE WHEN p_new_status = 'CANCELADO' THEN COALESCE(cancelado_at, NOW()) ELSE cancelado_at END, version = version + 1, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_updated;
    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_details_staff(p_order_id INT, p_expected_version INT, p_nombre TEXT, p_telefono TEXT, p_tipo_entrega TEXT, p_direccion_entrega TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
    v_clean_phone TEXT;
BEGIN
    IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede editar datos de entrega.'; END IF;
    v_clean_phone := regexp_replace(COALESCE(p_telefono, ''), '\D', '', 'g');
    IF v_clean_phone !~ '^[0-9]{8,15}$' OR char_length(trim(COALESCE(p_nombre, ''))) < 2 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Datos inválidos.'; END IF;
    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.'; END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'CONFLICT: Conflicto de versión concurrente (actual %).', v_order.version; END IF;
    INSERT INTO public.clientes (telefono, nombre, direccion, updated_at) VALUES (v_clean_phone, trim(p_nombre), trim(COALESCE(p_direccion_entrega, '')), NOW())
    ON CONFLICT (telefono) DO UPDATE SET nombre = EXCLUDED.nombre, direccion = EXCLUDED.direccion, updated_at = NOW();
    UPDATE public.pedidos SET cliente_nombre = trim(p_nombre), cliente_telefono = v_clean_phone, tipo_entrega = p_tipo_entrega, direccion_entrega = trim(COALESCE(p_direccion_entrega, '')), version = version + 1, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_updated;
    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

-- 9. PERMISOS Y RLS GRANULAR
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON TABLE public.clientes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.pedidos FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.staff_members FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.productos FROM PUBLIC;
GRANT SELECT ON public.productos TO anon, authenticated;
GRANT INSERT, UPDATE ON public.productos TO authenticated;
GRANT SELECT, UPDATE ON public.clientes TO authenticated;
GRANT SELECT, UPDATE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_by_tracking_token(INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_order_tracking_token(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.take_order(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_preparation(INT, INT, JSONB, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_order_preparation(INT, INT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_status(INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_details_staff(INT, INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_staff_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_owner() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_token(INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_order_tracking_token(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.take_order(INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_preparation(INT, INT, JSONB, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_preparation(INT, INT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_order_status(INT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_details_staff(INT, INT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_self_or_owner" ON public.staff_members;
DROP POLICY IF EXISTS "staff_owner_manage" ON public.staff_members;
CREATE POLICY "staff_read_self_or_owner" ON public.staff_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_active_owner());
CREATE POLICY "staff_owner_manage" ON public.staff_members FOR ALL TO authenticated USING (public.is_active_owner()) WITH CHECK (public.is_active_owner());

DROP POLICY IF EXISTS "productos_read_anon_publishable" ON public.productos;
DROP POLICY IF EXISTS "productos_read_staff_all" ON public.productos;
DROP POLICY IF EXISTS "productos_owner_insert" ON public.productos;
DROP POLICY IF EXISTS "productos_owner_update" ON public.productos;
CREATE POLICY "productos_read_anon_publishable" ON public.productos FOR SELECT TO anon USING (COALESCE(archivado, FALSE) = FALSE);
CREATE POLICY "productos_read_staff_all" ON public.productos FOR SELECT TO authenticated USING (COALESCE(archivado, FALSE) = FALSE OR public.is_active_staff());
CREATE POLICY "productos_owner_insert" ON public.productos FOR INSERT TO authenticated WITH CHECK (public.is_active_owner());
CREATE POLICY "productos_owner_update" ON public.productos FOR UPDATE TO authenticated USING (public.is_active_owner()) WITH CHECK (public.is_active_owner());

DROP POLICY IF EXISTS "clientes_staff_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_staff_update" ON public.clientes;
CREATE POLICY "clientes_staff_select" ON public.clientes FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "clientes_staff_update" ON public.clientes FOR UPDATE TO authenticated
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff() AND telefono ~ '^[0-9]{8,15}$' AND char_length(nombre) >= 2 AND char_length(nombre) <= 120);

DROP POLICY IF EXISTS "pedidos_staff_select" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_staff_update" ON public.pedidos;
CREATE POLICY "pedidos_staff_select" ON public.pedidos FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "pedidos_staff_update" ON public.pedidos FOR UPDATE TO authenticated
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff() AND total_estimado >= 0 AND (total_real IS NULL OR total_real >= 0) AND jsonb_typeof(items) = 'array' AND octet_length(items::text) <= 65536);

-- 10. REALTIME (Protegido por RLS SELECT: anon recibe catálogo; staff activo recibe pedidos)
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.productos REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'productos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
    END IF;
END $$;

-- 11. SEMILLA INICIAL DE PRODUCTOS (17 PRODUCTOS BASE)
INSERT INTO public.productos (id, nombre, categoria, unidad_medida, precio, disponible, paso, codigo, detalle, archivado)
VALUES
    ('prod-1',  'Banana Cavendish',               'Frutas',       'KG',     1800, true, 0.50, 'FRU-001', 'Maduración óptima', false),
    ('prod-2',  'Manzana Roja Elegida',           'Frutas',       'KG',     2200, true, 0.50, 'FRU-002', 'Selección de estación', false),
    ('prod-3',  'Naranja de Jugo',                'Frutas',       'KG',     1400, true, 0.50, 'FRU-003', 'Dulces y jugosas', false),
    ('prod-4',  'Limón Comercial',                'Frutas',       'KG',     1600, true, 0.25, 'FRU-004', 'Excelente tenor de jugo', false),
    ('prod-5',  'Frutilla Seleccionada',          'Frutas',       'KG',     4500, true, 0.25, 'FRU-005', 'Frescas del día', false),
    ('prod-6',  'Palta Hass Madura',              'Frutas',       'UNIDAD', 1200, true, 1.00, 'FRU-006', 'Punto justo de consumo', false),
    ('prod-7',  'Papa Negra Cepillada',           'Verduras',     'KG',      950, true, 1.00, 'VER-001', 'Para todo tipo de cocción', false),
    ('prod-8',  'Cebolla Selección',              'Verduras',     'KG',     1100, true, 0.50, 'VER-002', 'Cebollas firmes', false),
    ('prod-9',  'Tomate Redondo Premium',         'Verduras',     'KG',     2600, true, 0.50, 'VER-003', 'Para ensaladas o salsa', false),
    ('prod-10', 'Zanahoria Fresca',               'Verduras',     'KG',     1300, true, 0.50, 'VER-004', 'Zanahorias seleccionadas', false),
    ('prod-11', 'Zapallito Verde Tronco',         'Verduras',     'KG',     1700, true, 0.50, 'VER-005', 'Tiernos', false),
    ('prod-12', 'Calabaza Anco / Butternut',      'Verduras',     'KG',     1100, true, 1.00, 'VER-006', 'Ideal puré o al horno', false),
    ('prod-13', 'Acelga de Huerta (Atado)',       'Hojas Verdes', 'UNIDAD',  900, true, 1.00, 'HOJ-001', 'Atado fresco de huerta', false),
    ('prod-14', 'Lechuga Mantecosa',              'Hojas Verdes', 'KG',     2800, true, 0.25, 'HOJ-002', 'Hojas suaves', false),
    ('prod-15', 'Espinaca Fresca (Atado)',        'Hojas Verdes', 'UNIDAD', 1100, true, 1.00, 'HOJ-003', 'Atado fresco', false),
    ('prod-16', 'Huevos de Campo (Maple x 30)',   'Almacén',      'UNIDAD', 5200, true, 1.00, 'ALM-001', 'Maple de 30 huevos frescos', false),
    ('prod-17', 'Huevos de Campo (Docena)',       'Almacén',      'UNIDAD', 2300, true, 1.00, 'ALM-002', 'Docena de huevos seleccionados', false)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    categoria = EXCLUDED.categoria,
    unidad_medida = EXCLUDED.unidad_medida,
    precio = EXCLUDED.precio,
    disponible = EXCLUDED.disponible,
    paso = EXCLUDED.paso,
    codigo = COALESCE(EXCLUDED.codigo, public.productos.codigo),
    detalle = COALESCE(EXCLUDED.detalle, public.productos.detalle);

COMMIT;
