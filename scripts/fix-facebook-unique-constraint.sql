-- =====================================
-- FIX CONTRAINTE UNIQUE FACEBOOK
-- =====================================
-- Simplifie la contrainte pour éviter les conflits avec NULL

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE facebook_ads_data DROP CONSTRAINT IF EXISTS facebook_ads_data_unique_key;

-- 2. Créer nouvelle contrainte simplifiée
ALTER TABLE facebook_ads_data 
ADD CONSTRAINT facebook_ads_data_unique_simple 
UNIQUE (compte_id, ad_id, date_start, date_stop);

-- 3. Vérifier la nouvelle contrainte
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'facebook_ads_data'::regclass 
AND contype = 'u';