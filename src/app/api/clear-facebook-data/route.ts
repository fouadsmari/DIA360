import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('🗑️ Clearing all Facebook data...')
    
    // Clear Facebook data from database
    const { error: deleteError } = await supabaseAdmin
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

    console.log('✅ Facebook data cleared successfully')
    
    return NextResponse.json({
      message: 'Données Facebook supprimées avec succès',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in clear Facebook data:', error)
    return NextResponse.json({
      error: 'Erreur lors de la suppression des données Facebook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}