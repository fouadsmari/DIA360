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

    // Solution définitive: désactiver l'utilisateur au lieu de le supprimer
    console.log('Désactivation utilisateur au lieu de suppression...')
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        email: existingUser.email + '.deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Erreur désactivation utilisateur:', updateError)
      throw updateError
    }
    
    // Créer un log manuel de la "suppression"
    await supabaseAdmin
      .from('auth_logs')
      .insert({
        user_id: null,
        action: 'user_deleted',
        status: 'success',
        details: {
          deleted_user_id: userId,
          deleted_user_email: existingUser.email,
          deleted_user_poste: existingUser.poste,
          deleted_at: new Date().toISOString()
        }
      })

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