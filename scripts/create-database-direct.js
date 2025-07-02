// Script pour créer la base de données DIA360 via connexion PostgreSQL directe
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.zvqvqcbsmvtrcrjeubap:dia360postgres2024!@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

async function createDatabase() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to DIA360 database...');
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Créer table users si elle n'existe pas
    console.log('📋 Creating users table...');
    const createUsersTableSQL = `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        poste VARCHAR(20) NOT NULL CHECK (poste IN ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP WITH TIME ZONE
      );
    `;
    
    await client.query(createUsersTableSQL);
    console.log('✅ Users table created successfully');

    // 2. Créer table auth_logs
    console.log('📊 Creating auth_logs table...');
    const createAuthLogsSQL = `
      CREATE TABLE IF NOT EXISTS public.auth_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        email VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await client.query(createAuthLogsSQL);
    console.log('✅ Auth logs table created successfully');

    // 3. Créer les index pour performance
    console.log('📈 Creating indexes...');
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_poste ON public.users(poste);
      CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
      CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON public.auth_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON public.auth_logs(email);
      CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON public.auth_logs(action);
      CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs(created_at);
    `;
    
    await client.query(createIndexesSQL);
    console.log('✅ Indexes created successfully');

    // 4. Créer trigger pour updated_at automatique
    console.log('⚡ Creating triggers...');
    const createTriggerSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await client.query(createTriggerSQL);
    console.log('✅ Triggers created successfully');

    // 5. Activer Row Level Security
    console.log('🔒 Enabling Row Level Security...');
    const enableRLSSQL = `
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
    `;
    
    await client.query(enableRLSSQL);
    console.log('✅ RLS enabled successfully');

    // 6. Créer politiques RLS
    console.log('🛡️ Creating RLS policies...');
    const createPoliciesSQL = `
      -- Politique pour users: utilisateurs peuvent voir leurs propres données
      DROP POLICY IF EXISTS "Users can view own data" ON public.users;
      CREATE POLICY "Users can view own data" ON public.users 
        FOR SELECT USING (auth.uid()::text = id::text);

      -- Politique pour users: superadmin peut voir tous les utilisateurs
      DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
      CREATE POLICY "Superadmin can view all users" ON public.users
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = auth.uid()::text 
            AND poste = 'Superadmin' 
            AND is_active = true
          )
        );

      -- Politique pour auth_logs: utilisateurs peuvent voir leurs propres logs
      DROP POLICY IF EXISTS "Users can view own auth logs" ON public.auth_logs;
      CREATE POLICY "Users can view own auth logs" ON public.auth_logs
        FOR SELECT USING (user_id::text = auth.uid()::text);

      -- Politique pour auth_logs: superadmin peut voir tous les logs
      DROP POLICY IF EXISTS "Superadmin can view all auth logs" ON public.auth_logs;
      CREATE POLICY "Superadmin can view all auth logs" ON public.auth_logs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = auth.uid()::text 
            AND poste = 'Superadmin' 
            AND is_active = true
          )
        );
    `;
    
    await client.query(createPoliciesSQL);
    console.log('✅ RLS policies created successfully');

    // 7. Créer utilisateur admin par défaut
    console.log('👤 Creating default admin user...');
    const createAdminSQL = `
      INSERT INTO public.users (nom, prenom, email, password_hash, poste)
      VALUES ('Admin', 'System', 'admin@dia360.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdeNb.QkqLQ7SbO', 'Superadmin')
      ON CONFLICT (email) DO NOTHING;
    `;
    
    const result = await client.query(createAdminSQL);
    if (result.rowCount > 0) {
      console.log('✅ Default admin user created (email: admin@dia360.com, password: admin123)');
    } else {
      console.log('ℹ️ Default admin user already exists');
    }

    // 8. Vérifier la création
    console.log('🔍 Verifying database structure...');
    const verifySQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'auth_logs');
    `;
    
    const tables = await client.query(verifySQL);
    console.log('📋 Created tables:', tables.rows.map(r => r.table_name));

    const countUsersSQL = 'SELECT COUNT(*) as count FROM public.users';
    const userCount = await client.query(countUsersSQL);
    console.log('👥 Total users:', userCount.rows[0].count);

    console.log('\\n🎉 DIA360 database structure created successfully!');
    console.log('📊 Database URL: https://wcawvwlekjskmxpsntvl.supabase.co');
    console.log('👤 Default admin: admin@dia360.com / admin123');
    console.log('🔒 RLS enabled with proper policies');

  } catch (error) {
    console.error('💥 Failed to create database:', error.message);
    console.error('🔍 Details:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createDatabase();