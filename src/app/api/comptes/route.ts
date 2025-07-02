import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    // Récupérer tous les comptes avec leurs relations
    const { data: comptes, error } = await supabaseAdmin
      .from('comptes')
      .select(`
        *,
        users_clients:compte_users_clients(
          user:users(id, nom, prenom, email)
        ),
        users_pub_gms:compte_users_pub_gms(
          user:users(id, nom, prenom, email, poste)
        ),
        gestionnaires:compte_gestionnaires(
          user:users(id, nom, prenom, email, poste)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération comptes:', error)
      throw error
    }

    // Formater les données pour simplifier la structure
    const formattedComptes = comptes?.map(compte => ({
      ...compte,
      users_clients: compte.users_clients?.map((uc: { user: unknown }) => uc.user) || [],
      users_pub_gms: compte.users_pub_gms?.map((up: { user: unknown }) => up.user) || [],
      gestionnaires: compte.gestionnaires?.map((g: { user: unknown }) => g.user) || []
    })) || []

    console.log(`${formattedComptes.length} comptes récupérés`)
    return NextResponse.json(formattedComptes)

  } catch (error) {
    console.error('Erreur API comptes:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des comptes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const {
      entreprise,
      adresse,
      id_facebook_ads,
      id_google_ads,
      id_pages_facebook,
      id_page_instagram,
      id_compte_tiktok,
      id_compte_linkedin,
      budget,
      objectif_facebook_ads,
      objectif_google_ads,
      users_clients,
      users_pub_gms,
      gestionnaires
    } = await request.json()

    console.log('Création nouveau compte:', entreprise)

    // Créer le compte
    const { data: newCompte, error: createError } = await supabaseAdmin
      .from('comptes')
      .insert({
        entreprise,
        adresse,
        id_facebook_ads: id_facebook_ads || null,
        id_google_ads: id_google_ads || null,
        id_pages_facebook: id_pages_facebook || [],
        id_page_instagram: id_page_instagram || [],
        id_compte_tiktok: id_compte_tiktok || null,
        id_compte_linkedin: id_compte_linkedin || null,
        budget: budget || null,
        objectif_facebook_ads,
        objectif_google_ads,
        created_by: session.user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Erreur création compte:', createError)
      throw createError
    }

    // Ajouter les relations utilisateurs
    const promises = []

    // Clients
    if (users_clients?.length > 0) {
      const clientsData = users_clients.map((userId: number) => ({
        compte_id: newCompte.id,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_users_clients').insert(clientsData)
      )
    }

    // PUP/GMS
    if (users_pub_gms?.length > 0) {
      const pubGmsData = users_pub_gms.map((userId: number) => ({
        compte_id: newCompte.id,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_users_pub_gms').insert(pubGmsData)
      )
    }

    // Gestionnaires
    if (gestionnaires?.length > 0) {
      const gestionnairesData = gestionnaires.map((userId: number) => ({
        compte_id: newCompte.id,
        user_id: userId
      }))
      promises.push(
        supabaseAdmin.from('compte_gestionnaires').insert(gestionnairesData)
      )
    }

    // Exécuter toutes les insertions
    await Promise.all(promises)

    console.log('Compte créé avec succès:', newCompte.id)
    return NextResponse.json(newCompte)

  } catch (error) {
    console.error('Erreur API POST comptes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    )
  }
}