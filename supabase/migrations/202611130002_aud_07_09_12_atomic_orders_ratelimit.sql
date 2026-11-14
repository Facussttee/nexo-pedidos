-- AUD-07, AUD-09, AUD-12: Checkout autoritativo e idempotente con bloqueo de catálogo,
-- límites de tasa atómicos fail-closed con reloj de servidor NOW() y concurrencia optimista.

BEGIN;

-- 1. Unicidad para clave de idempotencia de checkout (AUD-07)
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_checkout_cart_key_uidx
    ON public.pedidos (checkout_cart_key)
    WHERE checkout_cart_key IS NOT NULL;

-- 2. Configuración y eventos atómicos de Rate Limiting (AUD-12)
-- Política fail-closed: si falta fila o hay límites <= 0/inválidos se rechaza toda inserción.
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
    id,
    customer_window_seconds, customer_max_orders,
    source_window_seconds, source_max_orders,
    global_window_seconds, global_max_orders
) VALUES (
    1,
    300, 3,
    60, 10,
    60, 30
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.order_rate_limit_events (
    id BIGSERIAL PRIMARY KEY,
    customer_key TEXT NOT NULL,
    source_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_rate_limit_events_created_idx
    ON public.order_rate_limit_events (created_at DESC);

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
            IF v_ip IS NOT NULL THEN
                RETURN 'ip:' || v_ip;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    IF auth.uid() IS NOT NULL THEN
        RETURN 'uid:' || auth.uid()::text;
    END IF;

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
    -- Serializar verificación atómica en entrada de checkout
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

    SELECT COUNT(*), MIN(created_at)
    INTO v_customer_count, v_oldest_ts
    FROM public.order_rate_limit_events
    WHERE customer_key = v_customer_key
      AND created_at >= (NOW() - make_interval(secs => v_cfg.customer_window_seconds));

    IF v_customer_count >= v_cfg.customer_max_orders THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_oldest_ts + make_interval(secs => v_cfg.customer_window_seconds)) - NOW())))::INT);
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Demasiados pedidos recientes. RETRY_AFTER:%', v_retry_after;
    END IF;

    SELECT COUNT(*), MIN(created_at)
    INTO v_source_count, v_oldest_ts
    FROM public.order_rate_limit_events
    WHERE source_key = v_source_key
      AND created_at >= (NOW() - make_interval(secs => v_cfg.source_window_seconds));

    IF v_source_count >= v_cfg.source_max_orders THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_oldest_ts + make_interval(secs => v_cfg.source_window_seconds)) - NOW())))::INT);
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Límite temporal de origen alcanzado. RETRY_AFTER:%', v_retry_after;
    END IF;

    SELECT COUNT(*), MIN(created_at)
    INTO v_global_count, v_oldest_ts
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

-- Trigger de defensa en profundidad en INSERT directo: siempre pisa NEW.fecha con reloj del servidor NOW()
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
        -- Si no pasó ya por create_order_atomic en esta transacción, validar límites
        IF current_setting('nexo.atomic_checkout_rl_checked', true) IS DISTINCT FROM 'on' THEN
            PERFORM public.check_and_record_order_rate_limit(NEW.cliente_telefono);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pedidos_rate_limit ON public.pedidos;
CREATE TRIGGER trigger_pedidos_rate_limit
    BEFORE INSERT ON public.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate_limit();

