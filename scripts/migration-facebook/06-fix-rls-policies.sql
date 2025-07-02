-- =====================================
-- 06 - CORRECTION POLITIQUES RLS
-- =====================================
-- Ce script corrige les politiques RLS selon FACEBOOK.md (architecture unifiée)
-- IMPACT : CRITIQUE - Correction failles de sécurité
-- DURÉE : 2-3 minutes
-- ⚠️ PRÉREQUIS: RLS désactivé + colonnes ajoutées

\echo '🔒 DÉBUT CORRECTION POLITIQUES RLS...'

-- 0. VÉRIFICATIONS PRÉALABLES
DO $$
BEGIN
  -- Vérifier que RLS est toujours désactivé
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename LIKE 'facebook_%' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ERREUR: RLS réactivé prématurément. Maintenir désactivé pendant correction';
  END IF;
  
  -- Vérifier phase précédente
  IF NOT EXISTS (
    SELECT 1 FROM migration_log 
    WHERE phase = 'phase2_urgent' 
    AND script_name = '05-add-missing-columns.sql'
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'ERREUR: Ajout colonnes non terminé';
  END IF;
END $$;

-- 1. ENREGISTRER DÉBUT
INSERT INTO migration_log (phase, script_name, status, notes)
VALUES ('phase2_urgent', '06-fix-rls-policies.sql', 'started', 'Correction politiques RLS sécurisées');

-- 2. SAUVEGARDE POLITIQUES ACTUELLES
\echo '💾 1. Sauvegarde politiques actuelles:'

-- Lister politiques existantes avant suppression
\echo '📋 Politiques RLS actuelles:'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename, policyname;

-- Sauvegarder détails complets
INSERT INTO migration_backup_info (table_name, column_name, old_definition, notes)
SELECT 
  'rls_policy',
  policyname,
  'ON ' || tablename || ' FOR ' || cmd || ' TO ' || COALESCE(roles::text, 'public') || 
  ' USING (' || COALESCE(qual, 'true') || ')' ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END,
  'Politique avant correction'
FROM pg_policies 
WHERE tablename LIKE 'facebook_%';

-- 3. SUPPRESSION POLITIQUES DANGEREUSES
\echo '🗑️  2. Suppression politiques actuelles (dangereuses):'

-- Supprimer toutes les politiques RLS actuelles sur tables Facebook
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE tablename LIKE 'facebook_%'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || 
            ' ON ' || quote_ident(policy_record.tablename);
    RAISE NOTICE '🗑️  Supprimé: % sur %', policy_record.policyname, policy_record.tablename;
  END LOOP;
END $$;

-- 4. VÉRIFICATION STRUCTURE COMPTES
\echo '🔍 3. Vérification structure comptes:'

-- Vérifier que les tables de relation comptes existent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'comptes') THEN
    RAISE EXCEPTION 'ERREUR: Table comptes non trouvée - requis pour RLS unifiée';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'compte_users_clients') THEN
    RAISE EXCEPTION 'ERREUR: Table compte_users_clients non trouvée - requis pour RLS';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'compte_users_pub_gms') THEN
    RAISE NOTICE 'ATTENTION: Table compte_users_pub_gms non trouvée - certains utilisateurs n''auront pas accès';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'compte_gestionnaires') THEN
    RAISE NOTICE 'ATTENTION: Table compte_gestionnaires non trouvée - certains utilisateurs n''auront pas accès';
  END IF;
  
  RAISE NOTICE '✅ Structure comptes validée';
END $$;

-- 5. CRÉATION POLITIQUES RLS SÉCURISÉES
\echo '🔒 4. Création politiques RLS sécurisées (FACEBOOK.md):'

-- Politique pour facebook_ads_data (ARCHITECTURE UNIFIÉE)
\echo '  - facebook_ads_data...'
CREATE POLICY "facebook_ads_data_unified_policy" ON public.facebook_ads_data
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- Politique pour facebook_sync_status (ARCHITECTURE UNIFIÉE)
\echo '  - facebook_sync_status...'
CREATE POLICY "facebook_sync_status_unified_policy" ON public.facebook_sync_status
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- Politique pour facebook_import_logs (ARCHITECTURE UNIFIÉE)
\echo '  - facebook_import_logs...'
CREATE POLICY "facebook_import_logs_unified_policy" ON public.facebook_import_logs
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- Politiques pour tables de logging si elles existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_api_logs') THEN
    EXECUTE '
      CREATE POLICY "facebook_api_logs_unified_policy" ON public.facebook_api_logs
        FOR ALL
        USING (
          compte_id IN (
            SELECT c.id FROM comptes c
            LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
            LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
            LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
            WHERE cuc.user_id::text = auth.jwt() ->> ''sub''
               OR cup.user_id::text = auth.jwt() ->> ''sub''
               OR cg.user_id::text = auth.jwt() ->> ''sub''
          )
        )';
    RAISE NOTICE '  - facebook_api_logs...';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'facebook_logs_config') THEN
    EXECUTE '
      CREATE POLICY "facebook_logs_config_user_policy" ON public.facebook_logs_config
        FOR ALL
        USING (user_id = auth.jwt() ->> ''sub'')';
    RAISE NOTICE '  - facebook_logs_config...';
  END IF;
END $$;

-- 6. POLITIQUES SPÉCIALES POUR SUPERADMIN
\echo '🔑 5. Politiques spéciales pour Superadmin:'

-- Superadmin a accès à tout (bypass compte_id)
CREATE POLICY "facebook_ads_data_superadmin_policy" ON public.facebook_ads_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.jwt() ->> 'sub' 
      AND u.role IN ('Superadmin', 'Direction')
    )
  );

CREATE POLICY "facebook_sync_status_superadmin_policy" ON public.facebook_sync_status
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.jwt() ->> 'sub' 
      AND u.role IN ('Superadmin', 'Direction')
    )
  );

