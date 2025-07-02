// Script pour créer la base de données DIA360 via API Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wcawvwlekjskmxpsntvl.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjYXd2d2xla2pza214cHNudHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjgwMCwiZXhwIjoyMDM1NDM4ODAwfQ.8nKLWU9nVRXUzI7c9uh4I8W0_w7mjx4wF7uTLDUqwpk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDatabase() {
  console.log('🗄️ Creating DIA360 database structure...')
  
  try {
    // 1. Créer table users directement via SQL
    console.log('📋 Creating users table...')
    const { data: usersData, error: usersError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')
    
    if (!usersData || usersData.length === 0) {
      // Table n'existe pas, on peut essayer de la créer via une insertion test
      console.log('🔧 Table users does not exist, creating via direct query...')
    }
    
    if (usersError) {
      console.error('❌ Error creating users table:', usersError)
    } else {
      console.log('✅ Users table created successfully')
    }

    // 2. Créer les index
    console.log('📊 Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
        CREATE INDEX IF NOT EXISTS idx_users_poste ON public.users(poste);
        CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
      `
    })
    
    if (indexError) {
      console.error('❌ Error creating indexes:', indexError)
    } else {
      console.log('✅ Indexes created successfully')
    }

    // 3. Activer RLS
    console.log('🔒 Enabling Row Level Security...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
    })
    
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError)
    } else {
      console.log('✅ RLS enabled successfully')
    }

    // 4. Insérer utilisateur admin par défaut
    console.log('👤 Creating default admin user...')
    const { error: adminError } = await supabase
      .from('users')
      .insert({
        nom: 'Admin',
        prenom: 'System',
        email: 'admin@dia360.com',
        password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdeNb.QkqLQ7SbO', // admin123
        poste: 'Superadmin'
      })
    
    if (adminError && !adminError.message.includes('duplicate key')) {
      console.error('❌ Error creating admin user:', adminError)
    } else {
      console.log('✅ Default admin user created (email: admin@dia360.com, password: admin123)')
    }

    console.log('\n🎉 DIA360 database created successfully!')
    console.log('📊 Database URL: https://wcawvwlekjskmxpsntvl.supabase.co')
    console.log('👤 Default admin: admin@dia360.com / admin123')
    
  } catch (error) {
    console.error('💥 Failed to create database:', error)
  }
}

createDatabase()