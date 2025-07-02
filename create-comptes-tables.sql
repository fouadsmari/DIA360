-- Script pour créer uniquement les tables comptes et leurs relations
-- La colonne poste dans users est déjà VARCHAR, donc pas besoin d'enum

-- 1. Créer la table comptes
CREATE TABLE IF NOT EXISTS comptes (
  id SERIAL PRIMARY KEY,
  entreprise VARCHAR(255) NOT NULL,
  adresse TEXT NOT NULL,
  id_facebook_ads VARCHAR(255),
  id_google_ads VARCHAR(255),
  id_pages_facebook TEXT[],
  id_page_instagram TEXT[],
  id_compte_tiktok VARCHAR(255),
  id_compte_linkedin VARCHAR(255),
  budget DECIMAL(10, 2),
  objectif_facebook_ads TEXT[] DEFAULT ARRAY[
    'Trafic', 'Notoriété', 'E-commerce', 'Prospects', 
    'Visites en magasin', 'Appels', 'Infolettres', 'Messages', 'Contact'
  ],
  objectif_google_ads TEXT[] DEFAULT ARRAY[
    'Trafic', 'Notoriété', 'E-commerce', 'Prospects', 
    'Visites en magasin', 'Appels', 'Infolettres', 'Contact'
  ],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 2. Créer les tables de liaison
CREATE TABLE IF NOT EXISTS compte_users_clients (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

CREATE TABLE IF NOT EXISTS compte_users_pub_gms (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

CREATE TABLE IF NOT EXISTS compte_gestionnaires (
  id SERIAL PRIMARY KEY,
  compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(compte_id, user_id)
);

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS idx_comptes_entreprise ON comptes(entreprise);
CREATE INDEX IF NOT EXISTS idx_comptes_created_by ON comptes(created_by);
CREATE INDEX IF NOT EXISTS idx_compte_users_clients_compte_id ON compte_users_clients(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_clients_user_id ON compte_users_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_compte_id ON compte_users_pub_gms(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_user_id ON compte_users_pub_gms(user_id);
CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_compte_id ON compte_gestionnaires(compte_id);
CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_user_id ON compte_gestionnaires(user_id);

-- 4. Activer RLS
ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_users_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_users_pub_gms ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_gestionnaires ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS (très permissives pour simplifier)
DROP POLICY IF EXISTS "comptes_all" ON comptes;
CREATE POLICY "comptes_all" ON comptes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "compte_users_clients_all" ON compte_users_clients;
CREATE POLICY "compte_users_clients_all" ON compte_users_clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "compte_users_pub_gms_all" ON compte_users_pub_gms;
CREATE POLICY "compte_users_pub_gms_all" ON compte_users_pub_gms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "compte_gestionnaires_all" ON compte_gestionnaires;
CREATE POLICY "compte_gestionnaires_all" ON compte_gestionnaires FOR ALL USING (true) WITH CHECK (true);

-- 6. Créer la fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comptes_updated_at ON comptes;
CREATE TRIGGER update_comptes_updated_at 
  BEFORE UPDATE ON comptes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();