-- =============================================================================
-- NEXO PEDIDOS - SCRIPT COMPLETO DE BASE DE DATOS Y TIEMPO REAL (SUPABASE / POSTGRESQL)
-- =============================================================================
-- Instrucciones de despliegue para producción:
-- 1. Creá un proyecto en https://supabase.com
-- 2. Andá al menú lateral -> "SQL Editor" -> "New query"
-- 3. Pegá todo este script y presioná "Run"
-- 4. Copiá tu Project URL y tu anon / publishable key desde Project Settings -> API
-- 5. Configuralas en js/public-config.js (o variables de entorno en Vercel)
-- =============================================================================

-- 1. TABLA DE CLIENTES
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

-- Si la tabla ya existía en un esquema previo, agregar columnas faltantes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'codigo') THEN
        ALTER TABLE public.productos ADD COLUMN codigo VARCHAR(50) DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'detalle') THEN
        ALTER TABLE public.productos ADD COLUMN detalle TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'archivado') THEN
        ALTER TABLE public.productos ADD COLUMN archivado BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'imagen_id') THEN
        ALTER TABLE public.productos ADD COLUMN imagen_id VARCHAR(100) DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'created_at') THEN
        ALTER TABLE public.productos ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. TABLA DE PEDIDOS (CABECERA, DETALLE JSONB Y KANBAN DE MOSTRADOR)
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
    checkout_cart_key VARCHAR(100),
    version INT NOT NULL DEFAULT 1,
    tomado_por VARCHAR(60) DEFAULT NULL,
    notificado_whatsapp BOOLEAN DEFAULT FALSE,
    notificado_at TIMESTAMPTZ,
    cancelado_at TIMESTAMPTZ,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la tabla ya existía en un esquema previo, agregar columnas faltantes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'checkout_cart_key') THEN
        ALTER TABLE public.pedidos ADD COLUMN checkout_cart_key VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'cancelado_at') THEN
        ALTER TABLE public.pedidos ADD COLUMN cancelado_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'version') THEN
        ALTER TABLE public.pedidos ADD COLUMN version INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'tomado_por') THEN
        ALTER TABLE public.pedidos ADD COLUMN tomado_por VARCHAR(60) DEFAULT NULL;
    END IF;
END $$;

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tomado_por VARCHAR(60) DEFAULT NULL;

-- Iniciar secuencia de pedidos en 101 si está en valor inferior
SELECT setval(
    pg_get_serial_sequence('public.pedidos', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM public.pedidos), 100), 100)
);

