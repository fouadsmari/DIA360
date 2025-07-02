-- =====================================
-- 03 - PRÉPARATION MIGRATION
-- =====================================
-- Ce script prépare la migration (tables temporaires, vérifications)
-- IMPACT : Minimal (création tables temporaires)
-- DURÉE : 2-3 minutes

\echo '🔧 DÉBUT PRÉPARATION MIGRATION...'

-- 1. CRÉATION TABLES DE SUIVI MIGRATION
\echo '📋 1. Création tables de suivi:'

-- Table de log de migration
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(50) NOT NULL,
  script_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('started', 'completed', 'failed', 'rollback')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  rows_affected INTEGER DEFAULT 0,
  error_message TEXT,
  notes TEXT
);

-- Table de sauvegarde des anciennes structures
CREATE TABLE IF NOT EXISTS migration_backup_info (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100),
  old_definition TEXT,
  new_definition TEXT,
  backup_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enregistrer le début de la migration
INSERT INTO migration_log (phase, script_name, status, notes)
VALUES ('preparation', '03-prepare-migration.sql', 'started', 'Début préparation migration Facebook');

-- 2. SAUVEGARDE STRUCTURE ACTUELLE
\echo '💾 2. Sauvegarde structure actuelle:'

-- Sauvegarder définitions colonnes facebook_ads_data
INSERT INTO migration_backup_info (table_name, column_name, old_definition)
SELECT 
  'facebook_ads_data',
  column_name,
  column_name || ' ' || data_type || 
  CASE 
    WHEN character_maximum_length IS NOT NULL 
    THEN '(' || character_maximum_length || ')'
    ELSE ''
  END ||
  CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
  CASE 
    WHEN column_default IS NOT NULL 
    THEN ' DEFAULT ' || column_default
    ELSE ''
  END
FROM information_schema.columns 
WHERE table_name = 'facebook_ads_data'
ORDER BY ordinal_position;

-- Sauvegarder définitions index
INSERT INTO migration_backup_info (table_name, column_name, old_definition)
SELECT 
  'indexes',
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename LIKE 'facebook_%';

-- Sauvegarder politiques RLS
INSERT INTO migration_backup_info (table_name, column_name, old_definition)
SELECT 
  'rls_policies',
  policyname,
  'ON ' || tablename || ' FOR ' || cmd || ' USING (' || qual || ')' ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END
FROM pg_policies 
WHERE tablename LIKE 'facebook_%';

-- 3. VÉRIFICATIONS PRÉ-MIGRATION
\echo '🔍 3. Vérifications pré-migration:'

-- Vérifier absence de transactions longues
DO $$
DECLARE
  long_tx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO long_tx_count
  FROM pg_stat_activity 
  WHERE state != 'idle' 
    AND query_start < NOW() - INTERVAL '5 minutes'
    AND query ILIKE '%facebook_%';
    
  IF long_tx_count > 0 THEN
    RAISE WARNING 'ATTENTION: % transactions longues détectées sur tables Facebook', long_tx_count;
    RAISE NOTICE 'Considérer attendre la fin de ces transactions avant migration';
  ELSE
    RAISE NOTICE '✅ Pas de transactions longues détectées';
  END IF;
END $$;

-- Vérifier espace disque disponible
DO $$
DECLARE
  current_size BIGINT;
  estimated_temp_space BIGINT;
BEGIN
  SELECT SUM(pg_total_relation_size('public.'||tablename))
  FROM pg_tables 
  WHERE tablename LIKE 'facebook_%'
  INTO current_size;
  
  -- Estimer espace temporaire nécessaire (2x la taille actuelle)
  estimated_temp_space := current_size * 2;
  
  RAISE NOTICE '📊 Estimation espace requis:';
  RAISE NOTICE '  - Taille actuelle: %', pg_size_pretty(current_size);
  RAISE NOTICE '  - Espace temporaire estimé: %', pg_size_pretty(estimated_temp_space);
  RAISE NOTICE '  - Recommandation: avoir au moins % libre', pg_size_pretty(estimated_temp_space * 1.5);
