import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const compteId = parseInt(params.id)
    const updateData = await request.json()

    console.log(`Modification compte ${compteId}`)

    // Mettre à jour les informations du compte
    const { data, error } = await supabaseAdmin
      .from('comptes')
      .update({
        entreprise: updateData.entreprise,
        adresse: updateData.adresse,
        id_facebook_ads: updateData.id_facebook_ads || null,
        id_google_ads: updateData.id_google_ads || null,
        id_pages_facebook: updateData.id_pages_facebook || [],
        id_page_instagram: updateData.id_page_instagram || [],
        id_compte_tiktok: updateData.id_compte_tiktok || null,
        id_compte_linkedin: updateData.id_compte_linkedin || null,
        budget: updateData.budget || null,
        objectif_facebook_ads: updateData.objectif_facebook_ads,
        objectif_google_ads: updateData.objectif_google_ads,
        updated_at: new Date().toISOString()
      })
      .eq('id', compteId)
      .select()
      .single()

    if (error) {
      console.error('Erreur modification compte:', error)
      throw error
    }

    // Mettre à jour les relations
    // Supprimer les anciennes relations
    await Promise.all([
      supabaseAdmin.from('compte_users_clients').delete().eq('compte_id', compteId),
      supabaseAdmin.from('compte_users_pub_gms').delete().eq('compte_id', compteId),
      supabaseAdmin.from('compte_gestionnaires').delete().eq('compte_id', compteId)
    ])

    // Ajouter les nouvelles relations
    const promises = []

    if (updateData.users_clients?.length > 0) {
      const clientsData = updateData.users_clients.map((userId: number) => ({
        compte_id: compteId,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_users_clients').insert(clientsData)
      )
    }

    if (updateData.users_pub_gms?.length > 0) {
      const pubGmsData = updateData.users_pub_gms.map((userId: number) => ({
        compte_id: compteId,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_users_pub_gms').insert(pubGmsData)
      )
    }

    if (updateData.gestionnaires?.length > 0) {
      const gestionnairesData = updateData.gestionnaires.map((userId: number) => ({
        compte_id: compteId,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_gestionnaires').insert(gestionnairesData)
      )
    }

    await Promise.all(promises)

    console.log('Compte modifié avec succès:', compteId)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API PUT compte:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la modification du compte' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const compteId = parseInt(params.id)

    console.log(`Suppression compte ${compteId}`)

    // Les relations seront supprimées automatiquement grâce à ON DELETE CASCADE
    const { error } = await supabaseAdmin
      .from('comptes')
      .delete()
      .eq('id', compteId)

    if (error) {
      console.error('Erreur suppression compte:', error)
      throw error
    }

    console.log('Compte supprimé avec succès')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur API DELETE compte:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du compte' },
      { status: 500 }
    )
  }
}