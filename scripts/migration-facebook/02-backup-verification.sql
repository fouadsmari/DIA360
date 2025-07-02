-- =====================================
-- 02 - VÉRIFICATION BACKUP
-- =====================================
-- Ce script vérifie qu'un backup est disponible et valide
-- IMPACT : Aucun (lecture seule)
-- DURÉE : 1-2 minutes

\echo '💾 DÉBUT VÉRIFICATION BACKUP...'

-- 1. INFORMATIONS GÉNÉRALES BASE
\echo '📊 1. Informations base de données:'
SELECT 
  current_database() as "Base de données",
  current_user as "Utilisateur",
  version() as "Version PostgreSQL",
  now() as "Timestamp vérification";

-- 2. TAILLE TOTALE À SAUVEGARDER
\echo '💾 2. Taille totale des données Facebook:'
WITH facebook_tables AS (
  SELECT 
    schemaname,
    tablename,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
  FROM pg_tables 
  WHERE tablename LIKE 'facebook_%'
)
SELECT 
  COUNT(*) as "Nombre tables Facebook",
  pg_size_pretty(SUM(size_bytes)) as "Taille totale à sauvegarder",
  SUM(size_bytes) as "Taille en bytes"
FROM facebook_tables;

-- 3. DÉTAIL PAR TABLE
\echo '📋 3. Détail par table:'
SELECT 
  tablename as "Table",
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as "Taille",
  (SELECT COUNT(*) FROM facebook_ads_data WHERE tablename = 'facebook_ads_data') as "Nb lignes"
FROM pg_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- 4. VÉRIFICATION ESPACE DISQUE (approximation)
\echo '💿 4. Vérification espace:'
SELECT 
  pg_database_size(current_database()) as "Taille DB actuelle (bytes)",
  pg_size_pretty(pg_database_size(current_database())) as "Taille DB lisible";

-- 5. ACTIVITÉ EN COURS
\echo '🔄 5. Activité en cours sur tables Facebook:'
SELECT 
  query,
  state,
  query_start,
  state_change
FROM pg_stat_activity 
WHERE query ILIKE '%facebook_%' 
  AND state != 'idle'
  AND pid != pg_backend_pid();

-- 6. LOCKS ACTIFS
\echo '🔒 6. Verrous actifs sur tables Facebook:'
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass as "Table",
  l.mode,
  l.granted,
  a.query
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text LIKE 'facebook_%';

-- 7. DERNIÈRE MODIFICATION DES TABLES
\echo '📅 7. Dernière activité tables Facebook:'
SELECT 
  schemaname,
  tablename,
  n_tup_ins as "Insertions",
  n_tup_upd as "Mises à jour", 
  n_tup_del as "Suppressions",
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename LIKE 'facebook_%'
ORDER BY tablename;

-- 8. CHECKLIST BACKUP
\echo '✅ 8. CHECKLIST BACKUP OBLIGATOIRE:'
\echo ''
\echo '❗ ATTENTION: Cette migration modifie des structures critiques.'
\echo '❗ Un backup complet est OBLIGATOIRE avant de continuer.'
\echo ''
\echo '📋 CHECKLIST BACKUP:'
\echo '  □ 1. Backup complet Supabase via dashboard'
\echo '  □ 2. Export manuel des tables Facebook'
\echo '  □ 3. Sauvegarde des politiques RLS'
\echo '  □ 4. Export de la structure (schema)'
\echo '  □ 5. Test de restauration sur env. test'
\echo ''
\echo '🔧 COMMANDES BACKUP MANUELLES:'

-- Génération des commandes d'export
DO $$
DECLARE
  table_name text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '-- EXPORT MANUEL DES DONNÉES:';
  FOR table_name IN 
    SELECT tablename FROM pg_tables WHERE tablename LIKE 'facebook_%'
  LOOP
    RAISE NOTICE 'COPY % TO ''/tmp/backup_%.csv'' WITH CSV HEADER;', table_name, table_name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '-- EXPORT STRUCTURE:';
  RAISE NOTICE 'pg_dump -h [host] -U [user] -d [database] --schema-only --table=''facebook_*'' > facebook_schema_backup.sql';
  
  RAISE NOTICE '';
  RAISE NOTICE '-- EXPORT COMPLET:';
  RAISE NOTICE 'pg_dump -h [host] -U [user] -d [database] --table=''facebook_*'' > facebook_complete_backup.sql';
END $$;

-- 9. VÉRIFICATION PRÉREQUIS MIGRATION
\echo '🔍 9. Vérification prérequis migration:'

-- Vérifier permissions
SELECT 
  has_table_privilege('facebook_ads_data', 'INSERT,UPDATE,DELETE,TRUNCATE') as "Permissions facebook_ads_data",
  has_table_privilege('facebook_sync_status', 'INSERT,UPDATE,DELETE,TRUNCATE') as "Permissions facebook_sync_status",
  has_table_privilege('facebook_import_logs', 'INSERT,UPDATE,DELETE,TRUNCATE') as "Permissions facebook_import_logs";

-- Vérifier connexions actives
SELECT 
  COUNT(*) as "Connexions actives",
  COUNT(*) FILTER (WHERE state = 'active') as "Requêtes actives"
FROM pg_stat_activity 
WHERE datname = current_database();

-- 10. STATUT FINAL
\echo '🎯 10. STATUT FINAL:'
DO $$
DECLARE
  total_records integer;
  total_size bigint;
BEGIN
  -- Compter total enregistrements
  SELECT 
    (SELECT COUNT(*) FROM facebook_ads_data) +
    (SELECT COUNT(*) FROM facebook_sync_status) +
    (SELECT COUNT(*) FROM facebook_import_logs)
  INTO total_records;
  
  -- Calculer taille totale
  SELECT SUM(pg_total_relation_size('public.'||tablename))
  FROM pg_tables 
  WHERE tablename LIKE 'facebook_%'
  INTO total_size;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ BACKUP:';
  RAISE NOTICE '  - Total enregistrements: %', total_records;
  RAISE NOTICE '  - Taille totale: %', pg_size_pretty(total_size);
  RAISE NOTICE '  - Tables à sauvegarder: %', (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'facebook_%');
  
  IF total_records > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  DONNÉES DÉTECTÉES - BACKUP OBLIGATOIRE';
    RAISE NOTICE '❌ NE PAS CONTINUER sans backup complet';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Pas de données existantes - Migration simplifiée possible';
  END IF;
END $$;

\echo ''
\echo '📋 PROCHAINES ÉTAPES:'
\echo '  1. Effectuer le backup complet si des données existent'
\echo '  2. Tester la restauration en environnement de test'
\echo '  3. Une fois le backup validé, exécuter 03-prepare-migration.sql'
\echo ''
\echo '⚠️  IMPORTANT: Ne jamais continuer sans backup validé !'