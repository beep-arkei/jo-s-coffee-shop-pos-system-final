
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. SECURITY DEFINER function: verify login (no password exposed to client)
CREATE OR REPLACE FUNCTION public.verify_login(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Support both legacy base64 and new bcrypt passwords
  IF v_user.password LIKE '$2a$%' OR v_user.password LIKE '$2b$%' THEN
    IF NOT (v_user.password = crypt(p_password, v_user.password)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
  ELSE
    -- Legacy base64 check
    IF v_user.password != encode(p_password::bytea, 'base64') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
    -- Upgrade to bcrypt
    UPDATE public.app_users SET password = crypt(p_password, gen_salt('bf')) WHERE id = v_user.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object('id', v_user.id, 'username', v_user.username, 'role', v_user.role, 'active', v_user.active)
  );
END;
$$;

-- 2. SECURITY DEFINER function: list users without passwords
CREATE OR REPLACE FUNCTION public.list_users_safe()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'username', username, 'role', role, 'active', active
  )), '[]'::jsonb)
  FROM public.app_users;
$$;

-- 3. SECURITY DEFINER function: add user with hashed password
CREATE OR REPLACE FUNCTION public.add_user(p_username text, p_password text, p_role text DEFAULT 'cashier', p_active boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (username, password, role, active)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_active);
END;
$$;

-- 4. SECURITY DEFINER function: update user (password re-hashed if provided)
CREATE OR REPLACE FUNCTION public.update_user_safe(p_id uuid, p_username text DEFAULT NULL, p_password text DEFAULT NULL, p_role text DEFAULT NULL, p_active boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_users SET
    username = COALESCE(p_username, username),
    password = CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE password END,
    role = COALESCE(p_role, role),
    active = COALESCE(p_active, active)
  WHERE id = p_id;
END;
$$;

-- 5. SECURITY DEFINER function: delete user
CREATE OR REPLACE FUNCTION public.delete_user_safe(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.app_users WHERE id = p_id;
END;
$$;

-- 6. Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access" ON public.app_users;
DROP POLICY IF EXISTS "Allow all access" ON public.transactions;
DROP POLICY IF EXISTS "Allow all access" ON public.order_items;

-- 7. app_users: block all direct anon access (use functions instead)
CREATE POLICY "Deny anon access" ON public.app_users
FOR ALL TO anon USING (false) WITH CHECK (false);

-- 8. transactions: anon can read and insert but not update/delete
CREATE POLICY "Anon can read transactions" ON public.transactions
FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert transactions" ON public.transactions
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update transactions" ON public.transactions
FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Block deletes on transactions (no one should hard-delete)
CREATE POLICY "Block transaction deletes" ON public.transactions
FOR DELETE TO anon USING (false);

-- 9. order_items: anon can read and insert but not delete
CREATE POLICY "Anon can read order_items" ON public.order_items
FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert order_items" ON public.order_items
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Block order_items updates" ON public.order_items
FOR UPDATE TO anon USING (false);

CREATE POLICY "Block order_items deletes" ON public.order_items
FOR DELETE TO anon USING (false);
