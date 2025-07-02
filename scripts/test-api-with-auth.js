#!/usr/bin/env node

// Test script to verify API endpoints when the development server is running
// This script simulates what the frontend would do

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

const baseUrl = envVars.NEXTAUTH_URL || 'http://localhost:3000';

const API_ENDPOINTS = [
  '/api/facebook-ads-apis',
  '/api/google-ads-apis',
  '/api/social-media-apis'
];

async function checkServerRunning() {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    return response.ok;
  } catch (error) {
    try {
      // Try the home page
      const response = await fetch(baseUrl);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

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
      console.log(`   ✅ Expected 401 (Unauthorized) - API requires authentication`);
      console.log(`   📝 Response: ${data.error || 'Authentication required'}`);
      return { endpoint, status: 'OK', message: 'Correctly requires authentication' };
    } else if (status === 200) {
      console.log(`   ✅ Success - Endpoint working (somehow authenticated)`);
      console.log(`   📊 Data: ${Array.isArray(data) ? data.length + ' items' : 'Response received'}`);
      return { endpoint, status: 'OK', message: 'Working correctly' };
    } else if (status === 500) {
      console.log(`   ❌ Server Error - Check server logs`);
      console.log(`   📄 Error: ${data.error || data}`);
      return { endpoint, status: 'ERROR', message: 'Server error - check logs' };
    } else {
      console.log(`   ⚠️ Unexpected status: ${status}`);
      console.log(`   📄 Response: ${JSON.stringify(data, null, 2)}`);
      return { endpoint, status: 'WARNING', message: `Unexpected status: ${status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return { endpoint, status: 'ERROR', message: error.message };
  }
}

async function main() {
  console.log('🚀 Testing API endpoints with authentication checks...');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log('');

  // Check if server is running
  console.log('⏳ Checking if development server is running...');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    console.log('❌ Development server is not running!');
    console.log('');
    console.log('🔧 Please start the development server:');
    console.log('   npm run dev');
    console.log('');
    console.log('   Then run this script again to test the APIs.');
    return;
  }
  
  console.log('✅ Development server is running');
  console.log('');

  const results = [];
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('');
  }

  console.log('📋 Summary:');
  results.forEach(result => {
    const icon = result.status === 'OK' ? '✅' : result.status === 'ERROR' ? '❌' : '⚠️';
    console.log(`   ${icon} ${result.endpoint}: ${result.message}`);
  });

  console.log('');
  console.log('💡 How to test with authentication:');
  console.log('   1. Open browser and go to http://localhost:3000');
  console.log('   2. Login with: admin@dia360.com / admin123');
  console.log('   3. Navigate to the APIs section');
  console.log('   4. Try clicking the buttons to add new API configurations');
  console.log('');
  console.log('🔍 If buttons still don\'t work, check:');
  console.log('   - Browser console for JavaScript errors');
  console.log('   - Network tab for failed requests');
  console.log('   - Server console for error messages');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});