END $$;

-- 4. CRÉATION TABLES TEMPORAIRES POUR MIGRATION
\echo '🔄 4. Création tables temporaires:'

-- Table temporaire pour mapping user_id -> compte_id
CREATE TEMP TABLE IF NOT EXISTS user_compte_mapping AS
WITH user_comptes AS (
  -- Mapping depuis compte_users_clients
  SELECT DISTINCT 
    u.id::text as user_id,
    cuc.compte_id,
    'client' as relation_type
  FROM users u
  JOIN compte_users_clients cuc ON u.id = cuc.user_id
  
  UNION ALL
  
  -- Mapping depuis compte_users_pub_gms  
  SELECT DISTINCT
    u.id::text as user_id,
    cup.compte_id, 
    'pub_gm' as relation_type
  FROM users u
  JOIN compte_users_pub_gms cup ON u.id = cup.user_id
  
  UNION ALL
  
  -- Mapping depuis compte_gestionnaires
  SELECT DISTINCT
    u.id::text as user_id,
    cg.compte_id,
    'gestionnaire' as relation_type  
  FROM users u
  JOIN compte_gestionnaires cg ON u.id = cg.user_id
)
SELECT 
  user_id,
  compte_id,
  STRING_AGG(relation_type, ',') as relation_types,
  COUNT(*) as relation_count
FROM user_comptes
GROUP BY user_id, compte_id;

-- Vérifier le mapping
SELECT 
  COUNT(*) as "Total mappings user->compte",
  COUNT(DISTINCT user_id) as "Users uniques", 
  COUNT(DISTINCT compte_id) as "Comptes uniques"
FROM user_compte_mapping;

-- 5. VALIDATION DONNÉES EXISTANTES
\echo '✅ 5. Validation données existantes:'

-- Compter enregistrements par type d'architecture
DO $$
DECLARE
  legacy_count INTEGER; -- user_id seulement
  unified_count INTEGER; -- compte_id seulement  
  mixed_count INTEGER; -- les deux
  orphan_count INTEGER; -- ni l'un ni l'autre
BEGIN
  -- Architecture legacy (user_id UUID seulement)
  SELECT COUNT(*) INTO legacy_count
  FROM facebook_ads_data 
  WHERE user_id IS NOT NULL AND compte_id IS NULL;
  
  -- Architecture unifiée (compte_id seulement)
  SELECT COUNT(*) INTO unified_count
  FROM facebook_ads_data 
  WHERE compte_id IS NOT NULL AND user_id IS NULL;
  
  -- Architecture mixte (les deux)
  SELECT COUNT(*) INTO mixed_count
  FROM facebook_ads_data 
  WHERE user_id IS NOT NULL AND compte_id IS NOT NULL;
  
  -- Données orphelines
  SELECT COUNT(*) INTO orphan_count
  FROM facebook_ads_data 
  WHERE user_id IS NULL AND compte_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 ANALYSE ARCHITECTURE DONNÉES:';
  RAISE NOTICE '  - Legacy (user_id seulement): %', legacy_count;
  RAISE NOTICE '  - Unifiée (compte_id seulement): %', unified_count;
  RAISE NOTICE '  - Mixte (user_id + compte_id): %', mixed_count;
  RAISE NOTICE '  - Orphelines (aucun): %', orphan_count;
  
  -- Déterminer stratégie de migration
  IF legacy_count > 0 AND unified_count = 0 AND mixed_count = 0 THEN
    RAISE NOTICE '🔄 STRATÉGIE: Migration complète legacy -> unifiée';
  ELSIF unified_count > 0 AND legacy_count = 0 AND mixed_count = 0 THEN
    RAISE NOTICE '✅ STRATÉGIE: Déjà en architecture unifiée, ajustements mineurs';
  ELSIF mixed_count > 0 THEN
    RAISE NOTICE '⚠️  STRATÉGIE: Architecture mixte, consolidation requise';
  ELSE
    RAISE NOTICE '🆕 STRATÉGIE: Pas de données, création structure propre';
  END IF;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'ATTENTION: % enregistrements orphelines détectés', orphan_count;
  END IF;