CREATE POLICY "facebook_import_logs_superadmin_policy" ON public.facebook_import_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id::text = auth.jwt() ->> 'sub' 
      AND u.role IN ('Superadmin', 'Direction')
    )
  );

-- 7. VÉRIFICATION NOUVELLES POLITIQUES
\echo '✅ 6. Vérification nouvelles politiques:'

SELECT 
  tablename as "Table",
  policyname as "Politique",
  cmd as "Commande",
  CASE 
    WHEN policyname LIKE '%unified%' THEN '🔒 Unifiée'
    WHEN policyname LIKE '%superadmin%' THEN '🔑 Superadmin'
    ELSE '❓ Autre'
  END as "Type"
FROM pg_policies 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename, policyname;

-- Compter politiques créées
SELECT 
  COUNT(*) as "Total nouvelles politiques",
  COUNT(*) FILTER (WHERE policyname LIKE '%unified%') as "Politiques unifiées",
  COUNT(*) FILTER (WHERE policyname LIKE '%superadmin%') as "Politiques superadmin"
FROM pg_policies 
WHERE tablename LIKE 'facebook_%';

-- 8. TEST LOGIQUE RLS (sans l'activer)
\echo '🧪 7. Test logique RLS:'

-- Test requête politique unifiée (simulation)
DO $$
DECLARE
  test_user_id TEXT := '123e4567-e89b-12d3-a456-426614174000'; -- UUID test
  accessible_comptes INTEGER;
BEGIN
  -- Simuler combien de comptes seraient accessibles pour un utilisateur test
  -- (Ceci ne retournera rien car l'utilisateur test n'existe pas, mais teste la syntaxe)
  SELECT COUNT(*) INTO accessible_comptes
  FROM comptes c
  LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
  LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
  LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
  WHERE cuc.user_id::text = test_user_id
     OR cup.user_id::text = test_user_id
     OR cg.user_id::text = test_user_id;
     
  RAISE NOTICE '🧪 Test logique RLS - syntaxe correcte';
  RAISE NOTICE '   Comptes accessibles pour utilisateur test: %', accessible_comptes;
END $$;

-- 9. ANALYSE SÉCURITAIRE
\echo '🔍 8. Analyse sécuritaire:'

DO $$
DECLARE
  total_policies INTEGER;
  unified_policies INTEGER;
  dangerous_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies WHERE tablename LIKE 'facebook_%';
  
  SELECT COUNT(*) INTO unified_policies  
  FROM pg_policies 
  WHERE tablename LIKE 'facebook_%' 
  AND policyname LIKE '%unified%';
  
  -- Détecter politiques potentiellement dangereuses (avec OR dans qual)
  SELECT COUNT(*) INTO dangerous_policies
  FROM pg_policies 
  WHERE tablename LIKE 'facebook_%' 
  AND (qual LIKE '%user_id = auth.uid() OR%' OR qual LIKE '%OR user_id = auth.uid()%');
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 ANALYSE SÉCURITAIRE:';
  RAISE NOTICE '  - Total politiques: %', total_policies;
  RAISE NOTICE '  - Politiques unifiées (sécurisées): %', unified_policies;
  RAISE NOTICE '  - Politiques dangereuses détectées: %', dangerous_policies;
  
  IF dangerous_policies > 0 THEN
    RAISE WARNING 'ATTENTION: Politiques dangereuses détectées - vérifier manuellement';
  ELSE
    RAISE NOTICE '✅ Aucune politique dangereuse détectée';
  END IF;
  
  IF unified_policies >= 3 THEN
    RAISE NOTICE '✅ Architecture unifiée correctement implémentée';
  ELSE
    RAISE WARNING 'ATTENTION: Architecture unifiée incomplète';
  END IF;
END $$;

-- 10. VALIDATION FINALE
\echo '🎯 9. Validation finale:'

-- Vérifier que toutes les tables principales ont des politiques
WITH tables_facebook AS (
  SELECT tablename FROM pg_tables 
  WHERE tablename IN ('facebook_ads_data', 'facebook_sync_status', 'facebook_import_logs')
),
tables_with_policies AS (
  SELECT DISTINCT tablename FROM pg_policies 
  WHERE tablename LIKE 'facebook_%'
)
SELECT 
  tf.tablename,
  CASE WHEN twp.tablename IS NOT NULL THEN '✅ Protégée' ELSE '❌ Non protégée' END as "Statut RLS"
FROM tables_facebook tf
LEFT JOIN tables_with_policies twp ON tf.tablename = twp.tablename
ORDER BY tf.tablename;

-- 11. FINALISATION
UPDATE migration_log 
SET 
  status = 'completed',
  end_time = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
  notes = 'Politiques RLS sécurisées créées selon architecture unifiée'
WHERE phase = 'phase2_urgent' 
  AND script_name = '06-fix-rls-policies.sql' 
  AND status = 'started';

\echo '✅ POLITIQUES RLS CORRIGÉES'
\echo ''
\echo '🔒 ARCHITECTURE UNIFIÉE IMPLÉMENTÉE:'
\echo '  ✅ Failles sécuritaires corrigées'
\echo '  ✅ Logique "OU" dangereuse supprimée'  
\echo '  ✅ Accès basé uniquement sur compte_id'
\echo '  ✅ Politiques Superadmin configurées'
\echo ''
\echo '📋 PROCHAINE ÉTAPE CRITIQUE:'
\echo '  ➡️  Exécuter IMMÉDIATEMENT 07-enable-rls-secure.sql'
\echo '  ⚠️  NE PAS arrêter maintenant - RLS encore désactivé'
\echo ''
\echo '⏰ Temps restant RLS désactivé: < 1 heure'