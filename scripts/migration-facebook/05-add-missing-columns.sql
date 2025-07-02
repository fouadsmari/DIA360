-- =====================================
-- 05 - AJOUT COLONNES MANQUANTES
-- =====================================
-- Ce script ajoute toutes les colonnes manquantes selon FACEBOOK.md
-- IMPACT : MODÉRÉ - Ajout colonnes sans perte de données
-- DURÉE : 5-10 minutes
-- ⚠️ PRÉREQUIS: RLS désactivé (script 04)

\echo '🔧 DÉBUT AJOUT COLONNES MANQUANTES...'

-- 0. VÉRIFICATIONS PRÉALABLES
DO $$
BEGIN
  -- Vérifier que RLS est désactivé
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename LIKE 'facebook_%' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ERREUR: RLS encore activé. Exécuter 04-disable-rls-temporarily.sql d''abord';
  END IF;
  
  -- Vérifier phase précédente
  IF NOT EXISTS (
    SELECT 1 FROM migration_log 
    WHERE phase = 'phase2_urgent' 
    AND script_name = '04-disable-rls-temporarily.sql'
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Phase précédente non terminée';
  END IF;
END $$;

-- 1. ENREGISTRER DÉBUT
INSERT INTO migration_log (phase, script_name, status, notes)
VALUES ('phase2_urgent', '05-add-missing-columns.sql', 'started', 'Ajout colonnes manquantes');

-- 2. AJOUT COLONNES facebook_ads_data
\echo '📋 1. Ajout colonnes facebook_ads_data:'

-- Sync status pour gestion des erreurs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_ads_data' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE facebook_ads_data 
    ADD COLUMN sync_status VARCHAR(50) DEFAULT 'active' 
    CHECK (sync_status IN ('active', 'account_suspended', 'access_denied', 'data_invalid'));
    RAISE NOTICE '✅ Ajouté: sync_status';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: sync_status';
  END IF;
END $$;

-- Score de qualité des données
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_ads_data' AND column_name = 'data_quality_score'
  ) THEN
    ALTER TABLE facebook_ads_data 
    ADD COLUMN data_quality_score INTEGER DEFAULT 100 
    CHECK (data_quality_score >= 0 AND data_quality_score <= 100);
    RAISE NOTICE '✅ Ajouté: data_quality_score';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: data_quality_score';
  END IF;
END $$;

-- 3. AJOUT COLONNES facebook_sync_status  
\echo '📋 2. Ajout colonnes facebook_sync_status:'

-- ID unique de synchronisation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'sync_id'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN sync_id VARCHAR(255);
    
    -- Générer des sync_id pour les enregistrements existants
    UPDATE facebook_sync_status 
    SET sync_id = 'legacy_' || id::text || '_' || EXTRACT(EPOCH FROM created_at)::bigint
    WHERE sync_id IS NULL;
    
    -- Rendre obligatoire et unique
    ALTER TABLE facebook_sync_status 
    ALTER COLUMN sync_id SET NOT NULL;
    
    -- L'index unique sera ajouté plus tard pour éviter les conflits
    RAISE NOTICE '✅ Ajouté: sync_id';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: sync_id';
  END IF;
END $$;

-- Nombre de jours échoués
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'failed_days'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN failed_days INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Ajouté: failed_days';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: failed_days';
  END IF;
END $$;

-- Code d'erreur Facebook spécifique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'facebook_error_code'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN facebook_error_code VARCHAR(50);
    RAISE NOTICE '✅ Ajouté: facebook_error_code';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: facebook_error_code';
  END IF;
END $$;

-- Compteur de retry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN retry_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Ajouté: retry_count';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: retry_count';
  END IF;
END $$;

-- Maximum de retry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN max_retries INTEGER DEFAULT 3;
    RAISE NOTICE '✅ Ajouté: max_retries';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: max_retries';
  END IF;
END $$;

-- Prochaine tentative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_sync_status' AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE facebook_sync_status 
    ADD COLUMN next_retry_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Ajouté: next_retry_at';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: next_retry_at';
  END IF;
END $$;

-- 4. MISE À JOUR ENUM status facebook_sync_status
\echo '📋 3. Mise à jour valeurs status facebook_sync_status:'

