-- MAITRE: Nettoyage des données Facebook monthly existantes
-- Suppression des données incorrectes avant test des nouvelles modifications

-- 1. Vérifier d'abord ce qu'on a dans la base
SELECT 
    'Avant nettoyage' as phase,
    COUNT(*) as total_lignes,
    COUNT(DISTINCT compte_id) as comptes_distincts,
    COUNT(DISTINCT ad_id) as ads_distincts,
    MIN(date_start) as date_min,
    MAX(date_stop) as date_max,
    MIN(created_at) as premiere_insertion,
    MAX(created_at) as derniere_insertion
FROM facebook_ads_data;

-- 2. Identifier les données monthly suspectes
-- (généralement les données avec date_start = début du mois et date_stop = fin du mois)
SELECT 
    'Données Monthly détectées' as type,
    COUNT(*) as lignes_monthly,
    ad_id,
    ad_name,
    date_start,
    date_stop,
    created_at
FROM facebook_ads_data
WHERE 
    -- Détection monthly: date_start = 1er du mois ET date_stop = dernier jour du mois
    (EXTRACT(DAY FROM date_start::date) = 1 AND 
     EXTRACT(DAY FROM date_stop::date) >= 28) OR
    -- Ou période > 7 jours (probablement monthly)
    (date_stop::date - date_start::date) > 7
ORDER BY created_at DESC
LIMIT 10;

-- 3. SUPPRESSION des données Facebook existantes
-- ⚠️ ATTENTION: Ceci supprime TOUTES les données Facebook pour permettre un nouveau test propre
DELETE FROM facebook_ads_data 
WHERE compte_id IS NOT NULL;

-- 4. Supprimer aussi les logs API pour un fresh start
DELETE FROM facebook_api_logs 
WHERE api_endpoint LIKE '%facebook%';

-- 5. Vérifier après nettoyage
SELECT 
    'Après nettoyage' as phase,
    COUNT(*) as total_lignes,
    COUNT(DISTINCT compte_id) as comptes_distincts,
    COUNT(DISTINCT ad_id) as ads_distincts
FROM facebook_ads_data;

-- 6. Réinitialiser les séquences si nécessaire
SELECT setval('facebook_ads_data_id_seq', 1, false);
SELECT setval('facebook_api_logs_id_seq', 1, false);

-- 7. Vérifier intégrité après nettoyage
SELECT * FROM check_facebook_data_integrity();

-- 8. Afficher message de confirmation
SELECT 
    '✅ NETTOYAGE TERMINÉ' as status,
    'Base de données Facebook nettoyée - prête pour nouveaux tests avec time_increment=1' as message,
    NOW() as timestamp;