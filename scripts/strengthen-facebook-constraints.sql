-- MAITRE: Renforcement des contraintes Facebook pour éviter futurs doublons
-- Protection contre boucles d'appels API et données corrompues

-- 1. Index pour performance et contraintes
CREATE INDEX IF NOT EXISTS idx_facebook_ads_unique 
ON facebook_ads_data (compte_id, ad_id, date_start, date_stop);

CREATE INDEX IF NOT EXISTS idx_facebook_ads_created_at 
ON facebook_ads_data (created_at DESC);

-- 2. Contrainte UNIQUE renforcée sur facebook_ads_data
ALTER TABLE facebook_ads_data 
DROP CONSTRAINT IF EXISTS facebook_ads_data_unique_simple,
DROP CONSTRAINT IF EXISTS facebook_ads_data_unique_enforced;

-- Contrainte stricte - empêche TOUT doublon
ALTER TABLE facebook_ads_data 
ADD CONSTRAINT facebook_ads_data_no_duplicates 
UNIQUE (compte_id, ad_id, date_start, date_stop);

-- 3. Contrainte pour éviter données invalides
ALTER TABLE facebook_ads_data 
ADD CONSTRAINT facebook_ads_data_valid_dates 
CHECK (date_start <= date_stop);

ALTER TABLE facebook_ads_data 
ADD CONSTRAINT facebook_ads_data_positive_metrics 
CHECK (
    spend >= 0 AND 
    impressions >= 0 AND 
    clicks >= 0 AND 
    reach >= 0
);

-- 4. Contrainte sur logs pour limiter volume
CREATE INDEX IF NOT EXISTS idx_facebook_logs_cleanup 
ON facebook_api_logs (compte_id, facebook_account_id, api_endpoint, created_at);

-- 5. Trigger pour auto-nettoyage des vieux logs (garde 30 jours max)
CREATE OR REPLACE FUNCTION cleanup_old_facebook_logs()
RETURNS trigger AS $$
BEGIN
    -- Supprimer logs > 30 jours
    DELETE FROM facebook_api_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencher nettoyage après chaque insertion
DROP TRIGGER IF EXISTS trigger_cleanup_facebook_logs ON facebook_api_logs;
CREATE TRIGGER trigger_cleanup_facebook_logs
    AFTER INSERT ON facebook_api_logs
    EXECUTE FUNCTION cleanup_old_facebook_logs();

-- 6. Fonction pour vérifier intégrité des données
CREATE OR REPLACE FUNCTION check_facebook_data_integrity()
RETURNS TABLE(
    check_name text,
    status text,
    details text
) AS $$
BEGIN
    -- Vérifier doublons
    RETURN QUERY
    SELECT 
        'Doublons facebook_ads_data'::text,
        CASE 
            WHEN duplicate_count = 0 THEN 'OK'::text
            ELSE 'ERREUR'::text
        END,
        CONCAT(duplicate_count, ' doublons détectés')::text
    FROM (
        SELECT COUNT(*) as duplicate_count
        FROM (
            SELECT compte_id, ad_id, date_start, date_stop
            FROM facebook_ads_data 
            GROUP BY compte_id, ad_id, date_start, date_stop
            HAVING COUNT(*) > 1
        ) dups
    ) dup_check;
    
    -- Vérifier données invalides
    RETURN QUERY
    SELECT 
        'Données invalides'::text,
        CASE 
            WHEN invalid_count = 0 THEN 'OK'::text
            ELSE 'ATTENTION'::text
        END,
        CONCAT(invalid_count, ' lignes avec métriques négatives')::text
    FROM (
        SELECT COUNT(*) as invalid_count
        FROM facebook_ads_data 
        WHERE spend < 0 OR impressions < 0 OR clicks < 0 OR reach < 0
    ) invalid_check;
    
    -- Vérifier dates cohérentes
    RETURN QUERY
    SELECT 
        'Dates cohérentes'::text,
        CASE 
            WHEN date_errors = 0 THEN 'OK'::text
            ELSE 'ERREUR'::text
        END,
        CONCAT(date_errors, ' lignes avec date_start > date_stop')::text
    FROM (
        SELECT COUNT(*) as date_errors
        FROM facebook_ads_data 
        WHERE date_start > date_stop
    ) date_check;
    
END;
$$ LANGUAGE plpgsql;

-- 7. Vue pour monitoring santé des données
CREATE OR REPLACE VIEW facebook_data_health AS
SELECT 
    'Total publicités' as metric,
    COUNT(*)::text as value,
    'lignes' as unit
FROM facebook_ads_data

UNION ALL

SELECT 
    'Comptes distincts' as metric,
    COUNT(DISTINCT compte_id)::text as value,
    'comptes' as unit
FROM facebook_ads_data

UNION ALL

SELECT 
    'Période couverte' as metric,
    CONCAT(
        MIN(date_start)::text, 
        ' à ', 
        MAX(date_stop)::text
    ) as value,
    'dates' as unit
FROM facebook_ads_data

UNION ALL

SELECT 
    'Logs API récents' as metric,
    COUNT(*)::text as value,
    'logs 24h' as unit
FROM facebook_api_logs 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 8. Exécuter vérification d'intégrité
SELECT * FROM check_facebook_data_integrity();