-- Índices de consulta y rendimiento
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_tel ON public.pedidos(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_disponible ON public.productos(disponible);
CREATE INDEX IF NOT EXISTS idx_productos_archivado ON public.productos(archivado);

-- =============================================================================
-- 4. FUNCION Y TRIGGERS PARA AUTO-ACTUALIZAR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON public.clientes;
CREATE TRIGGER trigger_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_productos_updated_at ON public.productos;
CREATE TRIGGER trigger_productos_updated_at
    BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trigger_pedidos_updated_at
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- =============================================================================
-- =============================================================================
-- 5. PERMISOS, TABLA DE SECRETOS Y SEGURIDAD DE FILAS (RLS) PARA PRODUCCION
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.clientes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.productos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Permisos completos de servidor para service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 5.1 Tabla de Secretos del Comercio (Inaccesible desde API pública anon/authenticated)
CREATE TABLE IF NOT EXISTS public.nexo_secrets (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);
REVOKE ALL ON TABLE public.nexo_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nexo_secrets TO service_role;

INSERT INTO public.nexo_secrets (key, value)
VALUES ('staff_pin', '1234')
ON CONFLICT (key) DO NOTHING;

-- 5.2 Funciones de Autenticación por Cabecera y Actualización de PIN
CREATE OR REPLACE FUNCTION public.get_request_header(header_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    req_headers TEXT;
    val TEXT;
BEGIN
    req_headers := current_setting('request.headers', true);
    IF req_headers IS NULL OR req_headers = '' THEN
        RETURN NULL;
    END IF;
    val := req_headers::json ->> lower(header_name);
    RETURN NULLIF(TRIM(val), '');
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_staff_pin_header()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    req_pin TEXT;
    expected_pin TEXT;
BEGIN
    req_pin := public.get_request_header('x-nexo-staff-pin');
    IF req_pin IS NULL OR req_pin = '' THEN
        RETURN FALSE;
    END IF;
    SELECT value INTO expected_pin FROM public.nexo_secrets WHERE key = 'staff_pin';
    RETURN expected_pin IS NOT NULL AND req_pin = expected_pin;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_pin(old_pin TEXT, new_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_pin TEXT;
    clean_old TEXT;
    clean_new TEXT;
BEGIN
    clean_old := TRIM(COALESCE(old_pin, ''));
    clean_new := TRIM(COALESCE(new_pin, ''));

    -- 1. Validar PIN actual contra nexo_secrets (con bloqueo exclusivo de fila para prevenir carreras)
    SELECT value INTO current_pin FROM public.nexo_secrets WHERE key = 'staff_pin' FOR UPDATE;
    IF current_pin IS NULL OR clean_old <> current_pin THEN
        RAISE EXCEPTION 'PIN actual incorrecto';
    END IF;

    -- 2. Validar formato numérico de 4 a 8 dígitos
    IF clean_new !~ '^[0-9]{4,8}$' THEN
        RAISE EXCEPTION 'El nuevo PIN debe ser numérico de 4 a 8 dígitos';
    END IF;

    -- 3. Validar que no sea idéntico al actual
    IF clean_new = clean_old THEN
        RAISE EXCEPTION 'El nuevo PIN no puede ser igual al actual';
    END IF;

    -- 4. Actualizar secreto
    UPDATE public.nexo_secrets
    SET value = clean_new
    WHERE key = 'staff_pin';

    RETURN jsonb_build_object('ok', true, 'message', 'PIN actualizado con éxito');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_request_header(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin_header() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_staff_pin(TEXT, TEXT) TO anon, authenticated, service_role;

-- 5.3 Checkout Autoritativo en Servidor y Creación Atómica de Pedidos (V2-02)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_cliente_telefono TEXT,
    p_cliente_nombre TEXT,
    p_cliente_direccion TEXT,
    p_tipo_entrega TEXT,
    p_direccion_entrega TEXT,
    p_items JSONB,
    p_checkout_cart_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cliente_telefono TEXT;
    v_cliente_nombre TEXT;
    v_cliente_direccion TEXT;
    v_tipo_entrega TEXT;
    v_direccion_entrega TEXT;
    v_clean_cart_key TEXT;
    v_existing_pedido RECORD;
    v_item JSONB;
    v_product RECORD;
    v_item_id TEXT;
    v_item_cantidad NUMERIC;
    v_item_precio NUMERIC;
    v_item_subtotal NUMERIC;
    v_total_estimado NUMERIC := 0;
    v_verified_items JSONB := '[]'::jsonb;
    v_new_item JSONB;
    v_new_pedido RECORD;
BEGIN
    -- 1. Sanitización de entradas
    v_cliente_telefono := NULLIF(REGEXP_REPLACE(COALESCE(p_cliente_telefono, ''), '\D', '', 'g'), '');
    IF v_cliente_telefono IS NULL OR length(v_cliente_telefono) < 8 THEN
        RAISE EXCEPTION 'Teléfono del cliente es requerido (mínimo 8 dígitos)';
    END IF;

    v_cliente_nombre := TRIM(COALESCE(p_cliente_nombre, ''));
    IF v_cliente_nombre = '' THEN
        RAISE EXCEPTION 'Nombre del cliente es requerido';
    END IF;

    v_tipo_entrega := UPPER(TRIM(COALESCE(p_tipo_entrega, 'RETIRO')));
    IF v_tipo_entrega NOT IN ('RETIRO', 'DELIVERY') THEN
        RAISE EXCEPTION 'Tipo de entrega no válido: %', v_tipo_entrega;
    END IF;

    v_direccion_entrega := TRIM(COALESCE(p_direccion_entrega, ''));
    IF v_tipo_entrega = 'DELIVERY' AND v_direccion_entrega = '' THEN
        RAISE EXCEPTION 'Dirección de entrega requerida para delivery';
    END IF;
    IF v_tipo_entrega = 'RETIRO' AND v_direccion_entrega = '' THEN
        v_direccion_entrega := 'Retiro en Mostrador';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    IF jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'El pedido no puede exceder 100 ítems';
    END IF;

    v_clean_cart_key := NULLIF(TRIM(COALESCE(p_checkout_cart_key, '')), '');

    -- 2. Idempotencia: Si p_checkout_cart_key existe para este p_cliente_telefono, retornar fila existente
    IF v_clean_cart_key IS NOT NULL THEN
        SELECT * INTO v_existing_pedido
        FROM public.pedidos
        WHERE checkout_cart_key = v_clean_cart_key
          AND cliente_telefono = v_cliente_telefono
        ORDER BY id DESC
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'ok', true,
                'replayed', true,
                'pedido', row_to_json(v_existing_pedido)
            );
        END IF;
    END IF;

    -- 3. Upsert del cliente
    v_cliente_direccion := NULLIF(TRIM(COALESCE(p_cliente_direccion, '')), '');
    INSERT INTO public.clientes (telefono, nombre, direccion, updated_at)
    VALUES (
        v_cliente_telefono,
        v_cliente_nombre,
        COALESCE(v_cliente_direccion, 'No especificada'),
        NOW()
    )
    ON CONFLICT (telefono) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        direccion = COALESCE(EXCLUDED.direccion, public.clientes.direccion),
        updated_at = NOW();

    -- 4. Bucle de Precios y Disponibilidad (Authoritative Pricing & Availability)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := NULLIF(TRIM(COALESCE(v_item ->> 'id', v_item ->> 'producto_id', '')), '');
        IF v_item_id IS NULL THEN
            RAISE EXCEPTION 'ID de producto inválido';
        END IF;

        v_item_cantidad := (COALESCE(v_item ->> 'cantidad', v_item ->> 'cantidad_solicitada'))::numeric;
        IF v_item_cantidad IS NULL OR v_item_cantidad <= 0 THEN
            RAISE EXCEPTION 'Cantidad debe ser mayor a 0 para el producto: %', v_item_id;
        END IF;

        -- Bloqueo FOR SHARE del producto en catálogo para evitar carreras de modificación concurrente
        SELECT * INTO v_product
        FROM public.productos
        WHERE id = v_item_id
        FOR SHARE;

        IF NOT FOUND OR v_product.archivado IS TRUE OR v_product.disponible IS FALSE THEN
            RAISE EXCEPTION 'Producto no disponible: %', v_item_id;
        END IF;

        -- Validación de cantidades enteras para unidades y conformidad de paso
        IF v_product.unidad_medida = 'UNIDAD' AND v_item_cantidad <> floor(v_item_cantidad) THEN
            RAISE EXCEPTION 'Los productos unitarios requieren cantidades enteras: %', v_item_id;
        END IF;

        IF v_product.paso IS NOT NULL AND v_product.paso > 0 THEN
            IF round(v_item_cantidad / v_product.paso, 6) <> round(v_item_cantidad / v_product.paso, 0) THEN
                RAISE EXCEPTION 'La cantidad % no respeta el paso % para el producto: %', v_item_cantidad, v_product.paso, v_item_id;
            END IF;
        END IF;

        -- Precio autoritativo ignorando el precio enviado por el cliente
        v_item_precio := v_product.precio;
        v_item_subtotal := round(v_item_cantidad * v_item_precio);
        v_total_estimado := v_total_estimado + v_item_subtotal;

        -- Construcción del ítem validado
        v_new_item := jsonb_build_object(
            'id', v_product.id,
            'producto_id', v_product.id,
            'nombre', v_product.nombre,
            'categoria', v_product.categoria,
            'unidad_medida', v_product.unidad_medida,
            'precio', v_item_precio,
            'precio_unitario', v_item_precio,
            'cantidad', v_item_cantidad,
            'cantidad_solicitada', v_item_cantidad,
            'paso', v_product.paso,
            'codigo', v_product.codigo,
            'peso_real', CASE WHEN v_product.unidad_medida = 'UNIDAD' THEN v_item_cantidad ELSE NULL END,
            'subtotal', v_item_subtotal,
            'subtotal_estimado', v_item_subtotal,
            'sin_stock', false,
            'confirmado_preparacion', false
        );
        v_verified_items := v_verified_items || jsonb_build_array(v_new_item);
    END LOOP;

    -- 5. Inserción del pedido con estado PENDIENTE y version = 1
    INSERT INTO public.pedidos (
        cliente_telefono,
        cliente_nombre,
        tipo_entrega,
        direccion_entrega,
        estado,
        total_estimado,
        items,
        checkout_cart_key,
        version
    ) VALUES (
        v_cliente_telefono,
        v_cliente_nombre,
        v_tipo_entrega,
        v_direccion_entrega,
        'PENDIENTE',
        v_total_estimado,
        v_verified_items,
        v_clean_cart_key,
        1
    )
    RETURNING * INTO v_new_pedido;

    -- 6. Respuesta atómica
    RETURN jsonb_build_object(
        'ok', true,
        'replayed', false,
        'pedido', row_to_json(v_new_pedido)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

-- 5.3 Control de Inundación de Pedidos (Rate Limiting en Base de Datos)
CREATE OR REPLACE FUNCTION public.enforce_order_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_customer_count INT;
    recent_global_count INT;
BEGIN
    -- Máximo 3 pedidos cada 5 minutos para un mismo teléfono
    IF NEW.cliente_telefono IS NOT NULL AND NEW.cliente_telefono <> '' THEN
        SELECT COUNT(*) INTO recent_customer_count
        FROM public.pedidos
        WHERE cliente_telefono = NEW.cliente_telefono
          AND fecha >= (NOW() - INTERVAL '5 minutes');
        IF recent_customer_count >= 3 THEN
            RAISE EXCEPTION 'Demasiados pedidos recientes para este teléfono. Por favor esperá unos minutos.';
        END IF;
    END IF;

    -- Máximo 30 pedidos por minuto en todo el local
    SELECT COUNT(*) INTO recent_global_count
    FROM public.pedidos
    WHERE fecha >= (NOW() - INTERVAL '1 minute');
    IF recent_global_count >= 30 THEN
        RAISE EXCEPTION 'Alta demanda en el comercio. Por favor intentá nuevamente en un momento.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pedidos_rate_limit ON public.pedidos;
CREATE TRIGGER trigger_pedidos_rate_limit
    BEFORE INSERT ON public.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate_limit();

-- 5.4 Políticas RLS Granulares
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- PRODUCTOS: Lectura pública; edición y alta sólo con PIN de Staff verificado; borrado prohibido
DROP POLICY IF EXISTS "Permitir acceso publico a productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir acceso publico a productos MVP" ON public.productos;
DROP POLICY IF EXISTS "catalogo_disponible" ON public.productos;
DROP POLICY IF EXISTS "productos_read_public" ON public.productos;
DROP POLICY IF EXISTS "productos_write_staff" ON public.productos;

CREATE POLICY "productos_read_public"
    ON public.productos FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "productos_write_staff"
    ON public.productos FOR ALL
    TO anon, authenticated
    USING (public.verify_staff_pin_header())
    WITH CHECK (public.verify_staff_pin_header());

-- CLIENTES: Acceso restringido por PIN de Staff o teléfono de cliente autenticado vía cabecera
DROP POLICY IF EXISTS "Permitir acceso publico a clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir acceso publico a clientes MVP" ON public.clientes;
DROP POLICY IF EXISTS "clientes_read_public" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_valid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_valid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_restricted" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_restricted" ON public.clientes;

CREATE POLICY "clientes_select_restricted"
    ON public.clientes FOR SELECT
    TO anon, authenticated
    USING (
        public.verify_staff_pin_header()
        OR (
            public.get_request_header('x-nexo-client-phone') IS NOT NULL
            AND telefono = public.get_request_header('x-nexo-client-phone')
        )
    );

CREATE POLICY "clientes_insert_valid"
    ON public.clientes FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        telefono ~ '^[0-9]{8,15}$'
        AND char_length(nombre) >= 2 AND char_length(nombre) <= 120
        AND char_length(COALESCE(direccion, '')) <= 250
    );

CREATE POLICY "clientes_update_restricted"
    ON public.clientes FOR UPDATE
    TO anon, authenticated
    USING (
        public.verify_staff_pin_header()
        OR (
            public.get_request_header('x-nexo-client-phone') IS NOT NULL
            AND telefono = public.get_request_header('x-nexo-client-phone')
        )
    )
    WITH CHECK (
        (
            public.verify_staff_pin_header()
            OR (
                public.get_request_header('x-nexo-client-phone') IS NOT NULL
                AND telefono = public.get_request_header('x-nexo-client-phone')
            )
        )
        AND telefono ~ '^[0-9]{8,15}$'
        AND char_length(nombre) >= 2 AND char_length(nombre) <= 120
        AND char_length(COALESCE(direccion, '')) <= 250
    );

-- PEDIDOS: Creación estructurada, consulta y actualización restringidas
DROP POLICY IF EXISTS "Permitir acceso publico a pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir acceso publico a pedidos MVP" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_read_public" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_valid" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_valid" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_select_restricted" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_restricted" ON public.pedidos;

CREATE POLICY "pedidos_select_restricted"
    ON public.pedidos FOR SELECT
    TO anon, authenticated
    USING (
        public.verify_staff_pin_header()
        OR (
            public.get_request_header('x-nexo-client-phone') IS NOT NULL
            AND cliente_telefono = public.get_request_header('x-nexo-client-phone')
        )
    );

CREATE POLICY "pedidos_insert_valid"
    ON public.pedidos FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        total_estimado >= 0
        AND (total_real IS NULL OR total_real >= 0)
        AND jsonb_typeof(items) = 'array'
        AND jsonb_array_length(items) >= 1
        AND jsonb_array_length(items) <= 100
        AND octet_length(items::text) <= 65536
    );

CREATE POLICY "pedidos_update_restricted"
    ON public.pedidos FOR UPDATE
    TO anon, authenticated
    USING (
        public.verify_staff_pin_header()
        OR (
            public.get_request_header('x-nexo-client-phone') IS NOT NULL
            AND cliente_telefono = public.get_request_header('x-nexo-client-phone')
            AND estado IN ('PENDIENTE', 'EN_PREPARACION')
        )
    )
    WITH CHECK (
        total_estimado >= 0
        AND (total_real IS NULL OR total_real >= 0)
        AND jsonb_typeof(items) = 'array'
        AND octet_length(items::text) <= 65536
        AND (
            public.verify_staff_pin_header()
            OR (
                public.get_request_header('x-nexo-client-phone') IS NOT NULL
                AND cliente_telefono = public.get_request_header('x-nexo-client-phone')
                AND estado = 'CANCELADO'
            )
        )
    );

-- =============================================================================
-- 6. HABILITAR WEBSOCKETS EN TIEMPO REAL (SUPABASE REALTIME)
-- =============================================================================
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.productos REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'productos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
    END IF;
END $$;

-- =============================================================================
-- 7. SEMILLA INICIAL DE PRODUCTOS (17 PRODUCTOS BASE)
-- =============================================================================
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
