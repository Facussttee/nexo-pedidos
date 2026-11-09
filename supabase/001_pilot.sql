-- Nexo Pedidos. Script de Base de Datos y Tiempo Real
-- Habilita clientes, productos y pedidos con sincronización en tiempo real y RLS abierto para el comercio.
begin;

CREATE TABLE IF NOT EXISTS public.clientes (
    telefono VARCHAR(25) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    direccion VARCHAR(250) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    notificado_whatsapp BOOLEAN DEFAULT FALSE,
    notificado_at TIMESTAMPTZ,
    cancelado_at TIMESTAMPTZ,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 5.2 Función para verificar el PIN de Staff enviado en la cabecera x-nexo-staff-pin
CREATE OR REPLACE FUNCTION public.verify_staff_pin_header()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    req_headers TEXT;
    req_pin TEXT;
    expected_pin TEXT;
BEGIN
    req_headers := current_setting('request.headers', true);
    IF req_headers IS NULL OR req_headers = '' THEN
        RETURN FALSE;
    END IF;
    req_pin := COALESCE((req_headers::json ->> 'x-nexo-staff-pin'), '');
    IF req_pin = '' THEN
        RETURN FALSE;
    END IF;
    SELECT value INTO expected_pin FROM public.nexo_secrets WHERE key = 'staff_pin';
    RETURN expected_pin IS NOT NULL AND req_pin = expected_pin;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

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

-- CLIENTES: Teléfono numérico válido, longitudes acotadas, borrado prohibido
DROP POLICY IF EXISTS "Permitir acceso publico a clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir acceso publico a clientes MVP" ON public.clientes;
DROP POLICY IF EXISTS "clientes_read_public" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_valid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_valid" ON public.clientes;

CREATE POLICY "clientes_read_public"
    ON public.clientes FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "clientes_insert_valid"
    ON public.clientes FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        telefono ~ '^[0-9]{8,15}$'
        AND char_length(nombre) >= 2 AND char_length(nombre) <= 120
        AND char_length(COALESCE(direccion, '')) <= 250
    );

CREATE POLICY "clientes_update_valid"
    ON public.clientes FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (
        telefono ~ '^[0-9]{8,15}$'
        AND char_length(nombre) >= 2 AND char_length(nombre) <= 120
        AND char_length(COALESCE(direccion, '')) <= 250
    );

-- PEDIDOS: Creación y actualización protegidas, importes válidos, items JSONB acotados, borrado prohibido
DROP POLICY IF EXISTS "Permitir acceso publico a pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir acceso publico a pedidos MVP" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_read_public" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_valid" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_valid" ON public.pedidos;

CREATE POLICY "pedidos_read_public"
    ON public.pedidos FOR SELECT
    TO anon, authenticated
    USING (true);

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

CREATE POLICY "pedidos_update_valid"
    ON public.pedidos FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (
        total_estimado >= 0
        AND (total_real IS NULL OR total_real >= 0)
        AND jsonb_typeof(items) = 'array'
        AND octet_length(items::text) <= 65536
    );

-- Realtime
alter table public.pedidos replica identity full;
alter table public.productos replica identity full;

commit;
