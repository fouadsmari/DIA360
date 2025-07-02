-- PURGE COMPLÈTE DES DONNÉES MOCK/FAKE - RESPECT MAITRE
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer TOUTES les données Facebook générées (probablement mock)
DELETE FROM facebook_ads_data;

-- 2. Supprimer les statuts de sync (tous liés aux données mock)
DELETE FROM facebook_sync_status;

-- 3. Reset des séquences pour repartir à zéro
ALTER SEQUENCE facebook_ads_data_id_seq RESTART WITH 1;
ALTER SEQUENCE facebook_sync_status_id_seq RESTART WITH 1;

-- 4. Vérification que les tables sont vides
SELECT 'facebook_ads_data' as table_name, count(*) as remaining_rows FROM facebook_ads_data
UNION ALL
SELECT 'facebook_sync_status' as table_name, count(*) as remaining_rows FROM facebook_sync_status;

-- 5. Commentaire de confirmation
COMMENT ON TABLE facebook_ads_data IS 'Table purgée - MAITRE compliance: aucune donnée mock/fake autorisée';