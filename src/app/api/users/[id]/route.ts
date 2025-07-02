import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { nom, prenom, email, poste } = await request.json()
    const userId = params.id // UUID string, pas parseInt

    console.log(`Modification utilisateur ${userId}:`, { nom, prenom, email, poste })

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        nom,
        prenom,
        email: email.toLowerCase(),
        poste,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Erreur modification utilisateur:', error)
      throw error
    }

    console.log('Utilisateur modifié avec succès:', data.email)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API PUT user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'utilisateur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id // UUID string, pas parseInt

    console.log(`=== Suppression utilisateur ${userId} ===`)

    // Vérifier d'abord si l'utilisateur existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, poste')
      .eq('id', userId)
      .single()

    if (checkError) {
      console.error('Erreur vérification utilisateur:', checkError)
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        )
      }
      throw checkError
    }

    console.log('Utilisateur trouvé:', existingUser.email, 'Poste:', existingUser.poste)

    // Empêcher la suppression du Superadmin principal
    if (existingUser.poste === 'Superadmin' && existingUser.email === 'admin@dia360.com') {
      return NextResponse.json(
        { error: 'Impossible de supprimer le Superadmin principal' },
        { status: 403 }
      )
    }

    // Désactiver temporairement la contrainte si possible, ou faire une vraie transaction
    // En fait, essayons de forcer la suppression en désactivant RLS temporairement
    
    console.log('Tentative de suppression forcée...')
    
    // Suppression manuelle en 2 étapes pour respecter les contraintes
    console.log('Suppression des auth_logs...')
    
    // Étape 1: Supprimer tous les auth_logs liés à cet utilisateur
    const { error: logsError } = await supabaseAdmin
      .from('auth_logs')
      .delete()
      .eq('user_id', userId)
    
    if (logsError && logsError.code !== 'PGRST116') {
      console.error('Erreur suppression auth_logs:', logsError)
      throw logsError
    }
    
    console.log('Auth_logs supprimés, suppression utilisateur...')
    
    // Étape 2: Supprimer l'utilisateur
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (deleteError) {
      console.error('Erreur suppression utilisateur:', deleteError)
      throw deleteError
    }

    console.log('✓ Utilisateur supprimé avec succès:', existingUser.email)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Erreur API DELETE user:', error)
    console.error('Type d\'erreur:', typeof error)
    console.error('Error.message:', error instanceof Error ? error.message : 'Pas un Error')
    console.error('Erreur complète:', JSON.stringify(error, null, 2))
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la suppression de l\'utilisateur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        full_error: error
      },
      { status: 500 }
    )
  }
}