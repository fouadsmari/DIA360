-- MAITRE: Script pour nettoyer TOUTES les sources de cache Facebook
-- Utiliser quand les données persistent malgré les autres nettoyages

-- 1. Vérifier avant nettoyage
SELECT 
    'AVANT NETTOYAGE' as phase,
    (SELECT COUNT(*) FROM facebook_ads_data) as ads_data,
    (SELECT COUNT(*) FROM facebook_api_logs) as api_logs,
    (SELECT COUNT(*) FROM facebook_sync_status) as sync_status;

-- 2. Supprimer TOUTES les données Facebook
DELETE FROM facebook_ads_data WHERE id IS NOT NULL;
DELETE FROM facebook_api_logs WHERE id IS NOT NULL;  
DELETE FROM facebook_sync_status WHERE id IS NOT NULL;

-- 3. Réinitialiser les séquences
SELECT setval(pg_get_serial_sequence('facebook_ads_data', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('facebook_api_logs', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('facebook_sync_status', 'id'), 1, false);

-- 4. Vérifier après nettoyage
SELECT 
    'APRÈS NETTOYAGE' as phase,
    (SELECT COUNT(*) FROM facebook_ads_data) as ads_data,
    (SELECT COUNT(*) FROM facebook_api_logs) as api_logs,
    (SELECT COUNT(*) FROM facebook_sync_status) as sync_status;

-- 5. Message final
SELECT 
    '✅ NETTOYAGE COMPLET TERMINÉ' as status,
    'Toutes sources Facebook supprimées - localStorage à vider côté client' as message,
    NOW() as timestamp;