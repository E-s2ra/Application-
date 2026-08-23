CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    JOIN auth.users ON auth.users.id = profiles.id
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND lower(auth.users.email) IN ('admin@aniflix.com', 'admin2@aniflix.com', 'docker_admin@aniflix.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
