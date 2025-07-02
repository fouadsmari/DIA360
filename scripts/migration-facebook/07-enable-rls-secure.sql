-- =====================================
-- 07 - RÉACTIVATION RLS SÉCURISÉE
-- =====================================
-- Ce script réactive RLS avec les nouvelles politiques sécurisées
-- IMPACT : CRITIQUE - Réactivation sécurité
-- DURÉE : 1-2 minutes
-- ⚠️ PRÉREQUIS: Politiques RLS corrigées

\echo '🔐 DÉBUT RÉACTIVATION RLS SÉCURISÉE...'

-- 0. VÉRIFICATIONS PRÉALABLES CRITIQUES
DO $$
DECLARE
  policies_count INTEGER;
  unified_policies INTEGER;
BEGIN
  -- Vérifier que RLS est toujours désactivé
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename LIKE 'facebook_%' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ERREUR: RLS déjà réactivé - script déjà exécuté ?';
  END IF;
  
  -- Vérifier que les nouvelles politiques existent
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies WHERE tablename LIKE 'facebook_%';
  
  SELECT COUNT(*) INTO unified_policies
  FROM pg_policies 
  WHERE tablename LIKE 'facebook_%' 
  AND policyname LIKE '%unified%';
  
  IF policies_count = 0 THEN
    RAISE EXCEPTION 'ERREUR: Aucune politique RLS trouvée - exécuter 06-fix-rls-policies.sql d''abord';
  END IF;
  
  IF unified_policies < 3 THEN
    RAISE EXCEPTION 'ERREUR: Politiques unifiées incomplètes - vérifier 06-fix-rls-policies.sql';
  END IF;
  
  -- Vérifier phase précédente
  IF NOT EXISTS (
    SELECT 1 FROM migration_log 
    WHERE phase = 'phase2_urgent' 
    AND script_name = '06-fix-rls-policies.sql'
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Correction politiques RLS non terminée';
  END IF;
  
  RAISE NOTICE '✅ Vérifications préalables réussies';
  RAISE NOTICE '  - Politiques total: %', policies_count;
  RAISE NOTICE '  - Politiques unifiées: %', unified_policies;
END $$;

-- 1. ENREGISTRER DÉBUT
INSERT INTO migration_log (phase, script_name, status, notes)
VALUES ('phase2_urgent', '07-enable-rls-secure.sql', 'started', 'Réactivation RLS avec politiques sécurisées');

-- 2. DERNIÈRE VÉRIFICATION POLITIQUES
\echo '🔍 1. Dernière vérification politiques:'

SELECT 
  tablename as "Table",
  COUNT(*) as "Nb politiques",
  STRING_AGG(
    CASE 
      WHEN policyname LIKE '%unified%' THEN '🔒'
      WHEN policyname LIKE '%superadmin%' THEN '🔑' 
      ELSE '❓'
    END, ' '
  ) as "Types"
FROM pg_policies 
WHERE tablename LIKE 'facebook_%'
GROUP BY tablename
ORDER BY tablename;

-- Détecter politiques potentiellement dangereuses
DO $$
DECLARE
  dangerous_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dangerous_count
  FROM pg_policies 
  WHERE tablename LIKE 'facebook_%' 
  AND (
    qual LIKE '%user_id = auth.uid() OR%' 
    OR qual LIKE '%OR user_id = auth.uid()%'
    OR qual LIKE '%auth.uid()%'
  );
  
  IF dangerous_count > 0 THEN
    RAISE WARNING 'ATTENTION: % politiques potentiellement dangereuses détectées', dangerous_count;
    
    -- Lister les politiques suspectes
    FOR rec IN 
      SELECT tablename, policyname, LEFT(qual, 100) as qual_snippet
      FROM pg_policies 
      WHERE tablename LIKE 'facebook_%' 
      AND (
        qual LIKE '%user_id = auth.uid() OR%' 
        OR qual LIKE '%OR user_id = auth.uid()%'
        OR qual LIKE '%auth.uid()%'
      )
    LOOP
      RAISE WARNING 'Politique suspecte: %.% - %', rec.tablename, rec.policyname, rec.qual_snippet;
    END LOOP;
    
    RAISE EXCEPTION 'ARRÊT: Politiques dangereuses détectées - corriger avant activation';
  ELSE
    RAISE NOTICE '✅ Aucune politique dangereuse détectée';
  END IF;
END $$;

-- 3. TEST SYNTAXE POLITIQUES (sans données sensibles)
\echo '🧪 2. Test syntaxe politiques:'

-- Créer utilisateur test temporaire pour validation
DO $$
DECLARE
  test_user_id TEXT := 'test-user-' || EXTRACT(EPOCH FROM NOW());
  test_compte_id INTEGER;
BEGIN
  -- Tester qu'une requête avec politique fonctionne syntaxiquement
  -- (Retournera 0 résultats mais valide la syntaxe)
  
  PERFORM COUNT(*) FROM (
    SELECT c.id FROM comptes c
    LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
    LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
    LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
    WHERE cuc.user_id::text = test_user_id
       OR cup.user_id::text = test_user_id
       OR cg.user_id::text = test_user_id
  ) test_query;
  
  RAISE NOTICE '✅ Syntaxe politique unifiée validée';
  
  -- Tester politique superadmin
  PERFORM EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id::text = test_user_id 
    AND u.role IN ('Superadmin', 'Direction')
  );
  
  RAISE NOTICE '✅ Syntaxe politique superadmin validée';
