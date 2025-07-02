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
      .from('social_media_apis')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération Social Media APIs:', error)
      throw error
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API GET Social Media APIs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des APIs Social Media' },
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
      plateforme,
      nom,
      api_key,
      api_secret,
      access_token,
      refresh_token,
      page_id,
      account_id
    } = await request.json()

    if (!plateforme || !nom) {
      return NextResponse.json(
        { error: 'Plateforme et nom sont obligatoires' },
        { status: 400 }
      )
    }

    const validPlateformes = ['facebook_page', 'instagram', 'linkedin', 'tiktok']
    if (!validPlateformes.includes(plateforme)) {
      return NextResponse.json(
        { error: 'Plateforme invalide' },
        { status: 400 }
      )
    }

    console.log(`Création Social Media API: ${nom} (${plateforme})`)

    const { data, error } = await supabaseAdmin
      .from('social_media_apis')
      .insert({
        plateforme,
        nom,
        api_key: api_key || null,
        api_secret: api_secret || null,
        access_token: access_token || null,
        refresh_token: refresh_token || null,
        page_id: page_id || null,
        account_id: account_id || null,
        config: {},
        is_active: true,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création Social Media API:', error)
      throw error
    }

    console.log('Social Media API créée avec succès:', data.nom)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erreur API POST Social Media API:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'API Social Media' },
      { status: 500 }
    )
  }
}