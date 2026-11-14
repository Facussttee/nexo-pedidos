-- OBSOLETO: Utilizar supabase/schema.sql (instalación limpia) y supabase/migrations/*.sql.
-- Se retiraron de este archivo el PIN '1234', verify_staff_pin_header() y las políticas USING (true)
-- para impedir despliegues inseguros si alguien ejecuta este archivo heredado.
SELECT 'Usar supabase/schema.sql + supabase/migrations/*' AS aviso_migracion;
