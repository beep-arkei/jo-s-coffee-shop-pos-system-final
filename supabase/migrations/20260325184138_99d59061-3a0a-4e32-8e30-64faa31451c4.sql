
CREATE OR REPLACE FUNCTION public.verify_login(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT id, username, role, active, password
  INTO v_user
  FROM public.app_users
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
  END IF;

  IF NOT v_user.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is inactive');
  END IF;

  IF v_user.password LIKE '$2a$%' OR v_user.password LIKE '$2b$%' THEN
    IF NOT (v_user.password = extensions.crypt(p_password, v_user.password)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
  ELSE
    IF v_user.password != encode(p_password::bytea, 'base64') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
    UPDATE public.app_users SET password = extensions.crypt(p_password, extensions.gen_salt('bf')) WHERE id = v_user.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object('id', v_user.id, 'username', v_user.username, 'role', v_user.role, 'active', v_user.active)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_user(p_username text, p_password text, p_role text DEFAULT 'cashier', p_active boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.app_users (username, password, role, active)
  VALUES (p_username, extensions.crypt(p_password, extensions.gen_salt('bf')), p_role, p_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_safe(p_id uuid, p_username text DEFAULT NULL, p_password text DEFAULT NULL, p_role text DEFAULT NULL, p_active boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.app_users SET
    username = COALESCE(p_username, username),
    password = CASE WHEN p_password IS NOT NULL THEN extensions.crypt(p_password, extensions.gen_salt('bf')) ELSE password END,
    role = COALESCE(p_role, role),
    active = COALESCE(p_active, active)
  WHERE id = p_id;
END;
$$;
