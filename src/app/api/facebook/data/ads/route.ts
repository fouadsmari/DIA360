import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFacebookLogger } from '@/lib/facebook-logger'

interface FacebookAdData {
  ad_id?: string
  id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  impressions?: string
  reach?: string
  clicks?: string
  spend?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: Array<{ action_type: string; value: string }>
}

interface FacebookApiResponse {
  data?: FacebookAdData[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const compteId = parseInt(searchParams.get('compteId') || '0')
    const facebookAccountId = searchParams.get('facebookAccountId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = searchParams.get('limit') || '100'

    if (!compteId || !facebookAccountId || !from || !to) {
      return NextResponse.json(
        { error: 'Paramètres requis: compteId, facebookAccountId, from, to' },
        { status: 400 }
      )
    }

    // Créer le logger Facebook
    const logger = await createFacebookLogger(session.user.id, compteId, facebookAccountId)

    console.log(`Récupération données ads: compte ${compteId}, ${from} à ${to}`)

    // Vérifier l'accès au compte
    const { data: compteAccess } = await supabaseAdmin
      .from('comptes')
      .select(`
        id,
        entreprise,
        id_facebook_ads,
        compte_users_clients(user_id),
        compte_users_pub_gms(user_id),
        compte_gestionnaires(user_id)
      `)
      .eq('id', compteId)
      .eq('id_facebook_ads', facebookAccountId)
      .single()

    if (!compteAccess) {
      return NextResponse.json(
        { error: 'Compte non trouvé ou accès non autorisé' },
        { status: 403 }
      )
    }

    // Vérifier l'accès utilisateur si pas Superadmin/Direction
    if (session.user.role === 'Responsable') {
      const hasAccess = compteAccess.compte_users_clients?.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id)) ||
                       compteAccess.compte_users_pub_gms?.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id)) ||
                       compteAccess.compte_gestionnaires?.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id))
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Accès non autorisé à ce compte' },
          { status: 403 }
        )
      }
    }

    // Logger la requête à la base de données locale
    await logger.logRequest({
      endpoint: '/facebook/data/ads',
      method: 'GET',
      request_url: request.url,
      request_params: Object.fromEntries(searchParams.entries()),
      level: 'ad',
      date_range_from: from,
      date_range_to: to,
      success: true
    })

    // MAITRE: TOUJOURS FAIRE L'APPEL FACEBOOK - PAS DE DONNÉES LOCALES MOCK
    console.log(`📱 MAITRE: Appel Facebook API direct pour compte ${facebookAccountId}`)
    // Récupérer les clés API Facebook
    const { data: facebookApi, error: apiError } = await supabaseAdmin
      .from('facebook_ads_apis')
      .select('access_token')
      .eq('created_by', session.user.id)
      .eq('is_active', true)
      .single()

    if (apiError || !facebookApi?.access_token) {
      return NextResponse.json({
        error: 'Clés API Facebook non configurées ou invalides',
        message: 'Veuillez configurer vos clés API Facebook dans les paramètres'
      }, { status: 400 })
    }
    
    try {
      // VRAI appel à l'API Facebook avec logging
      const facebookUrl = `https://graph.facebook.com/v22.0/${facebookAccountId}/insights`
      const params = new URLSearchParams({
        fields: 'impressions,clicks,spend,reach,actions,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name',
        time_range: JSON.stringify({
          since: from,
          until: to
        }),
        level: 'ad',
        access_token: facebookApi.access_token,
        limit: limit
      })

      const realResponse = await logger.logApiCall(
        'Facebook Ads API - Get Ads Data',
        'GET',
        `${facebookUrl}?${params}`,
        {
          params: Object.fromEntries(params.entries()),
          level: 'ad',
          dateFrom: from,
          dateTo: to
        }
      ) as FacebookApiResponse

      console.log('🎯 VRAIE réponse Facebook API:', realResponse)
      
      if (realResponse?.data && Array.isArray(realResponse.data)) {
        return NextResponse.json({
          message: `${realResponse.data.length} publicités trouvées via Facebook API`,
          data: realResponse.data,
          facebook_api_called: true,
          source: 'facebook_api'
        })
      } else {
        return NextResponse.json({
          message: 'Aucune publicité trouvée pour cette période',
          data: [],
          facebook_api_called: true,
          facebook_response: realResponse
        })
      }
      
    } catch (apiError) {
      console.error('❌ Erreur VRAI appel Facebook API:', apiError)
      return NextResponse.json({
        message: 'Erreur lors de l\'appel Facebook API',
        data: [],
        facebook_api_called: false,
        error: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }, { status: 500 })
    }


  } catch (error) {
    console.error('Erreur API données ads Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données ads' },
      { status: 500 }
    )
  }
}