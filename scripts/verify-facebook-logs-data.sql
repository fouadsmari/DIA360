-- =====================================
-- VÉRIFICATION DONNÉES LOGS FACEBOOK
-- =====================================
-- MAITRE: Script permanent de vérification des logs

-- 1. VÉRIFIER EXISTENCE TABLE
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'facebook_api_logs'
) as table_exists;

-- 2. COMPTER TOTAL LOGS
SELECT COUNT(*) as total_logs FROM facebook_api_logs;

-- 3. VOIR 10 LOGS RÉCENTS
SELECT 
  id,
  user_id,
  compte_id,
  account_id,
  endpoint,
  method,
  success,
  created_at
FROM facebook_api_logs
ORDER BY created_at DESC
LIMIT 10;

-- 4. VÉRIFIER STRUCTURE TABLE
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'facebook_api_logs'
ORDER BY ordinal_position;

-- 5. VÉRIFIER RLS ACTIVÉ
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'facebook_api_logs';

-- 6. VÉRIFIER POLITIQUES RLS
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'facebook_api_logs';

-- 7. TEST QUERY SIMPLE
SELECT * FROM facebook_api_logs LIMIT 1;