-- 3. RPC de checkout autoritativo e idempotente (AUD-06 + AUD-07 + AUD-12)
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

    IF v_clean_phone !~ '^[0-9]{8,15}$' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Teléfono de cliente inválido.';
    END IF;
    IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Nombre de cliente inválido.';
    END IF;
    IF v_clean_delivery NOT IN ('RETIRO', 'DELIVERY') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Tipo de entrega inválido.';
    END IF;
    IF v_clean_delivery = 'DELIVERY' AND v_clean_address = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: La dirección de entrega es obligatoria.';
    END IF;
    IF v_clean_delivery = 'RETIRO' AND v_clean_address = '' THEN
        v_clean_address := 'Retiro en Mostrador';
    END IF;
    IF v_clean_key = '' OR char_length(v_clean_key) > 200 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Clave de idempotencia de checkout requerida.';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: El pedido debe contener entre 1 y 100 productos.';
    END IF;

    IF p_tracking_token_hash IS NOT NULL THEN
        IF p_tracking_token_hash !~ '^[0-9a-f]{64}$' THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Hash de token de seguimiento inválido.';
        END IF;
        v_token_hash := p_tracking_token_hash;
    END IF;

    -- Serializar por clave de idempotencia ANTES del control de frecuencia
    PERFORM pg_advisory_xact_lock(hashtext('checkout:' || v_clean_key));

    SELECT jsonb_agg(
        jsonb_build_object(
            'producto_id', trim(COALESCE(el ->> 'producto_id', '')),
            'cantidad', (el ->> 'cantidad')::NUMERIC
        ) ORDER BY trim(COALESCE(el ->> 'producto_id', ''))
    )
    INTO v_canonical_items
    FROM jsonb_array_elements(p_items) AS el;

    v_payload_hash := encode(
        extensions.digest(
            convert_to(
                jsonb_build_object(
                    'telefono', v_clean_phone,
                    'nombre', v_clean_name,
                    'tipo_entrega', v_clean_delivery,
                    'direccion', v_clean_address,
                    'items', v_canonical_items
                )::text,
                'UTF8'
            ),
            'sha256'
        ),
        'hex'
    );

    SELECT * INTO v_existing
    FROM public.pedidos
    WHERE checkout_cart_key = v_clean_key
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
            RAISE EXCEPTION 'CONFLICT: La clave de checkout ya fue utilizada con contenido diferente.';
        END IF;
        RETURN jsonb_build_object(
            'idempotent', TRUE,
            'order', jsonb_build_object(
                'id', v_existing.id,
                'cliente_telefono', v_existing.cliente_telefono,
                'cliente_nombre', v_existing.cliente_nombre,
                'tipo_entrega', v_existing.tipo_entrega,
                'direccion_entrega', v_existing.direccion_entrega,
                'estado', v_existing.estado,
                'total_estimado', v_existing.total_estimado,
                'total_real', v_existing.total_real,
                'items', v_existing.items,
                'checkout_cart_key', v_existing.checkout_cart_key,
                'fecha', v_existing.fecha,
                'version', v_existing.version
            )
        );
    END IF;

    -- Validar límite de tasa atómico con reloj de servidor NOW() antes de crear orden
    PERFORM public.check_and_record_order_rate_limit(v_clean_phone);
    PERFORM set_config('nexo.atomic_checkout_rl_checked', 'on', true);

    -- Validar y cotizar ítem por ítem contra catálogo con FOR SHARE (ignora precios del cliente)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product
        FROM public.productos
        WHERE id = trim(COALESCE(v_elem ->> 'producto_id', ''))
        FOR SHARE;

        IF NOT FOUND OR COALESCE(v_product.archivado, FALSE) = TRUE OR COALESCE(v_product.disponible, FALSE) = FALSE THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Producto no disponible o pausado.';
        END IF;

        v_qty := (v_elem ->> 'cantidad')::NUMERIC;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Cantidad solicitada inválida.';
        END IF;
        IF v_product.unidad_medida = 'UNIDAD' AND v_qty <> FLOOR(v_qty) THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Los productos por unidad requieren cantidad entera.';
        END IF;
        IF ABS((v_qty / v_product.paso) - ROUND(v_qty / v_product.paso)) > 0.0001 THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Cantidad incompatible con el paso del producto.';
        END IF;

        v_subtotal := ROUND(v_qty * v_product.precio);
        v_total_estimado := v_total_estimado + v_subtotal;

        v_server_items := v_server_items || jsonb_build_array(
            jsonb_build_object(
                'producto_id', v_product.id,
                'nombre', v_product.nombre,
                'categoria', v_product.categoria,
                'unidad_medida', v_product.unidad_medida,
                'precio_unitario', v_product.precio,
                'cantidad_solicitada', v_qty,
                'peso_real', CASE WHEN v_product.unidad_medida = 'UNIDAD' THEN v_qty ELSE NULL END,
                'subtotal', v_subtotal,
                'sin_stock', FALSE,
                'confirmado_preparacion', FALSE
            )
        );
    END LOOP;

    IF v_token_hash IS NULL THEN
        v_generated_token := encode(extensions.gen_random_bytes(32), 'hex');
        v_token_hash := public.hash_tracking_token(v_generated_token);
    END IF;

    INSERT INTO public.clientes (telefono, nombre, direccion, updated_at)
    VALUES (v_clean_phone, v_clean_name, v_clean_address, NOW())
    ON CONFLICT (telefono) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        direccion = CASE WHEN EXCLUDED.direccion <> '' THEN EXCLUDED.direccion ELSE public.clientes.direccion END,
        updated_at = NOW();

    INSERT INTO public.pedidos (
        cliente_telefono,
        cliente_nombre,
        tipo_entrega,
        direccion_entrega,
        estado,
        total_estimado,
        total_real,
        items,
        checkout_cart_key,
        payload_hash,
        tracking_token_hash,
        fecha,
        version
    ) VALUES (
        v_clean_phone,
        v_clean_name,
        v_clean_delivery,
        v_clean_address,
        'PENDIENTE',
        v_total_estimado,
        NULL,
        v_server_items,
        v_clean_key,
        v_payload_hash,
        v_token_hash,
        NOW(),
        1
    )
    RETURNING * INTO v_order_row;

    RETURN jsonb_build_object(
        'idempotent', FALSE,
        'tracking_token', v_generated_token,
        'order', jsonb_build_object(
            'id', v_order_row.id,
            'cliente_telefono', v_order_row.cliente_telefono,
            'cliente_nombre', v_order_row.cliente_nombre,
            'tipo_entrega', v_order_row.tipo_entrega,
            'direccion_entrega', v_order_row.direccion_entrega,
            'estado', v_order_row.estado,
            'total_estimado', v_order_row.total_estimado,
            'total_real', v_order_row.total_real,
            'items', v_order_row.items,
            'checkout_cart_key', v_order_row.checkout_cart_key,
            'fecha', v_order_row.fecha,
            'version', v_order_row.version
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. RPCs de preparación y concurrencia optimista para personal activo (AUD-09)
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
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede tomar pedidos.';
    END IF;

    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.';
    END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'CONFLICT: El pedido fue modificado por otro operario (versión actual %).', v_order.version;
    END IF;
    IF v_order.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Sólo se pueden tomar pedidos PENDIENTE (estado actual: %).', v_order.estado;
    END IF;

    UPDATE public.pedidos
    SET estado = 'EN_PREPARACION',
        tomado_por = auth.uid(),
        tomado_at = NOW(),
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_updated;

    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_preparation(
    p_order_id INT,
    p_expected_version INT,
    p_items JSONB,
    p_total_real NUMERIC DEFAULT NULL
)
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
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede preparar pedidos.';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Ítems inválidos.';
    END IF;
    IF p_total_real IS NOT NULL AND p_total_real < 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Total real no puede ser negativo.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item ->> 'precio_unitario')::NUMERIC < 0
           OR (v_item ->> 'cantidad_solicitada')::NUMERIC <= 0
           OR ((v_item ->> 'peso_real') IS NOT NULL AND (v_item ->> 'peso_real')::NUMERIC < 0)
           OR (COALESCE((v_item ->> 'subtotal')::NUMERIC, 0) < 0) THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Ítem con importe o cantidad fuera de rango.';
        END IF;
        v_total_est := v_total_est + ROUND((v_item ->> 'cantidad_solicitada')::NUMERIC * (v_item ->> 'precio_unitario')::NUMERIC);
    END LOOP;

    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.';
    END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'CONFLICT: El pedido fue actualizado simultáneamente (versión actual %).', v_order.version;
    END IF;
    IF v_order.estado NOT IN ('PENDIENTE', 'EN_PREPARACION') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: No se puede editar preparación de pedido en estado %.', v_order.estado;
    END IF;

    UPDATE public.pedidos
    SET items = p_items,
        total_estimado = v_total_est,
        total_real = p_total_real,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_updated;

    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_preparation(
    p_order_id INT,
    p_expected_version INT,
    p_items JSONB
)
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
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede finalizar pedidos.';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: No se puede finalizar un pedido sin ítems.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF NOT COALESCE((v_item ->> 'sin_stock')::BOOLEAN, FALSE) THEN
            IF (v_item ->> 'peso_real') IS NULL OR (v_item ->> 'peso_real')::NUMERIC <= 0 THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Todos los ítems disponibles deben estar preparados.';
            END IF;
            v_total_real := v_total_real + ROUND((v_item ->> 'peso_real')::NUMERIC * (v_item ->> 'precio_unitario')::NUMERIC);
        END IF;
    END LOOP;

    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.';
    END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'CONFLICT: El pedido fue modificado simultáneamente (versión actual %).', v_order.version;
    END IF;
    IF v_order.estado NOT IN ('PENDIENTE', 'EN_PREPARACION') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: El pedido ya se encuentra en estado %.', v_order.estado;
    END IF;

    UPDATE public.pedidos
    SET items = p_items,
        total_real = v_total_real,
        estado = 'LISTO',
        finalizado_at = NOW(),
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_updated;

    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_order_status(
    p_order_id INT,
    p_expected_version INT,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
BEGIN
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede cambiar estados.';
    END IF;

    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.';
    END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'CONFLICT: Conflicto de versión concurrente (actual %).', v_order.version;
    END IF;

    IF p_new_status NOT IN ('EN_PREPARACION', 'ENTREGADO', 'CANCELADO') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Transición no permitida hacia %.', p_new_status;
    END IF;
    IF v_order.estado IN ('LISTO', 'ENTREGADO') AND p_new_status = 'EN_PREPARACION' THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Un pedido finalizado no puede volver a preparación.';
    END IF;
    IF v_order.estado = 'CANCELADO' AND p_new_status <> 'CANCELADO' THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Un pedido cancelado no puede reabrirse.';
    END IF;

    UPDATE public.pedidos
    SET estado = p_new_status,
        cancelado_at = CASE WHEN p_new_status = 'CANCELADO' THEN COALESCE(cancelado_at, NOW()) ELSE cancelado_at END,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_updated;

    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_details_staff(
    p_order_id INT,
    p_expected_version INT,
    p_nombre TEXT,
    p_telefono TEXT,
    p_tipo_entrega TEXT,
    p_direccion_entrega TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_updated RECORD;
    v_clean_phone TEXT;
    v_clean_delivery TEXT;
    v_clean_address TEXT;
BEGIN
    IF NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'FORBIDDEN: Sólo personal activo puede editar datos de entrega.';
    END IF;
    v_clean_phone := regexp_replace(COALESCE(p_telefono, ''), '\D', '', 'g');
    v_clean_delivery := upper(trim(COALESCE(p_tipo_entrega, '')));
    v_clean_address := trim(COALESCE(p_direccion_entrega, ''));
    IF v_clean_phone !~ '^[0-9]{8,15}$' OR char_length(trim(COALESCE(p_nombre, ''))) < 2 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Datos de cliente inválidos.';
    END IF;
    IF v_clean_delivery NOT IN ('RETIRO', 'DELIVERY') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Tipo de entrega inválido.';
    END IF;
    IF v_clean_delivery = 'DELIVERY' AND char_length(v_clean_address) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: La dirección de entrega es obligatoria para envío a domicilio.';
    END IF;

    SELECT * INTO v_order FROM public.pedidos WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Pedido no encontrado.';
    END IF;
    IF v_order.version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'CONFLICT: Conflicto de versión concurrente (actual %).', v_order.version;
    END IF;

    INSERT INTO public.clientes (telefono, nombre, direccion, updated_at)
    VALUES (v_clean_phone, trim(p_nombre), v_clean_address, NOW())
    ON CONFLICT (telefono) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        direccion = CASE WHEN char_length(EXCLUDED.direccion) > 0 THEN EXCLUDED.direccion ELSE public.clientes.direccion END,
        updated_at = NOW();

    UPDATE public.pedidos
    SET cliente_nombre = trim(p_nombre),
        cliente_telefono = v_clean_phone,
        tipo_entrega = v_clean_delivery,
        direccion_entrega = v_clean_address,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_updated;

    RETURN to_jsonb(v_updated) - 'tracking_token_hash';
END;
$$;

REVOKE ALL ON FUNCTION public.take_order(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_preparation(INT, INT, JSONB, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_order_preparation(INT, INT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_status(INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_details_staff(INT, INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.take_order(INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_preparation(INT, INT, JSONB, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_preparation(INT, INT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_order_status(INT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_details_staff(INT, INT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
