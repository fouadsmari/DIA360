#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

const envVars = {};
envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const API_ENDPOINTS = [
  '/api/facebook-ads-apis',
  '/api/google-ads-apis',
  '/api/social-media-apis'
];

const baseUrl = envVars.NEXTAUTH_URL || 'http://localhost:3000';

async function testEndpoint(endpoint) {
  try {
    console.log(`🔍 Testing ${endpoint}...`);
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const status = response.status;
    const statusText = response.statusText;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    console.log(`   Status: ${status} ${statusText}`);
    if (status === 401) {
      console.log(`   ✅ Expected 401 (Not authorized) - Authentication required`);
    } else if (status === 200) {
      console.log(`   ✅ Success - Endpoint is working`);
      console.log(`   📊 Data: ${Array.isArray(data) ? data.length + ' items' : 'Response received'}`);
    } else {
      console.log(`   ❌ Unexpected status: ${status}`);
      console.log(`   📄 Response:`, data);
    }
    
    return { endpoint, status, data };
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return { endpoint, status: 'ERROR', error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing API endpoints...');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log('');

  const results = [];
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('');
  }

  console.log('📋 Summary:');
  results.forEach(result => {
    const icon = result.status === 401 || result.status === 200 ? '✅' : result.status === 'ERROR' ? '❌' : '⚠️';
    console.log(`   ${icon} ${result.endpoint}: ${result.status}`);
  });

  console.log('');
  console.log('💡 Notes:');
  console.log('   - 401 status is expected when not authenticated');
  console.log('   - 200 status means the endpoint is working correctly');
  console.log('   - The API buttons require authentication (Superadmin or Direction role)');
  console.log('');
  console.log('🔗 To test with authentication, use the browser with a logged-in user');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});