-- Vérifier contrainte actuelle
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint 
  WHERE conname LIKE '%status%' 
    AND conrelid = 'facebook_sync_status'::regclass;
    
  IF constraint_def IS NOT NULL AND constraint_def NOT LIKE '%cancelled%' THEN
    -- Supprimer ancienne contrainte
    ALTER TABLE facebook_sync_status 
    DROP CONSTRAINT IF EXISTS facebook_sync_status_status_check;
    
    -- Ajouter nouvelle contrainte avec valeurs étendues
    ALTER TABLE facebook_sync_status 
    ADD CONSTRAINT facebook_sync_status_status_check 
    CHECK (status IN ('pending', 'syncing', 'completed', 'failed', 'partial', 'cancelled', 'rate_limited'));
    
    RAISE NOTICE '✅ Contrainte status mise à jour avec nouvelles valeurs';
  ELSE
    RAISE NOTICE '⚠️  Contrainte status déjà à jour ou inexistante';
  END IF;
END $$;

-- 5. AJOUT COLONNES facebook_import_logs
\echo '📋 4. Ajout colonnes facebook_import_logs:'

-- Lignes mises à jour
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'rows_updated'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN rows_updated INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Ajouté: rows_updated';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: rows_updated';
  END IF;
END $$;

-- Lignes échouées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'rows_failed'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN rows_failed INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Ajouté: rows_failed';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: rows_failed';
  END IF;
END $$;

-- Appels API échoués
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'api_calls_failed'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN api_calls_failed INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Ajouté: api_calls_failed';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: api_calls_failed';
  END IF;
END $$;

-- Usage quotas Facebook
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'facebook_quota_usage'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN facebook_quota_usage JSONB;
    RAISE NOTICE '✅ Ajouté: facebook_quota_usage';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: facebook_quota_usage';
  END IF;
END $$;

-- Métriques de performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'performance_metrics'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN performance_metrics JSONB;
    RAISE NOTICE '✅ Ajouté: performance_metrics';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: performance_metrics';
  END IF;
END $$;

-- Usage mémoire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_import_logs' AND column_name = 'memory_usage_mb'
  ) THEN
    ALTER TABLE facebook_import_logs 
    ADD COLUMN memory_usage_mb INTEGER;
    RAISE NOTICE '✅ Ajouté: memory_usage_mb';
  ELSE
    RAISE NOTICE '⚠️  Existe déjà: memory_usage_mb';
  END IF;
END $$;

-- 6. MISE À JOUR ENUM status facebook_import_logs
\echo '📋 5. Mise à jour valeurs status facebook_import_logs:'

DO $$
BEGIN
  -- Supprimer ancienne contrainte si elle existe
  ALTER TABLE facebook_import_logs 
  DROP CONSTRAINT IF EXISTS facebook_import_logs_status_check;
  
  -- Ajouter nouvelle contrainte avec valeurs étendues
  ALTER TABLE facebook_import_logs 
  ADD CONSTRAINT facebook_import_logs_status_check 
  CHECK (status IN ('success', 'failed', 'partial', 'rate_limited', 'token_expired', 'account_suspended'));
  
  RAISE NOTICE '✅ Contrainte status mise à jour avec nouvelles valeurs';
END $$;

-- 7. INITIALISATION VALEURS PAR DÉFAUT
\echo '📋 6. Initialisation valeurs par défaut:'

-- Initialiser sync_status des données existantes
UPDATE facebook_ads_data 
SET sync_status = 'active' 
WHERE sync_status IS NULL;

-- Initialiser data_quality_score
UPDATE facebook_ads_data 
SET data_quality_score = 
  CASE 
    WHEN impressions > 0 AND spend > 0 THEN 100
    WHEN impressions > 0 THEN 80
    ELSE 60
  END
WHERE data_quality_score IS NULL;

-- Initialiser failed_days
UPDATE facebook_sync_status 
SET failed_days = 0 
WHERE failed_days IS NULL;

-- Initialiser retry_count  
UPDATE facebook_sync_status 
SET retry_count = 0 
WHERE retry_count IS NULL;

-- Initialiser max_retries
UPDATE facebook_sync_status 
SET max_retries = 3 
WHERE max_retries IS NULL;

