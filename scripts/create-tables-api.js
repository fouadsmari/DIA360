// Script pour créer les tables via l'API REST Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zvqvqcbsmvtrcrjeubap.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cXZxY2JzbXZ0cmNyamV1YmFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQyMzgxNiwiZXhwIjoyMDY2OTk5ODE2fQ.j68PnsX0Yv2a6jx4iDXyHGGWfBGMeNfCTkeXiLVa2n4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('🗄️ Creating DIA360 database tables...');
  
  try {
    // Lire le fichier SQL de migration
    const fs = require('fs');
    const sqlScript = fs.readFileSync('/Users/fouad/Documents/AI/DIA360/supabase/migrations/20250702025532_create_dia360_tables.sql', 'utf8');
    
    console.log('📄 SQL Script loaded, executing...');
    
    // Exécuter le script SQL via l'API REST
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlScript
    });
    
    if (error) {
      console.error('❌ Error creating tables:', error);
      return false;
    }
    
    console.log('✅ Tables created successfully!');
    
    // Vérifier que les tables existent
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'auth_logs']);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📋 Created tables:', tables.map(t => t.table_name));
    }
    
    // Vérifier l'utilisateur admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@dia360.com')
      .single();
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.error('❌ Error checking admin user:', adminError);
    } else if (adminUser) {
      console.log('👤 Admin user exists:', adminUser.email);
    } else {
      console.log('⚠️ Admin user not found');
    }
    
    console.log('\\n🎉 Database setup completed!');
    console.log('🔗 Dashboard: https://supabase.com/dashboard/project/zvqvqcbsmvtrcrjeubap');
    console.log('👤 Default admin: admin@dia360.com / admin123');
    
    return true;
  } catch (error) {
    console.error('💥 Failed to create tables:', error);
    return false;
  }
}

createTables();