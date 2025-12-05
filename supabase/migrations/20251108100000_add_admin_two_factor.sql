/*
  # Add admin two-factor authentication support

  - Adds 2FA metadata to admin_users
  - Adds login challenge tracking table
  - Provides helper functions for Base32, TOTP validation, and recovery code handling
  - Updates admin_login RPC to require OTP when enabled and introduces admin_verify_two_factor
  - Adds RPCs to manage 2FA enrollment lifecycle
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret text,
  ADD COLUMN IF NOT EXISTS two_factor_recovery_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS two_factor_temp_secret text,
  ADD COLUMN IF NOT EXISTS two_factor_temp_recovery_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS two_factor_confirmed_at timestamptz;

CREATE TABLE IF NOT EXISTS admin_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE OR REPLACE FUNCTION base32_encode(input bytea)
RETURNS text AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  output text := '';
  buffer bigint := 0;
  bits integer := 0;
  byte_value integer;
  i integer;
BEGIN
  IF input IS NULL OR length(input) = 0 THEN
    RETURN '';
  END IF;

  FOR i IN 0..length(input) - 1 LOOP
    byte_value := get_byte(input, i);
    buffer := (buffer << 8) + byte_value;
    bits := bits + 8;

    WHILE bits >= 5 LOOP
      bits := bits - 5;
      output := output || substr(alphabet, ((buffer >> bits) & 31) + 1, 1);
    END LOOP;
  END LOOP;

  IF bits > 0 THEN
    output := output || substr(alphabet, ((buffer << (5 - bits)) & 31) + 1, 1);
  END IF;

  RETURN output;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION base32_decode(input text)
RETURNS bytea AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  cleaned text := regexp_replace(upper(coalesce(input, '')), '[^A-Z2-7]', '', 'g');
  buffer bigint := 0;
  bits integer := 0;
  output bytea := ''::bytea;
  ch text;
  value integer;
  i integer;
  byte integer;
BEGIN
  IF cleaned = '' THEN
    RETURN ''::bytea;
  END IF;

  FOR i IN 1..length(cleaned) LOOP
    ch := substr(cleaned, i, 1);
    value := position(ch IN alphabet) - 1;
    IF value < 0 THEN
      RAISE EXCEPTION 'Invalid base32 character: %', ch;
    END IF;

    buffer := (buffer << 5) + value;
    bits := bits + 5;

    WHILE bits >= 8 LOOP
      bits := bits - 8;
      byte := (buffer >> bits) & 255;
      output := output || decode(lpad(to_hex(byte), 2, '0'), 'hex');
    END LOOP;
  END LOOP;

  RETURN output;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION int8_to_bytea(value bigint)
RETURNS bytea AS $$
DECLARE
  result bytea := E'\\000\\000\\000\\000\\000\\000\\000\\000';
  i integer;
BEGIN
  FOR i IN 0..7 LOOP
    result := set_byte(result, 7 - i, (value >> (i * 8)) & 255);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION admin_totp_is_valid(secret text, code text, allowed_drift integer DEFAULT 1)
RETURNS boolean AS $$
DECLARE
  secret_bytes bytea;
  timestep bigint := floor(extract(epoch FROM now()) / 30);
  counter bigint;
  hash bytea;
  offset_pos integer;
  slice integer;
  otp text;
  i integer;
BEGIN
  IF secret IS NULL OR code IS NULL OR trim(code) = '' THEN
    RETURN false;
  END IF;

  secret_bytes := base32_decode(secret);
  IF length(secret_bytes) = 0 THEN
    RETURN false;
  END IF;

  FOR i IN -allowed_drift..allowed_drift LOOP
    counter := timestep + i;
    hash := hmac(int8_to_bytea(counter), secret_bytes, 'sha1');
    offset_pos := get_byte(hash, length(hash) - 1) & 15;
    slice := ((get_byte(hash, offset_pos) & 255) << 24)
          | ((get_byte(hash, offset_pos + 1) & 255) << 16)
          | ((get_byte(hash, offset_pos + 2) & 255) << 8)
          | (get_byte(hash, offset_pos + 3) & 255);
    slice := slice & 2147483647;
    otp := lpad(((slice % 1000000)::text), 6, '0');

    IF otp = trim(code) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION admin_take_recovery_code(user_id uuid, attempt text)
RETURNS boolean AS $$
DECLARE
  hashed text;
  matched text;
BEGIN
  IF attempt IS NULL OR trim(attempt) = '' THEN
    RETURN false;
  END IF;

  SELECT code_hash INTO matched
  FROM unnest((SELECT two_factor_recovery_codes FROM admin_users WHERE id = user_id)) AS code_hash
  WHERE crypt(trim(attempt), code_hash) = code_hash
  LIMIT 1;

  IF matched IS NULL THEN
    RETURN false;
  END IF;

  UPDATE admin_users
  SET two_factor_recovery_codes = array_remove(two_factor_recovery_codes, matched)
  WHERE id = user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_take_recovery_code(uuid, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS admin_login(text, text);

CREATE OR REPLACE FUNCTION admin_login(login_email text, login_password text)
RETURNS TABLE(
  success boolean,
  requires_otp boolean,
  challenge_id uuid,
  error text,
  id uuid,
  email text,
  name text,
  role text,
  two_factor_enabled boolean
) AS $$
DECLARE
  account admin_users;
  challenge uuid;
BEGIN
  SELECT * INTO account FROM admin_users a WHERE a.email = login_email;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::uuid, 'Invalid credentials', NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  IF account.password_hash <> crypt(login_password, account.password_hash) THEN
    RETURN QUERY SELECT false, false, NULL::uuid, 'Invalid credentials', NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  IF account.two_factor_enabled AND account.two_factor_secret IS NOT NULL THEN
    INSERT INTO admin_login_challenges(admin_user_id, expires_at)
    VALUES (account.id, now() + interval '5 minutes')
    RETURNING id INTO challenge;

    RETURN QUERY SELECT false, true, challenge, NULL::text, NULL::uuid, NULL::text, NULL::text, NULL::text, account.two_factor_enabled;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, false, NULL::uuid, NULL::text, account.id, account.email, account.name, account.role, account.two_factor_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_login(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_verify_two_factor(challenge uuid, otp_code text)
RETURNS TABLE(
  success boolean,
  error text,
  id uuid,
  email text,
  name text,
  role text,
  two_factor_enabled boolean
) AS $$
DECLARE
  record_challenge admin_login_challenges;
  account admin_users;
  used_recovery boolean := false;
  matched_hash text;
BEGIN
  SELECT * INTO record_challenge
  FROM admin_login_challenges
  WHERE id = challenge
    AND consumed_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Challenge expired or invalid', NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  SELECT * INTO account FROM admin_users WHERE id = record_challenge.admin_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Account not found', NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  IF NOT account.two_factor_enabled OR account.two_factor_secret IS NULL THEN
    UPDATE admin_login_challenges SET consumed_at = now() WHERE id = record_challenge.id;
    RETURN QUERY SELECT true, NULL::text, account.id, account.email, account.name, account.role, account.two_factor_enabled;
    RETURN;
  END IF;

  IF admin_totp_is_valid(account.two_factor_secret, otp_code, 1) THEN
    UPDATE admin_login_challenges SET consumed_at = now() WHERE id = record_challenge.id;
    RETURN QUERY SELECT true, NULL::text, account.id, account.email, account.name, account.role, account.two_factor_enabled;
    RETURN;
  END IF;

  SELECT code_hash INTO matched_hash
  FROM unnest(account.two_factor_recovery_codes) AS code_hash
  WHERE crypt(coalesce(otp_code, ''), code_hash) = code_hash
  LIMIT 1;

  IF matched_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid authentication code', NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    RETURN;
  END IF;

  UPDATE admin_users
  SET two_factor_recovery_codes = array_remove(two_factor_recovery_codes, matched_hash)
  WHERE id = account.id;

  UPDATE admin_login_challenges SET consumed_at = now() WHERE id = record_challenge.id;

  RETURN QUERY SELECT true, NULL::text, account.id, account.email, account.name, account.role, account.two_factor_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_verify_two_factor(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_start_two_factor(login_email text, login_password text)
RETURNS TABLE(secret text, recovery_codes text[]) AS $$
DECLARE
  account admin_users;
  generated_secret text;
  codes text[] := ARRAY[]::text[];
  hashed text[] := ARRAY[]::text[];
  code_value text;
  i integer;
BEGIN
  SELECT * INTO account FROM admin_users WHERE email = login_email;

  IF NOT FOUND OR account.password_hash <> crypt(login_password, account.password_hash) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  generated_secret := base32_encode(gen_random_bytes(20));

  FOR i IN 1..8 LOOP
    code_value := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
    code_value := substr(code_value, 1, 5) || '-' || substr(code_value, 6, 5);
    codes := array_append(codes, code_value);
    hashed := array_append(hashed, crypt(code_value, gen_salt('bf')));
  END LOOP;

  UPDATE admin_users
  SET two_factor_temp_secret = generated_secret,
      two_factor_temp_recovery_codes = hashed
  WHERE id = account.id;

  RETURN QUERY SELECT generated_secret, codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_start_two_factor(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_confirm_two_factor(login_email text, login_password text, otp_code text)
RETURNS TABLE(success boolean, error text) AS $$
DECLARE
  account admin_users;
BEGIN
  SELECT * INTO account FROM admin_users WHERE email = login_email;

  IF NOT FOUND OR account.password_hash <> crypt(login_password, account.password_hash) THEN
    RETURN QUERY SELECT false, 'Invalid credentials';
    RETURN;
  END IF;

  IF account.two_factor_temp_secret IS NULL THEN
    RETURN QUERY SELECT false, 'No pending setup found';
    RETURN;
  END IF;

  IF NOT admin_totp_is_valid(account.two_factor_temp_secret, otp_code, 1) THEN
    RETURN QUERY SELECT false, 'Verification code is invalid';
    RETURN;
  END IF;

  UPDATE admin_users
  SET two_factor_secret = account.two_factor_temp_secret,
      two_factor_enabled = true,
      two_factor_confirmed_at = now(),
      two_factor_recovery_codes = account.two_factor_temp_recovery_codes,
      two_factor_temp_secret = NULL,
      two_factor_temp_recovery_codes = ARRAY[]::text[]
  WHERE id = account.id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_confirm_two_factor(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_disable_two_factor(login_email text, login_password text, otp_code text)
RETURNS TABLE(success boolean, error text) AS $$
DECLARE
  account admin_users;
  valid boolean;
BEGIN
  SELECT * INTO account FROM admin_users WHERE email = login_email;

  IF NOT FOUND OR account.password_hash <> crypt(login_password, account.password_hash) THEN
    RETURN QUERY SELECT false, 'Invalid credentials';
    RETURN;
  END IF;

  IF NOT account.two_factor_enabled THEN
    RETURN QUERY SELECT false, 'Two-factor authentication is not enabled';
    RETURN;
  END IF;

  valid := admin_totp_is_valid(account.two_factor_secret, otp_code, 1);

  IF NOT valid THEN
    valid := admin_take_recovery_code(account.id, otp_code);
  END IF;

  IF NOT valid THEN
    RETURN QUERY SELECT false, 'Invalid authentication code';
    RETURN;
  END IF;

  UPDATE admin_users
  SET two_factor_enabled = false,
      two_factor_secret = NULL,
      two_factor_recovery_codes = ARRAY[]::text[],
      two_factor_temp_secret = NULL,
      two_factor_temp_recovery_codes = ARRAY[]::text[]
  WHERE id = account.id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_disable_two_factor(text, text, text) TO anon, authenticated;
