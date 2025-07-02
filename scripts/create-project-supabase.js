// Script pour créer automatiquement le projet DIA360 sur Supabase
const https = require('https');

const SUPABASE_TOKEN = 'sbp_c885edc160e47de9b4ca048ec7746f759b80a074';

function createSupabaseProject() {
  const data = JSON.stringify({
    name: 'DIA360',
    organization_id: '', // Will be filled automatically
    plan: 'free',
    region: 'ca-central-1', // Canada Central
    db_pass: 'dia360postgres2024!'
  });

  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_TOKEN}`,
      'Content-Length': data.length
    }
  };

  console.log('🚀 Creating DIA360 project on Supabase...');

  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', responseData);
      
      if (res.statusCode === 201) {
        const project = JSON.parse(responseData);
        console.log('✅ Project created successfully!');
        console.log('🔗 Project URL:', `https://${project.id}.supabase.co`);
        console.log('📊 Database URL:', project.database?.host);
      } else {
        console.error('❌ Failed to create project');
      }
    });
  });

  req.on('error', (error) => {
    console.error('💥 Error:', error);
  });

  req.write(data);
  req.end();
}

createSupabaseProject();