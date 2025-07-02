const { Pool } = require('pg');

// Configuration de connexion PostgreSQL depuis les variables d'environnement
const connectionString = "postgresql://postgres.zvqvqcbsmvtrcrjeubap:dia360postgres2024!@aws-0-ca-central-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('Connexion à PostgreSQL réussie !');
    
    // 1. Créer ou modifier le type enum user_role
    console.log('1. Vérification du type user_role...');
    
    const checkEnumSQL = `
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
      ) as enum_exists;
    `;
    
    const enumResult = await client.query(checkEnumSQL);
    const enumExists = enumResult.rows[0].enum_exists;
    
    if (!enumExists) {
      console.log('Création du type enum user_role...');
      await client.query(`
        CREATE TYPE user_role AS ENUM ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS', 'Client');
      `);
    } else {
      console.log('Type enum user_role existe, ajout de Client...');
      try {
        await client.query(`
          ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Client';
        `);
      } catch (e) {
        console.log('Valeur Client probablement déjà présente');
      }
    }
    
    // 2. Vérifier la structure de la table users
    console.log('2. Vérification de la table users...');
    const userColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public';
    `);
    
    console.log('Colonnes de la table users:', userColumns.rows);
    
    // 3. Créer la table comptes
    console.log('3. Création de la table comptes...');
    await client.query(`
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
    `);
    
    // 4. Créer les tables de liaison
    console.log('4. Création des tables de liaison...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS compte_users_clients (
        id SERIAL PRIMARY KEY,
        compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(compte_id, user_id)
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS compte_users_pub_gms (
        id SERIAL PRIMARY KEY,
        compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(compte_id, user_id)
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS compte_gestionnaires (
        id SERIAL PRIMARY KEY,
        compte_id INT REFERENCES comptes(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(compte_id, user_id)
      );
    `);
    
    // 5. Créer les index
    console.log('5. Création des index...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_comptes_entreprise ON comptes(entreprise);',
      'CREATE INDEX IF NOT EXISTS idx_comptes_created_by ON comptes(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_compte_users_clients_compte_id ON compte_users_clients(compte_id);',
      'CREATE INDEX IF NOT EXISTS idx_compte_users_clients_user_id ON compte_users_clients(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_compte_id ON compte_users_pub_gms(compte_id);',
      'CREATE INDEX IF NOT EXISTS idx_compte_users_pub_gms_user_id ON compte_users_pub_gms(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_compte_id ON compte_gestionnaires(compte_id);',
      'CREATE INDEX IF NOT EXISTS idx_compte_gestionnaires_user_id ON compte_gestionnaires(user_id);'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    
    // 6. Activer RLS
    console.log('6. Configuration des politiques RLS...');
    await client.query('ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE compte_users_clients ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE compte_users_pub_gms ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE compte_gestionnaires ENABLE ROW LEVEL SECURITY;');
    
    // 7. Créer les politiques
    const policies = [
      'DROP POLICY IF EXISTS "comptes_select_all" ON comptes;',
      'CREATE POLICY "comptes_select_all" ON comptes FOR SELECT USING (true);',
      'DROP POLICY IF EXISTS "comptes_insert_admin" ON comptes;',
      'CREATE POLICY "comptes_insert_admin" ON comptes FOR INSERT WITH CHECK (true);',
      'DROP POLICY IF EXISTS "comptes_update_admin" ON comptes;',
      'CREATE POLICY "comptes_update_admin" ON comptes FOR UPDATE USING (true);',
      'DROP POLICY IF EXISTS "comptes_delete_admin" ON comptes;',
      'CREATE POLICY "comptes_delete_admin" ON comptes FOR DELETE USING (true);'
    ];
    
    for (const policySQL of policies) {
      try {
        await client.query(policySQL);
      } catch (e) {
        console.log('Policy déjà existante ou erreur:', e.message);
      }
    }
    
    // 8. Créer la fonction trigger
    console.log('7. Création de la fonction trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_comptes_updated_at ON comptes;
      CREATE TRIGGER update_comptes_updated_at 
        BEFORE UPDATE ON comptes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Toutes les tables et configurations ont été créées avec succès !');
    
    // Vérification finale
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comptes', 'compte_users_clients', 'compte_users_pub_gms', 'compte_gestionnaires');
    `);
    
    console.log('Tables créées:', tableCheck.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();