-- Initialiser colonnes logs
UPDATE facebook_import_logs 
SET 
  rows_updated = 0,
  rows_failed = 0, 
  api_calls_failed = 0
WHERE rows_updated IS NULL OR rows_failed IS NULL OR api_calls_failed IS NULL;

-- 8. VÉRIFICATION AJOUTS
\echo '✅ 7. Vérification ajouts:'

-- Compter nouvelles colonnes facebook_ads_data
SELECT 
  'facebook_ads_data' as table_name,
  COUNT(*) FILTER (WHERE column_name IN ('sync_status', 'data_quality_score')) as "Nouvelles colonnes"
FROM information_schema.columns 
WHERE table_name = 'facebook_ads_data'

UNION ALL

-- Compter nouvelles colonnes facebook_sync_status  
SELECT 
  'facebook_sync_status' as table_name,
  COUNT(*) FILTER (WHERE column_name IN ('sync_id', 'failed_days', 'facebook_error_code', 'retry_count', 'max_retries', 'next_retry_at')) as "Nouvelles colonnes"
FROM information_schema.columns 
WHERE table_name = 'facebook_sync_status'

UNION ALL

-- Compter nouvelles colonnes facebook_import_logs
SELECT 
  'facebook_import_logs' as table_name,
  COUNT(*) FILTER (WHERE column_name IN ('rows_updated', 'rows_failed', 'api_calls_failed', 'facebook_quota_usage', 'performance_metrics', 'memory_usage_mb')) as "Nouvelles colonnes"  
FROM information_schema.columns 
WHERE table_name = 'facebook_import_logs';

-- 9. TEST FONCTIONNEL
\echo '🔍 8. Test fonctionnel:'

-- Test insertion avec nouvelles colonnes
DO $$
BEGIN
  -- Test facebook_ads_data
  INSERT INTO facebook_ads_data (
    account_id, ad_id, ad_name, date_start, date_stop,
    sync_status, data_quality_score
  ) VALUES (
    'test_account', 'test_ad_' || EXTRACT(EPOCH FROM NOW()), 'Test Ad', 
    CURRENT_DATE, CURRENT_DATE,
    'active', 95
  );
  
  -- Test facebook_sync_status
  INSERT INTO facebook_sync_status (
    account_id, date_start, date_stop, status,
    sync_id, failed_days, retry_count, max_retries
  ) VALUES (
    'test_account', CURRENT_DATE, CURRENT_DATE, 'pending',
    'test_sync_' || EXTRACT(EPOCH FROM NOW()), 0, 0, 3
  );
  
  -- Test facebook_import_logs
  INSERT INTO facebook_import_logs (
    account_id, date_start, date_stop, status,
    rows_updated, rows_failed, api_calls_failed
  ) VALUES (
    'test_account', CURRENT_DATE, CURRENT_DATE, 'success',
    10, 0, 0
  );
  
  -- Supprimer tests
  DELETE FROM facebook_ads_data WHERE ad_id LIKE 'test_ad_%';
  DELETE FROM facebook_sync_status WHERE sync_id LIKE 'test_sync_%';
  DELETE FROM facebook_import_logs WHERE account_id = 'test_account' AND rows_imported = 0;
  
  RAISE NOTICE '✅ Test insertion réussi avec nouvelles colonnes';
END $$;

-- 10. FINALISATION
UPDATE migration_log 
SET 
  status = 'completed',
  end_time = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
  notes = 'Colonnes manquantes ajoutées avec succès'
WHERE phase = 'phase2_urgent' 
  AND script_name = '05-add-missing-columns.sql' 
  AND status = 'started';

\echo '✅ COLONNES MANQUANTES AJOUTÉES'
\echo ''
\echo '📊 RÉSUMÉ AJOUTS:'
\echo '  - facebook_ads_data: 2 nouvelles colonnes'
\echo '  - facebook_sync_status: 6 nouvelles colonnes'  
\echo '  - facebook_import_logs: 6 nouvelles colonnes'
\echo ''
\echo '📋 PROCHAINE ÉTAPE IMMÉDIATE:'
\echo '  ➡️  Exécuter 06-fix-rls-policies.sql'
\echo ''
\echo '⏰ Temps restant RLS désactivé: < 2 heures'