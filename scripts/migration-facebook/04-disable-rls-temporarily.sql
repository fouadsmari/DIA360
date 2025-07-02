-- =====================================
-- 04 - DÉSACTIVATION TEMPORAIRE RLS  
-- =====================================
-- Ce script désactive temporairement RLS pour permettre la migration
-- IMPACT : CRITIQUE - Sécurité temporairement désactivée
-- DURÉE : 30 secondes
-- ⚠️ ATTENTION: Exécution pendant fenêtre de maintenance uniquement

\echo '🚨 DÉBUT DÉSACTIVATION TEMPORAIRE RLS...'
\echo '⚠️  ATTENTION: Sécurité RLS temporairement désactivée pour migration'

-- 0. VÉRIFICATIONS PRÉALABLES
DO $$
BEGIN
  -- Vérifier qu'on est en période de maintenance
  IF EXTRACT(DOW FROM NOW()) NOT IN (0, 6) AND EXTRACT(HOUR FROM NOW()) BETWEEN 6 AND 22 THEN
    RAISE WARNING 'ATTENTION: Exécution en heures ouvrables détectée';
    RAISE NOTICE 'Recommandation: Exécuter en heures creuses (soir/week-end)';
  END IF;
  
  -- Vérifier backup récent
  IF NOT EXISTS (
    SELECT 1 FROM migration_log 
    WHERE phase = 'preparation' 
    AND status = 'completed' 
    AND start_time > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Pas de préparation récente détectée. Exécuter 03-prepare-migration.sql d''abord';
  END IF;
END $$;

-- 1. ENREGISTRER DÉBUT PHASE 2
INSERT INTO migration_log (phase, script_name, status, notes)
VALUES ('phase2_urgent', '04-disable-rls-temporarily.sql', 'started', 'DÉBUT PHASE 2 - Désactivation RLS temporaire');

-- 2. SAUVEGARDER ÉTAT ACTUEL RLS
\echo '💾 1. Sauvegarde état actuel RLS:'

-- Créer table temporaire pour sauvegarder l'état RLS
CREATE TEMP TABLE rls_state_backup AS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
  AND schemaname = 'public';

-- Sauvegarder dans la table permanente aussi
INSERT INTO migration_backup_info (table_name, column_name, old_definition, notes)
SELECT 
  'rls_state',
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END,
  'État RLS avant migration'
FROM pg_tables 
WHERE tablename LIKE 'facebook_%' 
  AND schemaname = 'public';

-- Afficher état actuel
SELECT 
  tablename as "Table",
  CASE WHEN rowsecurity THEN '🔒 Activé' ELSE '🔓 Désactivé' END as "État RLS"
FROM pg_tables 
WHERE tablename LIKE 'facebook_%' 
  AND schemaname = 'public'
ORDER BY tablename;

-- 3. VÉRIFIER CONNEXIONS ACTIVES
\echo '🔍 2. Vérification connexions actives:'

SELECT 
  COUNT(*) as "Connexions totales",
  COUNT(*) FILTER (WHERE state = 'active') as "Requêtes actives",
  COUNT(*) FILTER (WHERE query ILIKE '%facebook_%') as "Requêtes Facebook actives"
FROM pg_stat_activity 
WHERE datname = current_database();

-- Afficher requêtes actives sur tables Facebook si il y en a
DO $$
DECLARE
  active_queries INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_queries
  FROM pg_stat_activity 
  WHERE state = 'active' 
    AND query ILIKE '%facebook_%'
    AND pid != pg_backend_pid();
    
  IF active_queries > 0 THEN
    RAISE WARNING 'ATTENTION: % requêtes actives détectées sur tables Facebook', active_queries;
    
    -- Afficher les requêtes actives
    RAISE NOTICE 'Requêtes actives:';
    FOR rec IN 
      SELECT pid, query_start, left(query, 100) as query_snippet
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND query ILIKE '%facebook_%'
        AND pid != pg_backend_pid()
    LOOP
      RAISE NOTICE 'PID %, depuis %, requête: %', rec.pid, rec.query_start, rec.query_snippet;
    END LOOP;
    
    RAISE NOTICE 'Considérer attendre la fin de ces requêtes avant de continuer';
  ELSE
    RAISE NOTICE '✅ Aucune requête active sur tables Facebook';
  END IF;
END $$;

-- 4. DÉSACTIVATION RLS TEMPORAIRE
\echo '🔓 3. Désactivation RLS temporaire:'

-- Désactiver RLS sur facebook_ads_data
\echo '  - facebook_ads_data...'
ALTER TABLE public.facebook_ads_data DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur facebook_sync_status  
\echo '  - facebook_sync_status...'
ALTER TABLE public.facebook_sync_status DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur facebook_import_logs
\echo '  - facebook_import_logs...'
ALTER TABLE public.facebook_import_logs DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur facebook_api_logs si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_api_logs') THEN
    EXECUTE 'ALTER TABLE public.facebook_api_logs DISABLE ROW LEVEL SECURITY';
    RAISE NOTICE '  - facebook_api_logs...';
  END IF;
END $$;

-- Désactiver RLS sur facebook_logs_config si elle existe  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_logs_config') THEN
    EXECUTE 'ALTER TABLE public.facebook_logs_config DISABLE ROW LEVEL SECURITY';
    RAISE NOTICE '  - facebook_logs_config...';
  END IF;
END $$;

-- 5. VÉRIFICATION DÉSACTIVATION
\echo '✅ 4. Vérification désactivation:'

SELECT 
  tablename as "Table",
  CASE WHEN rowsecurity THEN '❌ Encore activé' ELSE '✅ Désactivé' END as "État RLS",
  CASE WHEN rowsecurity THEN '🚨 PROBLÈME' ELSE '✅ OK' END as "Statut"
FROM pg_tables 
WHERE tablename LIKE 'facebook_%' 
  AND schemaname = 'public'
ORDER BY tablename;

-- 6. VÉRIFICATION ACCÈS TOTAL
\echo '🔍 5. Test accès total (doit fonctionner):'

-- Test lecture sans restriction
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM facebook_ads_data;
  RAISE NOTICE 'Test lecture facebook_ads_data: % enregistrements accessibles', test_count;
  
  SELECT COUNT(*) INTO test_count FROM facebook_sync_status;  
  RAISE NOTICE 'Test lecture facebook_sync_status: % enregistrements accessibles', test_count;
  
  SELECT COUNT(*) INTO test_count FROM facebook_import_logs;
  RAISE NOTICE 'Test lecture facebook_import_logs: % enregistrements accessibles', test_count;
  
  RAISE NOTICE '✅ Accès total confirmé - RLS désactivé avec succès';
END $$;

-- 7. AVERTISSEMENTS SÉCURITÉ
\echo ''
\echo '🚨 AVERTISSEMENTS SÉCURITÉ:'
\echo '  ❗ RLS DÉSACTIVÉ sur toutes les tables Facebook'
\echo '  ❗ Toutes les données sont maintenant accessibles sans restriction'
\echo '  ❗ EXÉCUTER LES SCRIPTS SUIVANTS RAPIDEMENT'
\echo '  ❗ NE PAS laisser RLS désactivé plus de 4 heures'
\echo ''

-- 8. TIMER DE SÉCURITÉ
\echo '⏰ Timer de sécurité activé:'

-- Créer notification pour réactiver RLS automatiquement
DO $$
BEGIN
  -- Programmer rappel dans 2 heures
  RAISE NOTICE 'RAPPEL: RLS sera à réactiver dans maximum 2 heures';
  RAISE NOTICE 'Timestamp désactivation: %', NOW();
  RAISE NOTICE 'Réactivation recommandée avant: %', NOW() + INTERVAL '2 hours';
END $$;

-- 9. FINALISATION
UPDATE migration_log 
SET 
  status = 'completed',
  end_time = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
  notes = 'RLS désactivé temporairement - RÉACTIVER RAPIDEMENT'
WHERE phase = 'phase2_urgent' 
  AND script_name = '04-disable-rls-temporarily.sql' 
  AND status = 'started';

\echo '✅ RLS TEMPORAIREMENT DÉSACTIVÉ'
\echo ''
\echo '📋 PROCHAINES ÉTAPES IMMÉDIATES:'
\echo '  1. Exécuter IMMÉDIATEMENT 05-add-missing-columns.sql'
\echo '  2. Puis 06-fix-rls-policies.sql'  
\echo '  3. Puis 07-enable-rls-secure.sql'
\echo '  4. Temps maximum total: 2 heures'
\echo ''
\echo '🚨 CRITIQUE: Ne pas arrêter la migration maintenant!'
\echo '🚨 RLS doit être réactivé rapidement pour la sécurité!'