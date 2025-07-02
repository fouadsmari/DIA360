import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFacebookLogger } from '@/lib/facebook-logger'

interface FacebookAdData {
  id: string
  name: string
  adset_id?: string
  campaign_id?: string
  status?: string
  effective_status?: string
  insights?: {
    data: Array<{
      impressions?: string
      reach?: string
      frequency?: string
      spend?: string
      clicks?: string
      unique_clicks?: string
      cpc?: string
      cpm?: string
      ctr?: string
      inline_link_clicks?: string
      inline_post_engagement?: string
      website_ctr?: string
      cost_per_inline_link_click?: string
      cost_per_unique_click?: string
      actions?: Array<{ action_type: string; value: string }>
      action_values?: Array<{ action_type: string; value: string }>
      unique_actions?: Array<{ action_type: string; value: string }>
      date_start?: string
      date_stop?: string
    }>
  }
}

interface FacebookApiResponse {
  data?: FacebookAdData[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
  }
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

// FACEBOOK.md: Fonction de mapping des données
function mapFacebookResponseToDatabase(response: FacebookAdData, accountId: string, compteId: number, userId: string) {
  // Validation des données obligatoires
  if (!response.id || !response.insights?.data || response.insights.data.length === 0) {
    throw new Error('Données Facebook invalides ou incomplètes')
  }
  
  const insights = response.insights.data[0] // Premier élément des insights
  
  // Validation des métriques (pas de valeurs négatives)
  const spend = parseFloat(insights.spend || '0')
  const impressions = parseInt(insights.impressions || '0')
  const clicks = parseInt(insights.clicks || '0')
  
  if (spend < 0 || impressions < 0 || clicks < 0) {
    throw new Error('Métriques Facebook invalides (valeurs négatives)')
  }
  
  return {
    // Références ARCHITECTURE UNIFIÉE
    compte_id: compteId,
    user_id: userId,
    account_id: accountId,
    
    // Champs hiérarchiques (MAPPING CORRIGÉ FACEBOOK.md)
    ad_id: response.id,
    ad_name: response.name || '',
    adset_id: response.adset_id || '',
    campaign_id: response.campaign_id || '',
    
    // Dates
    date_start: insights.date_start || '',
    date_stop: insights.date_stop || '',
    
    // Métriques depuis insights (VALIDATION + CONVERSION)
    impressions: impressions,
    reach: parseInt(insights.reach || '0'),
    frequency: parseFloat(insights.frequency || '0'),
    spend: spend,
    clicks: clicks,
    unique_clicks: parseInt(insights.unique_clicks || '0'),
    cpc: parseFloat(insights.cpc || '0'),
    cpm: parseFloat(insights.cpm || '0'),
    ctr: parseFloat(insights.ctr || '0'),
    inline_link_clicks: parseInt(insights.inline_link_clicks || '0'),
    inline_post_engagement: parseInt(insights.inline_post_engagement || '0'),
    website_ctr: parseFloat(insights.website_ctr || '0'),
    cost_per_inline_link_click: parseFloat(insights.cost_per_inline_link_click || '0'),
    cost_per_unique_click: parseFloat(insights.cost_per_unique_click || '0'),
    
    // Actions (NETTOYAGE JSON)
    actions: insights.actions ? JSON.stringify(insights.actions) : '[]',
    action_values: insights.action_values ? JSON.stringify(insights.action_values) : '[]',
    unique_actions: insights.unique_actions ? JSON.stringify(insights.unique_actions) : '[]',
    
    // Métadonnées
    sync_status: 'active' as const,
    data_quality_score: calculateDataQualityScore(insights)
  }
}

// Fonction de calcul de score qualité (FACEBOOK.md)
function calculateDataQualityScore(insights: { impressions?: string; spend?: string; clicks?: string; actions?: unknown[]; reach?: string }): number {
  let score = 100
  
  // Pénalités pour données manquantes
  if (!insights.impressions || insights.impressions === '0') score -= 20
  if (!insights.spend || insights.spend === '0') score -= 10
  if (!insights.clicks || insights.clicks === '0') score -= 5
  
  // Bonus pour données complètes
  if (insights.actions && insights.actions.length > 0) score += 5
  if (insights.reach && parseInt(insights.reach) > 0) score += 5
  
  return Math.max(0, Math.min(100, score))
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

    // MAITRE: VÉRIFIER D'ABORD LA BASE LOCALE POUR ÉCONOMISER LES APPELS
    console.log(`📱 MAITRE: Vérification cache local pour compte ${facebookAccountId}`)
    
    // Vérifier si on a déjà les données dans la base
    const { data: localData, error: localError } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('*')
      .eq('compte_id', compteId)
      .eq('account_id', facebookAccountId)
      .gte('date_start', from)
      .lte('date_start', to)
      .eq('sync_status', 'active')
    
    if (!localError && localData && localData.length > 0) {
      console.log(`💾 CACHE LOCAL: ${localData.length} publicités trouvées en base locale`)
      return NextResponse.json({
        message: `${localData.length} publicités trouvées depuis le cache local`,
        data: localData,
        facebook_api_called: false,
        source: 'local_cache',
        cache_hit: true
      })
    }
    
    console.log(`📱 MAITRE: Aucune donnée locale, appel Facebook API pour compte ${facebookAccountId}`)
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
      // FACEBOOK.md: URL CORRECTE avec préfixe act_ obligatoire
      const accountIdWithPrefix = facebookAccountId.startsWith('act_') ? facebookAccountId : `act_${facebookAccountId}`
      const facebookUrl = `https://graph.facebook.com/v22.0/${accountIdWithPrefix}/ads`
      
      console.log('📱 MAITRE: URL Facebook construite:', facebookUrl)
      const params = new URLSearchParams({
        fields: `insights{impressions,reach,frequency,spend,clicks,unique_clicks,cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,website_ctr,cost_per_inline_link_click,cost_per_unique_click,actions,action_values,unique_actions},id,name,adset_id,campaign_id,status,effective_status`,
        time_range: JSON.stringify({
          since: from,
          until: to
        }),
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

      console.log('🎯 VRAIE réponse Facebook API:', {
        hasData: !!realResponse?.data,
        dataIsArray: Array.isArray(realResponse?.data),
        dataLength: realResponse?.data?.length || 0,
        error: realResponse?.error,
        fullResponse: realResponse
      })
      
      // MAITRE: Vérifier si Facebook retourne une erreur
      if (realResponse?.error) {
        console.error('❌ Erreur Facebook API:', realResponse.error)
        return NextResponse.json({
          message: `Erreur Facebook API: ${realResponse.error.message || 'Erreur inconnue'}`,
          data: [],
          facebook_api_called: true,
          facebook_error: realResponse.error,
          facebook_response: realResponse
        }, { status: 400 })
      }
      
      if (realResponse?.data && Array.isArray(realResponse.data)) {
        // FACEBOOK.md: Mapper les données selon le format correct
        const mappedData = realResponse.data.map(ad => {
          try {
            return mapFacebookResponseToDatabase(ad, facebookAccountId, compteId, session.user.id)
          } catch (mapError) {
            console.error('❌ Erreur mapping ad:', ad.id, mapError)
            return null
          }
        }).filter(Boolean) // Supprimer les null
        
        console.log(`✅ ${mappedData.length} publicités mappées avec succès`)
        
        // MAITRE: SAUVEGARDER EN BASE POUR ÉCONOMISER LES APPELS FUTURS
        if (mappedData.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('facebook_ads_data')
            .upsert(mappedData, {
              onConflict: 'compte_id,ad_id,date_start,date_stop,age,gender,country,publisher_platform,platform_position,impression_device'
            })
          
          if (insertError) {
            console.error(`❌ Erreur sauvegarde en base:`, insertError)
          } else {
            console.log(`💾 ${mappedData.length} publicités sauvegardées en cache local`)
          }
        }
        
        return NextResponse.json({
          message: `${mappedData.length} publicités trouvées et mappées via Facebook API`,
          data: mappedData,
          facebook_api_called: true,
          source: 'facebook_api',
          raw_count: realResponse.data.length,
          mapped_count: mappedData.length,
          cached: mappedData.length > 0
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