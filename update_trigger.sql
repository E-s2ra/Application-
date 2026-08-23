CREATE OR REPLACE FUNCTION enforce_approved_admin_role() RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.id AND lower(email) IN ('admin@aniflix.com', 'admin2@aniflix.com', 'docker_admin@aniflix.com')
  ) THEN
    NEW.role := 'user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
