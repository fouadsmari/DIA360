import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Route publique pour supprimer les données Facebook (pour debug uniquement)
export async function POST() {
  try {
    console.log('🗑️ ADMIN: Clearing all Facebook data from database...')
    
    // Supprimer toutes les données Facebook
    const { error: deleteError, count } = await supabaseAdmin
      .from('facebook_ads_data')
      .delete()
      .neq('id', 0) // Delete all records
      
    if (deleteError) {
      console.error('❌ Error clearing Facebook data:', deleteError)
      return NextResponse.json({
        error: 'Erreur lors de la suppression des données Facebook',
        details: deleteError.message
      }, { status: 500 })
    }

    console.log(`✅ Facebook data cleared successfully: ${count || 'unknown'} records deleted`)
    
    return NextResponse.json({
      message: 'Données Facebook supprimées avec succès',
      records_deleted: count || 'unknown',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in admin clear Facebook data:', error)
    return NextResponse.json({
      error: 'Erreur lors de la suppression des données Facebook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}