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

-- Permisos
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;

drop policy if exists "Permitir acceso publico a clientes" on public.clientes;
create policy "Permitir acceso publico a clientes" on public.clientes for all to anon, authenticated using (true) with check (true);

drop policy if exists "Permitir acceso publico a productos" on public.productos;
drop policy if exists "catalogo_disponible" on public.productos;
create policy "Permitir acceso publico a productos" on public.productos for all to anon, authenticated using (true) with check (true);

drop policy if exists "Permitir acceso publico a pedidos" on public.pedidos;
create policy "Permitir acceso publico a pedidos" on public.pedidos for all to anon, authenticated using (true) with check (true);

-- Realtime
alter table public.pedidos replica identity full;
alter table public.productos replica identity full;

commit;