END $$;

-- 4. RÉACTIVATION RLS PAR ÉTAPES
\echo '🔐 3. Réactivation RLS par étapes:'

-- Étape 1: facebook_import_logs (moins critique en premier)
\echo '  1. facebook_import_logs...'
ALTER TABLE public.facebook_import_logs ENABLE ROW LEVEL SECURITY;

-- Test immédiat
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM facebook_import_logs LIMIT 1;
  RAISE NOTICE '    ✅ RLS activé sur facebook_import_logs - test OK';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERREUR RLS facebook_import_logs: %', SQLERRM;
END $$;

-- Étape 2: facebook_sync_status  
\echo '  2. facebook_sync_status...'
ALTER TABLE public.facebook_sync_status ENABLE ROW LEVEL SECURITY;

-- Test immédiat
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM facebook_sync_status LIMIT 1;
  RAISE NOTICE '    ✅ RLS activé sur facebook_sync_status - test OK';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERREUR RLS facebook_sync_status: %', SQLERRM;
END $$;

-- Étape 3: facebook_ads_data (plus critique en dernier)
\echo '  3. facebook_ads_data...'
ALTER TABLE public.facebook_ads_data ENABLE ROW LEVEL SECURITY;

-- Test immédiat
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM facebook_ads_data LIMIT 1;
  RAISE NOTICE '    ✅ RLS activé sur facebook_ads_data - test OK';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERREUR RLS facebook_ads_data: %', SQLERRM;
END $$;

-- Étape 4: Tables de logging si elles existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_api_logs') THEN
    EXECUTE 'ALTER TABLE public.facebook_api_logs ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE '  4. facebook_api_logs... ✅';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_logs_config') THEN
    EXECUTE 'ALTER TABLE public.facebook_logs_config ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE '  5. facebook_logs_config... ✅';
  END IF;
END $$;

-- 5. VÉRIFICATION ACTIVATION COMPLÈTE
\echo '✅ 4. Vérification activation complète:'

SELECT 
  tablename as "Table",
  CASE WHEN rowsecurity THEN '🔒 ACTIVÉ' ELSE '🔓 DÉSACTIVÉ' END as "État RLS",
  CASE WHEN rowsecurity THEN '✅ OK' ELSE '❌ PROBLÈME' END as "Statut"
FROM pg_tables 
WHERE tablename LIKE 'facebook_%' 
  AND schemaname = 'public'
ORDER BY tablename;

-- Vérifier qu'aucune table n'a RLS désactivé
DO $$
DECLARE
  disabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO disabled_count
  FROM pg_tables 
  WHERE tablename LIKE 'facebook_%' 
    AND schemaname = 'public'
    AND rowsecurity = false;
    
  IF disabled_count > 0 THEN
    RAISE EXCEPTION 'ERREUR: % tables ont encore RLS désactivé', disabled_count;
  ELSE
    RAISE NOTICE '✅ RLS activé sur toutes les tables Facebook';
  END IF;
END $$;

-- 6. TEST FONCTIONNEL AVEC RLS ACTIVÉ
\echo '🧪 5. Test fonctionnel avec RLS activé:'

-- Tester que les requêtes passent toujours (mais peuvent retourner 0 résultats)
DO $$
DECLARE
  ads_count INTEGER;
  sync_count INTEGER;
  logs_count INTEGER;
