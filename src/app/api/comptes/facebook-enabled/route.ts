import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer les comptes avec Facebook Ads ID configuré
    const { data: comptes, error } = await supabaseAdmin
      .from('comptes')
      .select(`
        id,
        entreprise,
        id_facebook_ads,
        budget,
        created_at,
        compte_users_clients(user_id),
        compte_users_pub_gms(user_id),
        compte_gestionnaires(user_id)
      `)
      .not('id_facebook_ads', 'is', null)
      .neq('id_facebook_ads', '')
      .order('entreprise', { ascending: true })

    if (error) {
      console.error('Erreur récupération comptes Facebook:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des comptes' },
        { status: 500 }
      )
    }

    // Filter based on user role and access
    let filteredComptes = comptes
    if (session.user.role === 'Responsable') {
      // Responsable can only see comptes they're associated with
      filteredComptes = comptes.filter(compte => {
        const hasClientAccess = compte.compte_users_clients?.some(rel => rel.user_id === session.user.id)
        const hasPubGmsAccess = compte.compte_users_pub_gms?.some(rel => rel.user_id === session.user.id)
        const hasGestionnaireAccess = compte.compte_gestionnaires?.some(rel => rel.user_id === session.user.id)
        return hasClientAccess || hasPubGmsAccess || hasGestionnaireAccess
      })
    }

    // Transform for client selector
    const clientOptions = filteredComptes.map(compte => ({
      compteId: compte.id,
      entreprise: compte.entreprise,
      facebookAccountId: compte.id_facebook_ads,
      budget: compte.budget || 0,
      hasAccess: true
    }))

    return NextResponse.json(clientOptions)

  } catch (error) {
    console.error('Erreur API comptes Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}