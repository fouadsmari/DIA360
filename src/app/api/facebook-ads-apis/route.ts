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
      .from('facebook_ads_apis')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération Facebook Ads APIs:', error)
      throw error
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API GET Facebook Ads APIs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des APIs Facebook Ads' },
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
      app_id,
      app_secret,
      access_token,
      account_id
    } = await request.json()

    if (!nom || !app_id || !app_secret || !access_token) {
      return NextResponse.json(
        { error: 'Nom, App ID, App Secret et Access Token sont obligatoires' },
        { status: 400 }
      )
    }

    console.log(`Création Facebook Ads API: ${nom}`)

    const { data, error } = await supabaseAdmin
      .from('facebook_ads_apis')
      .insert({
        nom,
        app_id,
        app_secret,
        access_token,
        account_id: account_id || null,
        is_active: true,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création Facebook Ads API:', error)
      throw error
    }

    console.log('Facebook Ads API créée avec succès:', data.nom)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API POST Facebook Ads API:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'API Facebook Ads' },
      { status: 500 }
    )
  }
}