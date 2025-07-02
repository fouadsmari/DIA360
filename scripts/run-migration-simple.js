// Script pour tester la connexion et exécuter des requêtes simples
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase avec service_role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('Test de connexion à Supabase...');
    
    // Test 1: Vérifier les tables existantes
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Erreur lors de la récupération des tables:', tablesError);
      return;
    }
    
    console.log('Tables existantes:', tables?.map(t => t.table_name));
    
    // Test 2: Vérifier la table users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, nom, prenom, email, poste')
      .limit(1);
    
    if (usersError) {
      console.error('Erreur lors de l\'accès à la table users:', usersError);
      return;
    }
    
    console.log('Premier utilisateur:', users?.[0]);
    
    // Test 3: Vérifier si la table comptes existe déjà
    const comptesExists = tables?.some(t => t.table_name === 'comptes');
    console.log('Table comptes existe:', comptesExists);
    
    console.log('Connexion réussie !');
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testConnection();