import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('google_ads_apis')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération Google Ads APIs:', error)
      throw error
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API GET Google Ads APIs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des APIs Google Ads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const {
      nom,
      client_id,
      client_secret,
      refresh_token,
      developer_token,
      customer_id
    } = await request.json()

    if (!nom || !client_id || !client_secret || !refresh_token || !developer_token) {
      return NextResponse.json(
        { error: 'Nom, Client ID, Client Secret, Refresh Token et Developer Token sont obligatoires' },
        { status: 400 }
      )
    }

    console.log(`Création Google Ads API: ${nom}`)

    const { data, error } = await supabaseAdmin
      .from('google_ads_apis')
      .insert({
        nom,
        client_id,
        client_secret,
        refresh_token,
        developer_token,
        customer_id: customer_id || null,
        is_active: true,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création Google Ads API:', error)
      throw error
    }

    console.log('Google Ads API créée avec succès:', data.nom)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API POST Google Ads API:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'API Google Ads' },
      { status: 500 }
    )
  }
}