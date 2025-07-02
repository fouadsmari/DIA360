// Script pour exécuter la migration SQL directement
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase avec service_role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Lecture du fichier de migration...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250702_create_comptes_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Exécution de la migration...');
    
    // Exécuter la migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la migration:', error);
      return;
    }
    
    console.log('Migration exécutée avec succès !');
    console.log('Résultat:', data);
    
    // Vérifier que les tables ont été créées
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['comptes', 'compte_users_clients', 'compte_users_pub_gms', 'compte_gestionnaires']);
    
    if (checkError) {
      console.error('Erreur lors de la vérification:', checkError);
      return;
    }
    
    console.log('Tables créées:', tables?.map(t => t.table_name));
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

runMigration();