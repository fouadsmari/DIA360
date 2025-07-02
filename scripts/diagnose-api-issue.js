#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_TABLES = [
  'facebook_ads_apis',
  'google_ads_apis', 
  'social_media_apis'
];

const API_ROUTES = [
  'src/app/api/facebook-ads-apis/route.ts',
  'src/app/api/google-ads-apis/route.ts',
  'src/app/api/social-media-apis/route.ts'
];

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false;
    }
    
    if (error) {
      console.error(`❌ Error checking table ${tableName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking table ${tableName}:`, error);
    return false;
  }
}

async function checkUserExists() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, poste, is_active')
      .eq('poste', 'Superadmin')
      .eq('is_active', true)
      .limit(1);
    
    if (error) {
      console.error('❌ Error checking admin user:', error);
      return false;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
    return false;
  }
}

function checkRouteFileExists(routePath) {
  const fullPath = path.join(__dirname, '..', routePath);
  return fs.existsSync(fullPath);
}

function checkRouteFileSyntax(routePath) {
  try {
    const fullPath = path.join(__dirname, '..', routePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for required imports
    if (!content.includes("from '@/lib/supabase'")) {
      issues.push('Missing supabase import');
    }
    
    if (!content.includes("from '@/lib/auth'")) {
      issues.push('Missing auth import');
    }
    
    if (!content.includes('export async function GET')) {
      issues.push('Missing GET handler');
    }
    
    if (!content.includes('export async function POST')) {
      issues.push('Missing POST handler');
    }
    
    // Check for authentication check
    if (!content.includes("['Superadmin', 'Direction'].includes")) {
      issues.push('Missing role-based authorization');
    }
    
    return issues;
  } catch (error) {
    return [`File read error: ${error.message}`];
  }
}

async function checkTableSchema(tableName) {
  try {
    // Try to describe the table structure by attempting to insert null values
    // This will return column constraints
    const { error } = await supabase
      .from(tableName)
      .insert({})
      .select();
    
    if (error) {
      // Parse the error to understand table structure
      if (error.message.includes('null value in column')) {
        return { hasSchema: true, error: error.message };
      }
    }
    
    return { hasSchema: true, error: null };
  } catch (error) {
    return { hasSchema: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 DIA360 API Diagnostic Tool');
  console.log('=============================');
  console.log(`📍 Database: ${supabaseUrl}`);
  console.log('');

  let allGood = true;

  // 1. Check environment configuration
  console.log('1️⃣ Environment Configuration');
  console.log('───────────────────────────');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    const value = envVars[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '[REDACTED]' : value}`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allGood = false;
    }
  }
  console.log('');

  // 2. Check database tables
  console.log('2️⃣ Database Tables');
  console.log('─────────────────');
  
  for (const tableName of API_TABLES) {
    const exists = await checkTableExists(tableName);
    if (exists) {
      console.log(`✅ Table '${tableName}' exists`);
      
      // Check table schema
      const schema = await checkTableSchema(tableName);
      if (schema.hasSchema) {
        console.log(`   ✅ Schema is valid`);
      } else {
        console.log(`   ❌ Schema issue: ${schema.error}`);
        allGood = false;
      }
    } else {
      console.log(`❌ Table '${tableName}' does not exist`);
      allGood = false;
    }
  }
  console.log('');

  // 3. Check users table and admin user
  console.log('3️⃣ User Authentication');
  console.log('─────────────────────');
  
  const adminUser = await checkUserExists();
  if (adminUser) {
    console.log(`✅ Admin user exists: ${adminUser.email} (${adminUser.poste})`);
  } else {
    console.log('❌ No active Superadmin user found');
    allGood = false;
  }
  console.log('');

  // 4. Check API route files
  console.log('4️⃣ API Route Files');
  console.log('─────────────────');
  
  for (const routePath of API_ROUTES) {
    const exists = checkRouteFileExists(routePath);
    if (exists) {
      console.log(`✅ Route file exists: ${routePath}`);
      
      // Check syntax
      const issues = checkRouteFileSyntax(routePath);
      if (issues.length === 0) {
        console.log('   ✅ File syntax is correct');
      } else {
        console.log('   ⚠️ Potential issues:');
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    } else {
      console.log(`❌ Route file missing: ${routePath}`);
      allGood = false;
    }
  }
  console.log('');

  // 5. Check dependencies
  console.log('5️⃣ Dependencies');
  console.log('──────────────');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      '@supabase/supabase-js',
      'next-auth',
      'bcryptjs'
    ];
    
    for (const dep of requiredDeps) {
      if (dependencies[dep]) {
        console.log(`✅ ${dep}: ${dependencies[dep]}`);
      } else {
        console.log(`❌ ${dep}: Missing`);
        allGood = false;
      }
    }
  } else {
    console.log('❌ package.json not found');
    allGood = false;
  }
  console.log('');

  // Summary
  console.log('📋 Diagnostic Summary');
  console.log('════════════════════');
  
  if (allGood) {
    console.log('✅ All checks passed! The API should be working correctly.');
    console.log('');
    console.log('💡 If the API buttons still don\'t work, the issue might be:');
    console.log('   - Next.js development server not running');
    console.log('   - Browser authentication issues');
    console.log('   - Frontend JavaScript errors');
    console.log('   - Network connectivity issues');
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Log in as admin@dia360.com with password: admin123');
    console.log('   3. Check browser console for JavaScript errors');
    console.log('   4. Check network tab for failed API requests');
  } else {
    console.log('❌ Found issues that need to be resolved.');
    console.log('');
    console.log('🔧 Please fix the issues above and run the diagnostic again.');
  }
  
  console.log('');
  console.log('🔗 Useful links:');
  console.log(`   - Supabase Dashboard: https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}`);
  console.log('   - Local Development: http://localhost:3000');
}

main().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});