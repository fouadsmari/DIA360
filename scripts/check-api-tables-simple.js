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

async function checkTableExists(tableName) {
  try {
    // Try to select from the table to see if it exists
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist
      return false;
    }
    
    if (error) {
      console.error(`❌ Error checking table ${tableName}:`, error);
      return false;
    }
    
    // If we get here, the table exists
    return true;
  } catch (error) {
    console.error(`❌ Error checking table ${tableName}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking API tables in Supabase database...');
  console.log(`📍 Database: ${supabaseUrl}`);
  console.log('');

  let allTablesExist = true;
  const missingTables = [];

  // Check which tables exist
  for (const tableName of API_TABLES) {
    const exists = await checkTableExists(tableName);
    if (exists) {
      console.log(`✅ Table '${tableName}' exists`);
    } else {
      console.log(`❌ Table '${tableName}' does not exist`);
      allTablesExist = false;
      missingTables.push(tableName);
    }
  }

  if (allTablesExist) {
    console.log('');
    console.log('🎉 All API tables exist! The API buttons should work correctly.');
    return;
  }

  console.log('');
  console.log(`⚠️  Found ${missingTables.length} missing table(s).`);
  console.log('');
  console.log('📝 The following tables need to be created:');
  missingTables.forEach(table => console.log(`   - ${table}`));
  console.log('');
  console.log('💡 To create these tables, you can:');
  console.log('   1. Use the Supabase Dashboard SQL Editor');
  console.log('   2. Run the SQL commands provided below');
  console.log('   3. Use a PostgreSQL client to connect and run the SQL');
  console.log('');

  // Output the SQL commands needed
  if (missingTables.includes('facebook_ads_apis')) {
    console.log('📄 SQL for facebook_ads_apis table:');
    console.log(`
CREATE TABLE public.facebook_ads_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  app_id VARCHAR(255) NOT NULL,
  app_secret VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_ads_apis_active ON public.facebook_ads_apis(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_apis_created_at ON public.facebook_ads_apis(created_at);
CREATE INDEX IF NOT EXISTS idx_facebook_ads_apis_created_by ON public.facebook_ads_apis(created_by);

ALTER TABLE public.facebook_ads_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to facebook_ads_apis" ON public.facebook_ads_apis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

CREATE TRIGGER update_facebook_ads_apis_updated_at 
    BEFORE UPDATE ON public.facebook_ads_apis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`);
  }

  if (missingTables.includes('google_ads_apis')) {
    console.log('📄 SQL for google_ads_apis table:');
    console.log(`
CREATE TABLE public.google_ads_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  refresh_token TEXT NOT NULL,
  developer_token VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_ads_apis_active ON public.google_ads_apis(is_active);
CREATE INDEX IF NOT EXISTS idx_google_ads_apis_created_at ON public.google_ads_apis(created_at);
CREATE INDEX IF NOT EXISTS idx_google_ads_apis_created_by ON public.google_ads_apis(created_by);

ALTER TABLE public.google_ads_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to google_ads_apis" ON public.google_ads_apis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

CREATE TRIGGER update_google_ads_apis_updated_at 
    BEFORE UPDATE ON public.google_ads_apis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`);
  }

  if (missingTables.includes('social_media_apis')) {
    console.log('📄 SQL for social_media_apis table:');
    console.log(`
CREATE TABLE public.social_media_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plateforme VARCHAR(50) NOT NULL CHECK (plateforme IN ('facebook_page', 'instagram', 'linkedin', 'tiktok')),
  nom VARCHAR(255) NOT NULL,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  page_id VARCHAR(255),
  account_id VARCHAR(255),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_media_apis_plateforme ON public.social_media_apis(plateforme);
CREATE INDEX IF NOT EXISTS idx_social_media_apis_active ON public.social_media_apis(is_active);
CREATE INDEX IF NOT EXISTS idx_social_media_apis_created_at ON public.social_media_apis(created_at);
CREATE INDEX IF NOT EXISTS idx_social_media_apis_created_by ON public.social_media_apis(created_by);

ALTER TABLE public.social_media_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to social_media_apis" ON public.social_media_apis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

CREATE TRIGGER update_social_media_apis_updated_at 
    BEFORE UPDATE ON public.social_media_apis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`);
  }

  console.log('');
  console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/zvqvqcbsmvtrcrjeubap');
  console.log('📝 Navigate to SQL Editor and run the SQL commands above to create the tables.');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});