import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('Récupération des utilisateurs pour les comptes...')

    // Récupérer tous les utilisateurs actifs avec leurs informations
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, poste')
      .eq('is_active', true)
      .order('nom', { ascending: true })

    if (error) {
      console.error('Erreur récupération utilisateurs:', error)
      throw error
    }

    // Grouper par type de poste pour faciliter l'affichage
    const groupedUsers = {
      clients: users?.filter(u => u.poste === 'Client') || [],
      pubGms: users?.filter(u => ['PUP', 'GMS'].includes(u.poste)) || [],
      gestionnaires: users?.filter(u => ['Direction', 'Responsable', 'PUP', 'GMS'].includes(u.poste)) || []
    }

    console.log(`Utilisateurs récupérés: ${users?.length || 0}`)
    console.log(`- Clients: ${groupedUsers.clients.length}`)
    console.log(`- PUP/GMS: ${groupedUsers.pubGms.length}`)
    console.log(`- Gestionnaires: ${groupedUsers.gestionnaires.length}`)

    return NextResponse.json({
      all: users || [],
      grouped: groupedUsers
    })

  } catch (error) {
    console.error('Erreur API users for comptes:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des utilisateurs' },
      { status: 500 }
    )
  }
}