END $$;

-- 6. DÉTECTION CONFLITS POTENTIELS
\echo '⚠️  6. Détection conflits potentiels:'

-- Conflits de contraintes uniques après migration
WITH potential_duplicates AS (
  SELECT 
    COALESCE(fad.compte_id, ucm.compte_id) as target_compte_id,
    fad.ad_id,
    fad.date_start,
    fad.date_stop,
    fad.age,
    fad.gender,
    fad.country,
    fad.publisher_platform,
    fad.platform_position,
    fad.impression_device,
    COUNT(*) as duplicate_count
  FROM facebook_ads_data fad
  LEFT JOIN user_compte_mapping ucm ON fad.user_id::text = ucm.user_id
  WHERE COALESCE(fad.compte_id, ucm.compte_id) IS NOT NULL
  GROUP BY 1,2,3,4,5,6,7,8,9,10
  HAVING COUNT(*) > 1
)
SELECT 
  COUNT(*) as "Conflits contrainte unique potentiels",
  SUM(duplicate_count) as "Total enregistrements en conflit"
FROM potential_duplicates;

-- 7. PLAN D'EXÉCUTION RECOMMANDÉ
\echo '📋 7. Plan d\'exécution recommandé:'

DO $$
DECLARE
  total_records INTEGER;
  has_data BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_records FROM facebook_ads_data;
  has_data := total_records > 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 PLAN D''EXÉCUTION RECOMMANDÉ:';
  
  IF has_data THEN
    RAISE NOTICE '  Phase 2 (URGENT - 24h max):';
    RAISE NOTICE '    ✓ 04-disable-rls-temporarily.sql';
    RAISE NOTICE '    ✓ 05-add-missing-columns.sql';  
    RAISE NOTICE '    ✓ 06-fix-rls-policies.sql';
    RAISE NOTICE '    ✓ 07-enable-rls-secure.sql';
    RAISE NOTICE '';
    RAISE NOTICE '  Phase 3 (Migration complète - week-end):';
    RAISE NOTICE '    ✓ 08-migrate-data-types.sql';
    RAISE NOTICE '    ✓ 09-update-constraints.sql';
    RAISE NOTICE '    ✓ 10-rebuild-indexes.sql';
    RAISE NOTICE '    ✓ 11-add-materialized-views.sql';
  ELSE
    RAISE NOTICE '  Migration simplifiée (pas de données):';
    RAISE NOTICE '    ✓ 04-05-06-07 (corrections structure)';
    RAISE NOTICE '    ✓ 08-09-10-11 (optimisations)';
    RAISE NOTICE '    ⚠️  Temps d''exécution réduit';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '  Phase 4 (Validation):';
  RAISE NOTICE '    ✓ 12-validate-migration.sql';
  RAISE NOTICE '    ✓ 13-cleanup-old-structure.sql';
  RAISE NOTICE '    ✓ 14-performance-tests.sql';
END $$;

-- 8. FINALISATION PRÉPARATION
UPDATE migration_log 
SET 
  status = 'completed',
  end_time = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
  notes = 'Préparation terminée avec succès'
WHERE phase = 'preparation' AND script_name = '03-prepare-migration.sql' AND status = 'started';

\echo '✅ PRÉPARATION TERMINÉE'
\echo ''
\echo '📋 PROCHAINES ÉTAPES:'
\echo '  1. Vérifier le plan d''exécution recommandé ci-dessus'
\echo '  2. Planifier la fenêtre de maintenance pour Phase 2'
\echo '  3. Notifier l''équipe du début de migration'
\echo '  4. Exécuter 04-disable-rls-temporarily.sql'
\echo ''
\echo '⚠️  RAPPEL: Backup validé obligatoire avant Phase 2 !'

-- Afficher résumé final
SELECT 
  phase,
  script_name,
  status,
  duration_seconds,
  notes
FROM migration_log 
ORDER BY start_time DESC 
LIMIT 5;