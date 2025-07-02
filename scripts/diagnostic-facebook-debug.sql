-- =====================================
-- DIAGNOSTIC FACEBOOK ADS - DEBUG
-- =====================================
-- Ce script diagnostique les problèmes Facebook Ads
-- IMPACT : Lecture seule (diagnostic)
-- DURÉE : 1-2 minutes

-- 🔍 DIAGNOSTIC FACEBOOK ADS

-- 1. VÉRIFIER EXISTENCE DES TABLES
-- 📊 1. Tables Facebook existantes:
SELECT 
  tablename,
  schemaname,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename;

-- 2. VÉRIFIER TABLE facebook_api_logs
-- 📋 2. Structure facebook_api_logs:
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_api_logs'
ORDER BY ordinal_position;

-- 3. VÉRIFIER TABLE facebook_logs_config
-- 📋 3. Structure facebook_logs_config:
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_logs_config'
ORDER BY ordinal_position;

-- 4. VÉRIFIER RLS SUR LES TABLES
-- 🔒 4. RLS Status:
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename;

-- 5. VÉRIFIER POLITIQUES RLS
-- 🔒 5. Politiques RLS:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename, policyname;

-- 6. COMPTER LES LOGS
-- 📊 6. Nombre de logs Facebook:
DO $$
DECLARE
  log_count integer;
  config_count integer;
BEGIN
  -- Vérifier si les tables existent et compter
  SELECT COUNT(*) INTO log_count
  FROM facebook_api_logs;
  
  RAISE NOTICE 'Logs Facebook: % enregistrements', log_count;
  
  SELECT COUNT(*) INTO config_count
  FROM facebook_logs_config;
  
  RAISE NOTICE 'Configurations logs: % enregistrements', config_count;
  
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table facebook_api_logs ou facebook_logs_config inexistante';
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors du comptage: %', SQLERRM;
END $$;

-- 7. VÉRIFIER CONFIGURATION API FACEBOOK
-- 🔑 7. Configuration Facebook APIs:
SELECT 
  id,
  created_by,
  account_id,
  app_id,
  is_active,
  created_at,
  CASE 
    WHEN access_token IS NOT NULL THEN 'Token présent' 
    ELSE 'Token manquant' 
  END as token_status
FROM facebook_ads_apis
ORDER BY created_at DESC;

-- 8. VÉRIFIER COMPTES ET FACEBOOK ID
-- 🏢 8. Comptes avec Facebook ID:
SELECT 
  c.id,
  c.entreprise,
  c.id_facebook_ads,
  CASE 
    WHEN c.id_facebook_ads IS NOT NULL THEN 'Facebook ID configuré'
    ELSE 'Facebook ID manquant'
  END as facebook_status
FROM comptes c
WHERE c.id_facebook_ads IS NOT NULL OR c.id_facebook_ads IS NULL
ORDER BY c.id;

-- 9. VÉRIFIER DONNÉES FACEBOOK ADS
-- 📊 9. Données Facebook Ads:
SELECT 
  COUNT(*) as total_ads,
  COUNT(DISTINCT account_id) as distinct_accounts,
  COUNT(DISTINCT campaign_id) as distinct_campaigns,
  MIN(date_start) as earliest_date,
  MAX(date_start) as latest_date,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend
FROM facebook_ads_data;

-- 10. VÉRIFIER LOGS RÉCENTS
-- 📅 10. Logs récents (dernières 24h):
SELECT 
  endpoint,
  method,
  success,
  error_message,
  created_at,
  account_id,
  response_status
FROM facebook_api_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- ✅ DIAGNOSTIC TERMINÉ
-- 
-- 📋 RÉSULTATS À ANALYSER:
--   1. Vérifier que toutes les tables existent
--   2. Vérifier que les configurations API Facebook sont présentes
--   3. Vérifier que les politiques RLS ne bloquent pas l'accès
--   4. Analyser les logs d'erreur récents