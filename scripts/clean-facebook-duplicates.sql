-- MAITRE: Script de nettoyage des données Facebook dupliquées
-- URGENT: Nettoie les doublons créés par les boucles d'appels API

-- 1. Identifier les doublons dans facebook_ads_data
SELECT 
    compte_id, 
    ad_id, 
    date_start, 
    date_stop,
    COUNT(*) as duplicate_count,
    array_agg(ctid) as row_ids
FROM facebook_ads_data 
GROUP BY compte_id, ad_id, date_start, date_stop
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Supprimer les doublons en gardant le plus récent (created_at)
WITH duplicates AS (
    SELECT 
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY compte_id, ad_id, date_start, date_stop 
            ORDER BY created_at DESC
        ) as rn
    FROM facebook_ads_data
)
DELETE FROM facebook_ads_data 
WHERE ctid IN (
    SELECT ctid FROM duplicates WHERE rn > 1
);

-- 3. Vérifier les doublons dans facebook_api_logs
SELECT 
    compte_id,
    facebook_account_id,
    api_endpoint,
    DATE(created_at) as log_date,
    COUNT(*) as duplicate_count
FROM facebook_api_logs
GROUP BY compte_id, facebook_account_id, api_endpoint, DATE(created_at)
HAVING COUNT(*) > 10  -- Plus de 10 logs par jour = suspects
ORDER BY duplicate_count DESC;

-- 4. Nettoyer les logs excessifs (garder max 5 par jour/endpoint)
WITH log_cleanup AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY compte_id, facebook_account_id, api_endpoint, DATE(created_at)
            ORDER BY created_at DESC
        ) as rn
    FROM facebook_api_logs
)
DELETE FROM facebook_api_logs 
WHERE id IN (
    SELECT id FROM log_cleanup WHERE rn > 5
);

-- 5. Renforcer contrainte UNIQUE sur facebook_ads_data
-- D'abord supprimer l'ancienne contrainte si elle existe
ALTER TABLE facebook_ads_data 
DROP CONSTRAINT IF EXISTS facebook_ads_data_unique_simple;

-- Créer nouvelle contrainte renforcée
ALTER TABLE facebook_ads_data 
ADD CONSTRAINT facebook_ads_data_unique_enforced 
UNIQUE (compte_id, ad_id, date_start, date_stop);

-- 6. Statistiques après nettoyage
SELECT 
    'facebook_ads_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT (compte_id, ad_id, date_start, date_stop)) as unique_combinations
FROM facebook_ads_data

UNION ALL

SELECT 
    'facebook_api_logs' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT (compte_id, facebook_account_id, api_endpoint, DATE(created_at))) as unique_combinations
FROM facebook_api_logs;

-- 7. Vérification finale - plus aucun doublon
SELECT 
    'Vérification doublons' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'OK - Aucun doublon détecté'
        ELSE CONCAT('ATTENTION - ', COUNT(*), ' doublons restants')
    END as status
FROM (
    SELECT compte_id, ad_id, date_start, date_stop
    FROM facebook_ads_data 
    GROUP BY compte_id, ad_id, date_start, date_stop
    HAVING COUNT(*) > 1
) duplicates_check;