-- =====================================
-- 01 - ANALYSE STRUCTURE ACTUELLE
-- =====================================
-- Ce script analyse la structure actuelle de la base Facebook
-- IMPACT : Aucun (lecture seule)
-- DURÉE : 2-3 minutes

-- 🔍 DÉBUT ANALYSE STRUCTURE FACEBOOK

-- 1. ANALYSE DES TABLES EXISTANTES
-- 📊 Tables Facebook existantes:
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename;

-- 2. STRUCTURE DÉTAILLÉE facebook_ads_data
-- 📋 2. Structure facebook_ads_data:
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  is_identity,
  identity_generation
FROM information_schema.columns 
WHERE table_name = 'facebook_ads_data'
ORDER BY ordinal_position;

-- 3. STRUCTURE DÉTAILLÉE facebook_sync_status  
-- 📋 3. Structure facebook_sync_status:
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_sync_status'
ORDER BY ordinal_position;

-- 4. STRUCTURE DÉTAILLÉE facebook_import_logs
-- 📋 4. Structure facebook_import_logs:
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_import_logs'
ORDER BY ordinal_position;

-- 5. CONTRAINTES ET CLÉ PRIMAIRES
-- 🔑 5. Contraintes Facebook:
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name LIKE 'facebook_%'
ORDER BY tc.table_name, tc.constraint_type;

-- 6. INDEX EXISTANTS
-- 📇 6. Index Facebook:
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename, indexname;

-- 7. POLITIQUES RLS
-- 🔒 7. Politiques RLS Facebook:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename, policyname;

-- 8. TAILLE DES TABLES
-- 💾 8. Taille des tables Facebook:
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Taille totale",
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Taille table",
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as "Taille index"
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 9. NOMBRE D'ENREGISTREMENTS
-- 📊 9. Nombre d'enregistrements:
DO $$
DECLARE
  table_name text;
  row_count integer;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables WHERE tablename LIKE 'facebook_%'
  LOOP
    EXECUTE 'SELECT COUNT(*) FROM ' || table_name INTO row_count;
    RAISE NOTICE 'Table %: % enregistrements', table_name, row_count;
  END LOOP;
END $$;

-- 10. RELATIONS AVEC COMPTES
-- 🔗 10. Relations avec table comptes:
SELECT 
  tc.table_name as "Table source",
  kcu.column_name as "Colonne FK",
  ccu.table_name as "Table référencée",
  ccu.column_name as "Colonne référencée"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name LIKE 'facebook_%' OR ccu.table_name LIKE 'facebook_%')
ORDER BY tc.table_name;

-- 11. VÉRIFICATION DONNÉES MIXTES user_id/compte_id
-- ⚠️ 11. Vérification architecture mixte:
DO $$
DECLARE
  user_id_count integer;
  compte_id_count integer;
  mixed_count integer;
BEGIN
  -- Compter enregistrements avec user_id seulement
  SELECT COUNT(*) INTO user_id_count
  FROM facebook_ads_data 
  WHERE user_id IS NOT NULL AND compte_id IS NULL;
  
  -- Compter enregistrements avec compte_id seulement  
  SELECT COUNT(*) INTO compte_id_count
  FROM facebook_ads_data 
  WHERE compte_id IS NOT NULL AND user_id IS NULL;
  
  -- Compter enregistrements avec les deux
  SELECT COUNT(*) INTO mixed_count
  FROM facebook_ads_data 
  WHERE user_id IS NOT NULL AND compte_id IS NOT NULL;
  
  RAISE NOTICE 'Enregistrements user_id seulement: %', user_id_count;
  RAISE NOTICE 'Enregistrements compte_id seulement: %', compte_id_count;
  RAISE NOTICE 'Enregistrements mixtes (user_id + compte_id): %', mixed_count;
  
  IF mixed_count > 0 AND (user_id_count > 0 OR compte_id_count > 0) THEN
    RAISE WARNING 'ARCHITECTURE MIXTE DÉTECTÉE - Migration complexe requise';
  END IF;
END $$;

-- 12. VÉRIFICATION INTÉGRITÉ DONNÉES
-- 🔍 12. Vérification intégrité:
-- Données orphelines (sans relation compte)
SELECT 'Ads sans compte valide' as probleme, COUNT(*) as nombre
FROM facebook_ads_data fad
LEFT JOIN comptes c ON fad.compte_id = c.id
WHERE fad.compte_id IS NOT NULL AND c.id IS NULL

UNION ALL

-- Doublons potentiels
SELECT 'Doublons potentiels' as probleme, COUNT(*) - COUNT(DISTINCT (account_id, ad_id, date_start, date_stop)) as nombre  
FROM facebook_ads_data

UNION ALL

-- Données avec métriques incohérentes
SELECT 'Métriques négatives' as probleme, COUNT(*) as nombre
FROM facebook_ads_data 
WHERE spend < 0 OR impressions < 0 OR clicks < 0;

-- ✅ ANALYSE TERMINÉE - Vérifier les résultats avant de continuer
-- 
-- 📋 PROCHAINES ÉTAPES:
--   1. Analyser les résultats ci-dessus
--   2. Noter les problèmes identifiés
--   3. Faire un backup complet si tout est OK
--   4. Exécuter 02-backup-verification.sql