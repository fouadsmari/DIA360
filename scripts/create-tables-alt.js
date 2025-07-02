const { Pool } = require('pg');

// Essayons avec une configuration différente
const pool = new Pool({
  host: 'aws-0-ca-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.zvqvqcbsmvtrcrjeubap',
  password: 'dia360postgres2024!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTables() {
  let client;
  
  try {
    console.log('Tentative de connexion à PostgreSQL...');
    client = await pool.connect();
    console.log('Connexion réussie !');
    
    // Test simple
    const result = await client.query('SELECT NOW()');
    console.log('Test de requête réussi:', result.rows[0]);
    
    // Vérifier les tables existantes
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables existantes:', tables.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
    console.error('Code erreur:', error.code);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createTables();