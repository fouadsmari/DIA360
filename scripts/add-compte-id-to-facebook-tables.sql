-- Migration pour ajouter compte_id aux tables Facebook
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne compte_id à facebook_ads_data
ALTER TABLE facebook_ads_data 
ADD COLUMN IF NOT EXISTS compte_id INTEGER REFERENCES comptes(id);

-- 2. Ajouter la colonne compte_id à facebook_sync_status  
ALTER TABLE facebook_sync_status
ADD COLUMN IF NOT EXISTS compte_id INTEGER REFERENCES comptes(id);

-- 3. Ajouter la colonne sync_id pour un meilleur tracking
ALTER TABLE facebook_sync_status
ADD COLUMN IF NOT EXISTS sync_id VARCHAR(255);

-- 4. Ajouter last_sync_at pour un meilleur suivi
ALTER TABLE facebook_sync_status
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- 5. Créer un index pour optimiser les requêtes par compte
CREATE INDEX IF NOT EXISTS idx_facebook_ads_data_compte_id 
ON facebook_ads_data(compte_id);

CREATE INDEX IF NOT EXISTS idx_facebook_ads_data_compte_date 
ON facebook_ads_data(compte_id, date_start);

CREATE INDEX IF NOT EXISTS idx_facebook_sync_status_compte 
ON facebook_sync_status(compte_id, account_id);

-- 6. Mettre à jour les politiques RLS pour inclure compte_id
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own facebook data" ON facebook_ads_data;
DROP POLICY IF EXISTS "Users can insert their own facebook data" ON facebook_ads_data;
DROP POLICY IF EXISTS "Users can update their own facebook data" ON facebook_ads_data;
DROP POLICY IF EXISTS "Users can delete their own facebook data" ON facebook_ads_data;

-- Nouvelles politiques avec support compte_id
CREATE POLICY "Users can view facebook data for their comptes" ON facebook_ads_data
FOR SELECT USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM comptes c
    LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
    LEFT JOIN compte_users_pub_gms cupg ON c.id = cupg.compte_id  
    LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
    WHERE c.id = facebook_ads_data.compte_id
    AND (cuc.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cupg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid()))
  ) OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role IN ('Superadmin', 'Direction')
  )
);

CREATE POLICY "Users can insert facebook data for their comptes" ON facebook_ads_data
FOR INSERT WITH CHECK (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM comptes c
    LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
    LEFT JOIN compte_users_pub_gms cupg ON c.id = cupg.compte_id
    LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
    WHERE c.id = facebook_ads_data.compte_id
    AND (cuc.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cupg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid()) 
         OR cg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid()))
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('Superadmin', 'Direction')
  )
);

CREATE POLICY "Users can update facebook data for their comptes" ON facebook_ads_data
FOR UPDATE USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM comptes c
    LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
    LEFT JOIN compte_users_pub_gms cupg ON c.id = cupg.compte_id
    LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
    WHERE c.id = facebook_ads_data.compte_id
    AND (cuc.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cupg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid()))
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('Superadmin', 'Direction')
  )
);

CREATE POLICY "Users can delete facebook data for their comptes" ON facebook_ads_data
FOR DELETE USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM comptes c
    LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
    LEFT JOIN compte_users_pub_gms cupg ON c.id = cupg.compte_id
    LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
    WHERE c.id = facebook_ads_data.compte_id
    AND (cuc.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cupg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid())
         OR cg.user_id = (SELECT id FROM users WHERE users.auth_user_id = auth.uid()))
  ) OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('Superadmin', 'Direction')
  )
);

-- 7. Créer une vue pour faciliter les requêtes avec noms des comptes
CREATE OR REPLACE VIEW facebook_ads_with_compte_info AS
SELECT 
  fad.*,
  c.entreprise as compte_name,
  c.budget as compte_budget
FROM facebook_ads_data fad
LEFT JOIN comptes c ON fad.compte_id = c.id;

-- 8. Fonction pour nettoyer les anciennes données de sync
CREATE OR REPLACE FUNCTION cleanup_old_sync_status()
RETURNS void AS $$
BEGIN
  DELETE FROM facebook_sync_status 
  WHERE status = 'completed' 
  AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 9. Commentaires pour documentation
COMMENT ON COLUMN facebook_ads_data.compte_id IS 'Référence vers le compte client (comptes.id)';
COMMENT ON COLUMN facebook_sync_status.compte_id IS 'Référence vers le compte client (comptes.id)';
COMMENT ON COLUMN facebook_sync_status.sync_id IS 'Identifiant unique pour le processus de synchronisation';
COMMENT ON COLUMN facebook_sync_status.last_sync_at IS 'Dernière mise à jour du statut de synchronisation';

-- 10. Afficher un résumé de la migration
DO $$
BEGIN
  RAISE NOTICE 'Migration terminée avec succès!';
  RAISE NOTICE '- Colonne compte_id ajoutée aux tables Facebook';
  RAISE NOTICE '- Index créés pour optimiser les performances';
  RAISE NOTICE '- Politiques RLS mises à jour pour supporter les comptes clients';
  RAISE NOTICE '- Vue facebook_ads_with_compte_info créée';
END $$;