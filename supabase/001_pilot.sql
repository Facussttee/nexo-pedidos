-- Nexo Pedidos. Aplicar únicamente en una base piloto nueva.
-- Los pedidos y clientes se reservan al backend hasta incorporar Auth y permisos por rol.
begin;
CREATE TABLE public.clientes (
    telefono VARCHAR(25) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    direccion VARCHAR(250) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE PRODUCTOS (CATÁLOGO Y PRECIOS DEL DÍA)
CREATE TABLE public.productos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Frutas', 'Verduras', 'Hojas Verdes', 'Almacén')),
    unidad_medida VARCHAR(15) NOT NULL CHECK (unidad_medida IN ('KG', 'UNIDAD')),
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    disponible BOOLEAN DEFAULT TRUE,
    paso NUMERIC(5, 2) DEFAULT 0.5,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PEDIDOS (CABECERA Y KANBAN DE MOSTRADOR)
CREATE TABLE public.pedidos (
    id SERIAL PRIMARY KEY,
    cliente_telefono VARCHAR(25) REFERENCES public.clientes(telefono) ON UPDATE CASCADE,
    cliente_nombre VARCHAR(120) NOT NULL,
    tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'RETIRO' CHECK (tipo_entrega IN ('RETIRO', 'DELIVERY')),
    direccion_entrega TEXT DEFAULT 'Retiro en Mostrador',
    estado VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO')),
    total_estimado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_real NUMERIC(10, 2),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notificado_whatsapp BOOLEAN DEFAULT FALSE,
    notificado_at TIMESTAMPTZ,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;

revoke all on public.productos, public.clientes, public.pedidos from public, anon, authenticated;
revoke all on sequence public.pedidos_id_seq from public, anon, authenticated;

grant select on public.productos to anon, authenticated;
create policy catalogo_disponible on public.productos
    for select to anon, authenticated using (disponible is true);

grant select, insert, update on public.productos, public.clientes, public.pedidos to service_role;
grant usage on sequence public.pedidos_id_seq to service_role;

commit;
