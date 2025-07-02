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

    // Solution définitive: utiliser la fonction PostgreSQL qui contourne le trigger
    console.log('Suppression avec fonction PostgreSQL sécurisée...')
    
    const { data: result, error: functionError } = await supabaseAdmin
      .rpc('delete_user_final', { target_user_id: userId })
    
    if (functionError) {
      console.error('Erreur fonction delete_user_final:', functionError)
      throw functionError
    }
    
    if (!result?.success) {
      const errorMsg = result?.error || 'Erreur inconnue lors de la suppression'
      console.error('Échec suppression:', errorMsg)
      throw new Error(errorMsg)
    }
    
    console.log('✓ Suppression réussie via fonction PostgreSQL:', result.deleted_user_email)

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