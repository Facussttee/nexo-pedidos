-- Fixture administrativo sintético para entornos locales descartables (AUD-04)
-- Reemplazar con UUID real generado por Supabase Auth Admin API (service_role) en entorno descartable.
-- NUNCA habilitar alta pública desde el cliente.

INSERT INTO public.staff_members (user_id, email, role, active)
VALUES (
    '00000000-0000-4000-8000-000000000001'::uuid,
    'owner-sintetico@nexo.local',
    'owner',
    TRUE
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'owner', active = TRUE, updated_at = NOW();
