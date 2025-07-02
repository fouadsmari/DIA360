// Script pour vérifier l'utilisateur admin dans Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zvqvqcbsmvtrcrjeubap.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cXZxY2JzbXZ0cmNyamV1YmFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQyMzgxNiwiZXhwIjoyMDY2OTk5ODE2fQ.j68PnsX0Yv2a6jx4iDXyHGGWfBGMeNfCTkeXiLVa2n4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminUser() {
  try {
    console.log('🔍 Vérification de l\'utilisateur admin...');
    
    // Vérifier si la table users existe en essayant de la lire
    const { data: testUsers, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Erreur lors de la vérification des tables:', tablesError);
      return;
    }
    
    if (tablesError) {
      if (tablesError.code === '42P01') {
        console.error('❌ Table users n\'existe pas !');
        console.log('💡 Vous devez exécuter le script SQL complet dans Supabase Dashboard');
      } else {
        console.error('❌ Erreur lors de la vérification des tables:', tablesError);
      }
      return;
    }
    
    console.log('✅ Table users existe');
    
    // Chercher l'utilisateur admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@dia360.com')
      .single();
    
    if (adminError) {
      if (adminError.code === 'PGRST116') {
        console.error('❌ Utilisateur admin n\'existe pas !');
        console.log('💡 Exécutez cette requête dans Supabase SQL Editor:');
        console.log(`
INSERT INTO public.users (nom, prenom, email, password_hash, poste) 
VALUES (
  'Admin', 
  'System', 
  'admin@dia360.com', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdeNb.QkqLQ7SbO',
  'Superadmin'
);
        `);
      } else {
        console.error('❌ Erreur lors de la recherche admin:', adminError);
      }
      return;
    }
    
    console.log('✅ Utilisateur admin trouvé:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Nom:', adminUser.prenom, adminUser.nom);
    console.log('🏢 Poste:', adminUser.poste);
    console.log('✅ Actif:', adminUser.is_active);
    console.log('🔐 Hash password:', adminUser.password_hash.substring(0, 20) + '...');
    console.log('📅 Créé le:', adminUser.created_at);
    
    // Vérifier le hash du mot de passe admin123
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare('admin123', adminUser.password_hash);
    
    if (isPasswordValid) {
      console.log('✅ Le mot de passe admin123 est CORRECT');
    } else {
      console.log('❌ Le mot de passe admin123 est INCORRECT');
      console.log('💡 Recréons le hash...');
      const newHash = await bcrypt.hash('admin123', 12);
      console.log('🔐 Nouveau hash:', newHash);
      console.log('💡 Exécutez cette requête pour corriger:');
      console.log(`UPDATE public.users SET password_hash = '${newHash}' WHERE email = 'admin@dia360.com';`);
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error);
  }
}

checkAdminUser();