import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id)

    console.log(`Toggle statut utilisateur ${userId}`)

    // Get current status
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('is_active, email')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Erreur fetch user status:', fetchError)
      throw fetchError
    }

    const newStatus = !currentUser.is_active

    // Update status
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Erreur toggle user status:', error)
      throw error
    }

    const action = newStatus ? 'activé' : 'désactivé'
    console.log(`Utilisateur ${currentUser.email} ${action} avec succès`)
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API toggle user:', error)
    return NextResponse.json(
      { error: 'Erreur lors du changement de statut de l\'utilisateur' },
      { status: 500 }
    )
  }
}