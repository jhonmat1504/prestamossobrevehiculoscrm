
-- handle_new_user solo la llama el trigger de auth (sistema), nadie más
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- update_updated_at_column solo la llaman triggers
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- has_role se llama desde políticas RLS (que corren como authenticated), no desde anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
