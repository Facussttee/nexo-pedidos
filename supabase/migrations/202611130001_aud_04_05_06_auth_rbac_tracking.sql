-- AUD-04, AUD-05, AUD-06: Autenticación individual de personal (Supabase Auth),
-- RBAC granular (owner/operator/anon) y seguimiento privado por token SHA-256.
-- Reemplaza PIN compartido '1234', verify_staff_pin_header y políticas USING (true).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Retirar PIN compartido estático de autenticación/autorización de API
DROP POLICY IF EXISTS "productos_write_staff" ON public.productos;
DROP FUNCTION IF EXISTS public.verify_staff_pin_header();
DELETE FROM public.nexo_secrets WHERE key = 'staff_pin';
REVOKE ALL ON TABLE public.nexo_secrets FROM PUBLIC, anon, authenticated;

-- 2. Tabla de membresías activas de personal vinculadas a Supabase Auth (AUD-04)
-- Sin alta pública: sólo service_role o un dueño activo puede crear/editar membresías.
CREATE TABLE IF NOT EXISTS public.staff_members (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'operator')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE public.staff_members FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_members TO authenticated;
GRANT ALL ON TABLE public.staff_members TO service_role;

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

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_owner() TO anon, authenticated, service_role;

-- 3. Seguimiento privado por token opaco (AUD-06): nunca se guarda token plano en DB
ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS tracking_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS tracking_token_revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    ADD COLUMN IF NOT EXISTS tomado_por UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS tomado_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payload_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_tracking_token_hash_uidx
    ON public.pedidos (tracking_token_hash)
    WHERE tracking_token_hash IS NOT NULL;

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

-- Consulta pública restringida estrictamente al pedido cuyo SHA-256(p_token) coincide y no está revocado.
-- Token inválido, inexistente o revocado devuelve 0 filas de forma indistinguible.
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
        p.id,
        p.cliente_nombre,
        p.tipo_entrega,
        p.direccion_entrega,
        p.estado,
        p.total_estimado,
        p.total_real,
        p.items,
        p.fecha,
        p.finalizado_at,
        p.cancelado_at,
        p.version
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
    SET tracking_token_revoked_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
      AND tracking_token_revoked_at IS NULL;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_by_tracking_token(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_token(INT, TEXT) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_order_tracking_token(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_order_tracking_token(INT) TO authenticated, service_role;

-- 4. Políticas RLS estrictas por rol (AUD-05)
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Retirar privilegios directos de escritura/lectura abierta a anon en tablas sensibles
REVOKE INSERT, UPDATE, DELETE ON public.clientes FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.pedidos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.productos FROM anon;
REVOKE SELECT ON public.clientes FROM anon;

-- STAFF_MEMBERS: usuario ve su propia fila; sólo owner activo gestiona membresías
DROP POLICY IF EXISTS "staff_read_self_or_owner" ON public.staff_members;
DROP POLICY IF EXISTS "staff_owner_manage" ON public.staff_members;

CREATE POLICY "staff_read_self_or_owner"
    ON public.staff_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_active_owner());

CREATE POLICY "staff_owner_manage"
    ON public.staff_members FOR ALL
    TO authenticated
    USING (public.is_active_owner())
    WITH CHECK (public.is_active_owner());

-- PRODUCTOS: anon lee sólo catálogo publicable (no archivado); personal activo lee todo; sólo owner modifica
DROP POLICY IF EXISTS "productos_read_public" ON public.productos;
DROP POLICY IF EXISTS "productos_read_anon_publishable" ON public.productos;
DROP POLICY IF EXISTS "productos_read_staff_all" ON public.productos;
DROP POLICY IF EXISTS "productos_owner_insert" ON public.productos;
DROP POLICY IF EXISTS "productos_owner_update" ON public.productos;

CREATE POLICY "productos_read_anon_publishable"
    ON public.productos FOR SELECT
    TO anon
    USING (COALESCE(archivado, FALSE) = FALSE);

CREATE POLICY "productos_read_staff_all"
    ON public.productos FOR SELECT
    TO authenticated
    USING (COALESCE(archivado, FALSE) = FALSE OR public.is_active_staff());

CREATE POLICY "productos_owner_insert"
    ON public.productos FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_owner());

CREATE POLICY "productos_owner_update"
    ON public.productos FOR UPDATE
    TO authenticated
    USING (public.is_active_owner())
    WITH CHECK (public.is_active_owner());

-- CLIENTES: cero acceso para anon; lectura y actualización sólo personal activo
DROP POLICY IF EXISTS "clientes_read_public" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_valid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_valid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_staff_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_staff_update" ON public.clientes;

CREATE POLICY "clientes_staff_select"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "clientes_staff_update"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (public.is_active_staff())
    WITH CHECK (
        public.is_active_staff()
        AND telefono ~ '^[0-9]{8,15}$'
        AND char_length(nombre) >= 2 AND char_length(nombre) <= 120
        AND char_length(COALESCE(direccion, '')) <= 250
    );

-- PEDIDOS: cero lectura/escritura directa para anon (Realtime también queda restringido por SELECT RLS)
DROP POLICY IF EXISTS "pedidos_read_public" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_valid" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_valid" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_staff_select" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_staff_update" ON public.pedidos;

CREATE POLICY "pedidos_staff_select"
    ON public.pedidos FOR SELECT
    TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "pedidos_staff_update"
    ON public.pedidos FOR UPDATE
    TO authenticated
    USING (public.is_active_staff())
    WITH CHECK (
        public.is_active_staff()
        AND total_estimado >= 0
        AND (total_real IS NULL OR total_real >= 0)
        AND jsonb_typeof(items) = 'array'
        AND octet_length(items::text) <= 65536
    );

COMMIT;
