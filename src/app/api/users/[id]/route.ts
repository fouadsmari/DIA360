import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { nom, prenom, email, poste } = await request.json()
    const userId = parseInt(params.id)

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

    console.log('Utilisateur modifié avec succès:', data)
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
    const userId = parseInt(params.id)

    console.log(`Suppression utilisateur ${userId}`)

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Erreur suppression utilisateur:', error)
      throw error
    }

    console.log('Utilisateur supprimé avec succès')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur API DELETE user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    )
  }
}