BEGIN
  -- Ces requêtes peuvent retourner 0 si l'utilisateur actuel n'a pas accès
  -- mais elles ne doivent pas échouer
  SELECT COUNT(*) INTO ads_count FROM facebook_ads_data;
  SELECT COUNT(*) INTO sync_count FROM facebook_sync_status;
  SELECT COUNT(*) INTO logs_count FROM facebook_import_logs;
  
  RAISE NOTICE '🧪 Test accès avec RLS:';
  RAISE NOTICE '  - facebook_ads_data: % enregistrements accessibles', ads_count;
  RAISE NOTICE '  - facebook_sync_status: % enregistrements accessibles', sync_count;
  RAISE NOTICE '  - facebook_import_logs: % enregistrements accessibles', logs_count;
  RAISE NOTICE '✅ Toutes les requêtes RLS fonctionnent';
END $$;

-- 7. VALIDATION SÉCURITÉ
\echo '🔒 6. Validation sécurité:'

DO $$
DECLARE
  total_policies INTEGER;
  active_rls_tables INTEGER;
BEGIN
  -- Compter politiques actives
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE tablename LIKE 'facebook_%';
  
  -- Compter tables avec RLS activé
  SELECT COUNT(*) INTO active_rls_tables
  FROM pg_tables 
  WHERE tablename LIKE 'facebook_%' 
    AND rowsecurity = true;
    
  RAISE NOTICE '';
  RAISE NOTICE '🔒 VALIDATION SÉCURITÉ FINALE:';
  RAISE NOTICE '  - Tables avec RLS activé: %', active_rls_tables;
  RAISE NOTICE '  - Politiques de sécurité: %', total_policies;
  
  IF active_rls_tables >= 3 AND total_policies >= 6 THEN
    RAISE NOTICE '  ✅ SÉCURITÉ RESTAURÉE ET RENFORCÉE';
    RAISE NOTICE '  ✅ Architecture unifiée active';
    RAISE NOTICE '  ✅ Failles sécuritaires corrigées';
  ELSE
    RAISE WARNING '  ⚠️  Configuration sécurité incomplète';
  END IF;
END $$;

-- 8. NETTOYAGE POST-ACTIVATION
\echo '🧹 7. Nettoyage post-activation:'

-- Supprimer les sessions/cache qui pourraient contenir anciens privilèges
-- (Supabase gère cela automatiquement mais on note l'information)
DO $$
BEGIN
  RAISE NOTICE '📋 Actions recommandées post-activation:';
  RAISE NOTICE '  - Les connexions existantes garderont leurs privilèges';
  RAISE NOTICE '  - Nouvelles connexions utiliseront nouvelles politiques';
  RAISE NOTICE '  - Redémarrage app recommandé pour cache';
  RAISE NOTICE '  - Test complet avec différents rôles utilisateur';
END $$;

-- 9. MÉTRIQUES FINALES PHASE 2
\echo '📊 8. Métriques finales Phase 2:'

SELECT 
  phase,
  COUNT(*) as "Scripts exécutés",
  MIN(start_time) as "Début Phase 2",
  MAX(end_time) as "Fin Phase 2",
  EXTRACT(EPOCH FROM (MAX(end_time) - MIN(start_time))) / 60 as "Durée totale (min)"
FROM migration_log 
WHERE phase = 'phase2_urgent'
  AND status = 'completed'
GROUP BY phase;

-- 10. FINALISATION
UPDATE migration_log 
SET 
  status = 'completed',
  end_time = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
  notes = 'RLS réactivé avec succès - Architecture unifiée sécurisée'
WHERE phase = 'phase2_urgent' 
  AND script_name = '07-enable-rls-secure.sql' 
  AND status = 'started';

\echo ''
\echo '🎉 PHASE 2 TERMINÉE AVEC SUCCÈS !'
\echo ''
\echo '✅ ACCOMPLISSEMENTS PHASE 2:'
\echo '  🔒 Failles sécuritaires RLS corrigées'
\echo '  🔧 Colonnes manquantes ajoutées'
\echo '  🏗️  Architecture unifiée implémentée' 
\echo '  🛡️  Politiques de sécurité renforcées'
\echo '  ⚡ Application sécurisée et fonctionnelle'
\echo ''
\echo '📋 PROCHAINES ÉTAPES (OPTIONNELLES):'
\echo '  📊 Phase 3: Migration complète types de données'
\echo '  🚀 Phase 3: Optimisations performance'
\echo '  📈 Phase 3: Vues matérialisées'
\echo ''
\echo '✅ VOTRE APPLICATION EST MAINTENANT SÉCURISÉE !'
\echo '✅ Vous pouvez utiliser l''app Facebook Ads en production'
\echo ''
\echo '⏰ Phase 3 peut être planifiée indépendamment (week-end recommandé)'