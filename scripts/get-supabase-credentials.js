// Script pour récupérer automatiquement les credentials du projet DIA360
const https = require('https');

const SUPABASE_TOKEN = 'sbp_c885edc160e47de9b4ca048ec7746f759b80a074';

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${SUPABASE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getSupabaseCredentials() {
  try {
    console.log('🔍 Fetching Supabase projects...');
    
    // 1. Lister tous les projets
    const projectsResponse = await makeRequest('/v1/projects');
    
    if (projectsResponse.status !== 200) {
      console.error('❌ Failed to fetch projects:', projectsResponse.data);
      return;
    }

    console.log(`✅ Found ${projectsResponse.data.length} project(s)`);
    
    // 2. Trouver le projet DIA360
    const dia360Project = projectsResponse.data.find(p => 
      p.name.toLowerCase().includes('dia360') || 
      p.name.toLowerCase().includes('dia-360')
    );

    if (!dia360Project) {
      console.log('📋 Available projects:');
      projectsResponse.data.forEach(p => {
        console.log(`  - ${p.name} (${p.id})`);
      });
      console.error('❌ DIA360 project not found');
      return;
    }

    console.log(`🎯 Found DIA360 project: ${dia360Project.name} (${dia360Project.id})`);

    // 3. Récupérer les détails du projet
    const projectDetails = await makeRequest(`/v1/projects/${dia360Project.id}`);
    
    if (projectDetails.status !== 200) {
      console.error('❌ Failed to fetch project details:', projectDetails.data);
      return;
    }

    // 4. Récupérer les API keys
    const configResponse = await makeRequest(`/v1/projects/${dia360Project.id}/api-keys`);
    
    if (configResponse.status !== 200) {
      console.error('❌ Failed to fetch API keys:', configResponse.data);
      return;
    }

    const project = projectDetails.data;
    const apiKeys = configResponse.data;

    // 5. Afficher toutes les informations
    console.log('\\n🔐 DIA360 Project Credentials:');
    console.log('================================');
    console.log(`Project Name: ${project.name}`);
    console.log(`Project ID: ${project.id}`);
    console.log(`Status: ${project.status}`);
    console.log(`Region: ${project.region}`);
    console.log(`Created: ${project.created_at}`);
    
    console.log('\\n🔗 URLs:');
    console.log(`Project URL: https://${project.id}.supabase.co`);
    console.log(`API URL: https://${project.id}.supabase.co/rest/v1/`);
    console.log(`Auth URL: https://${project.id}.supabase.co/auth/v1`);
    
    console.log('\\n🔑 API Keys:');
    apiKeys.forEach(key => {
      console.log(`${key.name}: ${key.api_key}`);
    });

    // 6. Récupérer les infos de la base de données
    const dbConfig = await makeRequest(`/v1/projects/${dia360Project.id}/config/database`);
    
    if (dbConfig.status === 200) {
      console.log('\\n🗄️ Database:');
      console.log(`Host: ${dbConfig.data?.host || 'N/A'}`);
      console.log(`Port: ${dbConfig.data?.port || 'N/A'}`);
      console.log(`Database: ${dbConfig.data?.database || 'postgres'}`);
      console.log(`Connection String: postgresql://postgres.${project.id}:[PASSWORD]@${dbConfig.data?.host || project.id + '.supabase.co'}:${dbConfig.data?.port || '6543'}/postgres`);
    }

    console.log('\\n📋 Ready to update .env files!');

    // 7. Générer le contenu .env
    const anonKey = apiKeys.find(k => k.name === 'anon')?.api_key || '';
    const serviceKey = apiKeys.find(k => k.name === 'service_role')?.api_key || '';
    
    console.log('\\n📝 .env.local content:');
    console.log('========================');
    console.log(`NEXT_PUBLIC_SUPABASE_URL="https://${project.id}.supabase.co"`);
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY="${anonKey}"`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY="${serviceKey}"`);
    console.log(`DATABASE_URL="postgresql://postgres.${project.id}:dia360postgres2024!@aws-0-ca-central-1.pooler.supabase.com:6543/postgres"`);

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

getSupabaseCredentials();