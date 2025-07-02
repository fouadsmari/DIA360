-- Migration: Créer table comptes clients et mise à jour utilisateurs
-- Date: 2025-01-02

-- 1. Créer le type enum user_role s'il n'existe pas
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS', 'Client');
EXCEPTION
    WHEN duplicate_object THEN
        -- Le type existe déjà, ajouter Client s'il n'y est pas
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Client' AND enumtypid = 'user_role'::regtype) THEN
            ALTER TYPE user_role ADD VALUE 'Client';
        END IF;
END $$;

-- 2. Mettre à jour la table users pour utiliser le type user_role si elle utilise une colonne text
DO $$ 
BEGIN
    -- Vérifier si la colonne poste existe et son type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'poste' AND data_type = 'text') THEN
        -- Convertir la colonne text en enum
        ALTER TABLE users ALTER COLUMN poste TYPE user_role USING poste::user_role;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'poste') THEN
        -- Ajouter la colonne poste si elle n'existe pas
        ALTER TABLE users ADD COLUMN poste user_role DEFAULT 'PUP';
    END IF;
END $$;

-- 3. Créer la table comptes
CREATE TABLE IF NOT EXISTS comptes (
  id SERIAL PRIMARY KEY,
  entreprise VARCHAR(255) NOT NULL,
  adresse TEXT NOT NULL,
  id_facebook_ads VARCHAR(255),
  id_google_ads VARCHAR(255),
  id_pages_facebook TEXT[], -- Array pour multiples pages
  id_page_instagram TEXT[], -- Array pour multiples pages
  id_compte_tiktok VARCHAR(255),
  id_compte_linkedin VARCHAR(255),
  budget DECIMAL(10, 2),
  objectif_facebook_ads TEXT[] DEFAULT ARRAY[
    'Trafic', 
    'Notoriété', 
    'E-commerce', 
    'Prospects', 
    'Visites en magasin', 
    'Appels', 
    'Infolettres', 
    'Messages', 
    'Contact'
  ],
  objectif_google_ads TEXT[] DEFAULT ARRAY[
    'Trafic', 
    'Notoriété', 
    'E-commerce', 
    'Prospects', 
    'Visites en magasin', 
    'Appels', 
    'Infolettres', 
    'Contact'
  ],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

-- 4. Table de liaison comptes-utilisateurs clients
CREATE TABLE IF NOT EXISTS compte_users_clients (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

-- 5. Table de liaison comptes-utilisateurs PUP/GMS
CREATE TABLE IF NOT EXISTS compte_users_pub_gms (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

-- 6. Table de liaison comptes-gestionnaires
CREATE TABLE IF NOT EXISTS compte_gestionnaires (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

-- 7. Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_comptes_entreprise ON comptes(entreprise);
CREATE INDEX IF NOT EXISTS idx_comptes_created_by ON comptes(created_by);
CREATE INDEX IF NOT EXISTS idx_compte_users_clients_compte_id ON compte_users_clients(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_clients_user_id ON compte_users_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_compte_id ON compte_users_pub_gms(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_user_id ON compte_users_pub_gms(user_id);
CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_compte_id ON compte_gestionnaires(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_user_id ON compte_gestionnaires(user_id);

-- 8. RLS Policies pour sécurité
ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_users_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_users_pub_gms ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_gestionnaires ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "comptes_select_all" ON comptes;
DROP POLICY IF EXISTS "comptes_insert_admin" ON comptes;
DROP POLICY IF EXISTS "comptes_update_admin" ON comptes;
DROP POLICY IF EXISTS "comptes_delete_admin" ON comptes;
DROP POLICY IF EXISTS "compte_users_select" ON compte_users_clients;
DROP POLICY IF EXISTS "compte_users_modify" ON compte_users_clients;
DROP POLICY IF EXISTS "compte_pub_gms_select" ON compte_users_pub_gms;
DROP POLICY IF EXISTS "compte_pub_gms_modify" ON compte_users_pub_gms;
DROP POLICY IF EXISTS "compte_gestionnaires_select" ON compte_gestionnaires;
DROP POLICY IF EXISTS "compte_gestionnaires_modify" ON compte_gestionnaires;

-- Policies pour comptes (lecture pour tous, modification selon rôle)
CREATE POLICY "comptes_select_all" ON comptes FOR SELECT USING (true);
CREATE POLICY "comptes_insert_admin" ON comptes FOR INSERT WITH CHECK (true);
CREATE POLICY "comptes_update_admin" ON comptes FOR UPDATE USING (true);
CREATE POLICY "comptes_delete_admin" ON comptes FOR DELETE USING (true);

-- Policies pour tables de liaison
CREATE POLICY "compte_users_select" ON compte_users_clients FOR SELECT USING (true);
CREATE POLICY "compte_users_modify" ON compte_users_clients FOR ALL USING (true);

CREATE POLICY "compte_pub_gms_select" ON compte_users_pub_gms FOR SELECT USING (true);
CREATE POLICY "compte_pub_gms_modify" ON compte_users_pub_gms FOR ALL USING (true);

CREATE POLICY "compte_gestionnaires_select" ON compte_gestionnaires FOR SELECT USING (true);
CREATE POLICY "compte_gestionnaires_modify" ON compte_gestionnaires FOR ALL USING (true);

-- 9. Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comptes_updated_at ON comptes;
CREATE TRIGGER update_comptes_updated_at BEFORE UPDATE ON comptes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Commentaires pour documentation
COMMENT ON TABLE comptes IS 'Table des comptes clients avec leurs paramètres publicitaires';
COMMENT ON COLUMN comptes.objectif_facebook_ads IS 'Objectifs Facebook Ads sélectionnés (multi-sélection)';
COMMENT ON COLUMN comptes.objectif_google_ads IS 'Objectifs Google Ads sélectionnés (multi-sélection)';
COMMENT ON TABLE compte_users_clients IS 'Liaison entre comptes et utilisateurs de type Client';
COMMENT ON TABLE compte_users_pub_gms IS 'Liaison entre comptes et utilisateurs PUP/GMS';
COMMENT ON TABLE compte_gestionnaires IS 'Gestionnaires du compte (Direction, Responsable, PUP, GMS)';