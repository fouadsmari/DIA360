import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    console.log(`=== TEST DELETE utilisateur ${userId} ===`)

    // Test 1: Vérifier l'utilisateur existe
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Erreur fetch user:', fetchError)
      return NextResponse.json({ 
        error: 'Erreur fetch', 
        details: fetchError 
      }, { status: 500 })
    }

    console.log('Utilisateur trouvé:', user.email)

    // Test 2: Vérifier les relations
    console.log('Vérification des relations...')
    
    try {
      const { data: comptes, error: comptesError } = await supabaseAdmin
        .from('comptes')
        .select('id')
        .eq('created_by', userId)

      console.log('Comptes créés par cet utilisateur:', comptes?.length || 0)
      
      if (comptesError) {
        console.log('Erreur vérification comptes:', comptesError)
      }
    } catch (e) {
      console.log('Pas de table comptes ou erreur:', e)
    }

    // Test 3: Supprimer d'abord les logs d'auth
    console.log('Suppression des logs d\'auth...')
    const { error: logsError } = await supabaseAdmin
      .from('auth_logs')
      .delete()
      .eq('user_id', userId)

    if (logsError && logsError.code !== 'PGRST116') {
      console.error('Erreur suppression logs:', logsError)
      return NextResponse.json({
        error: 'Erreur suppression logs',
        details: logsError
      }, { status: 500 })
    }

    console.log('Logs supprimés ou inexistants')

    // Test 4: Essayer de supprimer l'utilisateur
    console.log('Tentative de suppression utilisateur...')

    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Erreur suppression:', deleteError)
      return NextResponse.json({
        error: 'Erreur suppression',
        details: deleteError,
        user_info: { email: user.email, poste: user.poste }
      }, { status: 500 })
    }

    console.log('✓ Suppression réussie')
    return NextResponse.json({ 
      success: true, 
      deleted_user: user.email 
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return NextResponse.json({
      error: 'Erreur générale',
      details: error instanceof Error ? error.message : 'Inconnue'
    }, { status: 500 })
  }
}