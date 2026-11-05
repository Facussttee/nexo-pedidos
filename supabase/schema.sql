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
END $$;

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
-- 5. PERMISOS Y SEGURIDAD DE FILAS (RLS) PARA PRODUCCION
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso publico a clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir acceso publico a clientes MVP" ON public.clientes;
CREATE POLICY "Permitir acceso publico a clientes"
    ON public.clientes FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso publico a productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir acceso publico a productos MVP" ON public.productos;
DROP POLICY IF EXISTS "catalogo_disponible" ON public.productos;
CREATE POLICY "Permitir acceso publico a productos"
    ON public.productos FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso publico a pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir acceso publico a pedidos MVP" ON public.pedidos;
CREATE POLICY "Permitir acceso publico a pedidos"
    ON public.pedidos FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

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
