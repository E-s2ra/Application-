-- =============================================================================
-- Lock down raw media locators
-- =============================================================================
-- A table-level SELECT grant overrides attempts to hide individual columns.
-- Keep catalog metadata client-readable while video locators remain server-only.

REVOKE SELECT ON TABLE public.anime FROM anon, authenticated;

GRANT SELECT (
  id,
  title,
  description,
  image_url,
  episodes,
  genre,
  category,
  is_featured,
  created_at,
  updated_at,
  views,
  rating,
  published_at
)
ON TABLE public.anime TO anon, authenticated;

-- Media mutations are routed through the admin-operations Edge Function, which
-- verifies admin access and uses the service role. Do not let the shared
-- authenticated database role write private locators directly.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.anime FROM anon, authenticated;

GRANT ALL ON TABLE public.anime TO service_role;

-- Replace legacy permissive policies. Client roles still have no write grants,
-- and these policies add defense in depth if grants are changed later.
DROP POLICY IF EXISTS "anime_admin_only_insert" ON public.anime;
DROP POLICY IF EXISTS "anime_admin_only_update" ON public.anime;
DROP POLICY IF EXISTS "anime_admin_only_delete" ON public.anime;

CREATE POLICY "anime_admin_only_insert"
  ON public.anime FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "anime_admin_only_update"
  ON public.anime FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "anime_admin_only_delete"
  ON public.anime FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Old catalog-admin SECURITY DEFINER helpers were once granted to public client
-- roles without an authorization check. They are not required by the current
-- app; if an older project still has them, make them service-role-only.
DO $$
BEGIN
  IF to_regprocedure('public.admin_delete_anime(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_delete_anime(text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_delete_anime(text) TO service_role';
  END IF;

  IF to_regprocedure('public.admin_toggle_featured(text,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_toggle_featured(text,boolean) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_toggle_featured(text,boolean) TO service_role';
  END IF;
END;
$$;
