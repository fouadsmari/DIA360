-- =====================================
-- CORRECTION URGENTE - RLS FACEBOOK LOGS
-- =====================================
-- Corriger les politiques RLS pour permettre l'accès aux logs Facebook

-- 🔧 CORRECTION RLS FACEBOOK LOGS

-- 1. VÉRIFIER EXISTENCE TABLE facebook_api_logs
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'facebook_api_logs'
) as table_exists;

-- 2. SUPPRIMER ANCIENNES POLITIQUES SI ELLES EXISTENT
DROP POLICY IF EXISTS "facebook_api_logs_policy" ON public.facebook_api_logs;
DROP POLICY IF EXISTS "Enable read access for users" ON public.facebook_api_logs;
DROP POLICY IF EXISTS "Enable insert access for users" ON public.facebook_api_logs;

-- 3. CRÉER POLITIQUE RLS CORRECTE POUR FACEBOOK_API_LOGS
CREATE POLICY "facebook_api_logs_access_policy" ON public.facebook_api_logs
  FOR ALL
  USING (
    -- Permettre accès selon rôle utilisateur
    CASE 
      WHEN auth.jwt() ->> 'role' = 'Superadmin' THEN true
      WHEN auth.jwt() ->> 'role' = 'Direction' THEN true
      WHEN auth.jwt() ->> 'role' = 'Responsable' THEN user_id = auth.jwt() ->> 'sub'
      ELSE false
    END
  );

-- 4. VÉRIFIER POLITIQUES CRÉÉES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'facebook_api_logs'
ORDER BY policyname;

-- 5. TESTER ACCÈS AUX LOGS (compter les logs)
SELECT COUNT(*) as total_logs FROM facebook_api_logs;

-- 6. LOGS RÉCENTS POUR TEST
SELECT 
  id,
  endpoint,
  method,
  success,
  created_at,
  user_id
FROM facebook_api_logs
ORDER BY created_at DESC
LIMIT 5;

-- ✅ CORRECTION RLS TERMINÉE
-- 
-- 📋 ACTIONS EFFECTUÉES:
--   1. Suppression anciennes politiques RLS conflictuelles
--   2. Création politique RLS corrigée selon rôles
--   3. Test accès aux logs