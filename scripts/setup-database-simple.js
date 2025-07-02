// Script simple pour créer utilisateur admin dans Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wcawvwlekjskmxpsntvl.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjYXd2d2xla2pza214cHNudHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg2MjgwMCwiZXhwIjoyMDM1NDM4ODAwfQ.8nKLWU9nVRXUzI7c9uh4I8W0_w7mjx4wF7uTLDUqwpk'

console.log('🔧 Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseServiceKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  try {
    // Test simple: lister les tables existantes
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (error) {
      console.error('❌ Connection failed:', error)
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log('📋 Existing tables:', data)
    return true
  } catch (error) {
    console.error('💥 Connection error:', error)
    return false
  }
}

testConnection()