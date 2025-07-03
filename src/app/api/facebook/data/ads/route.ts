import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFacebookLogger } from '@/lib/facebook-logger'

interface FacebookAdData {
  id: string
  name: string
  adset_id?: string
  adset?: {
    id: string
    name: string
  }
  campaign_id?: string
  campaign?: {
    id: string
    name: string
  }
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
    adset_name: response.adset?.name || '',
    campaign_id: response.campaign_id || '',
    campaign_name: response.campaign?.name || '',
    
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
    
    // Breakdowns - valeurs par défaut NULL pour éviter conflits contrainte UNIQUE
    age: null,
    gender: null,
    country: null,
    region: null,
    publisher_platform: null,
    platform_position: null,
    impression_device: null
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
    const limit = searchParams.get('limit') || '500' // MAITRE: Augmenter limite pour daily (7 ads x 30 jours = 210+)

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
    
    // Vérifier la fraîcheur des données (moins de 6 heures)
    const maxAge = 6 * 60 * 60 * 1000 // 6 heures en millisecondes
    const oldestAcceptable = new Date(Date.now() - maxAge).toISOString()
    
    // Vérifier si on a des données pour cette période avec intersection correcte
    const { data: localData, error: localError } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('*')
      .eq('compte_id', compteId)
      .eq('account_id', facebookAccountId)
      .eq('sync_status', 'active')
      .gte('created_at', oldestAcceptable) // Données récentes uniquement
      .or(`and(date_start.lte.${to},date_stop.gte.${from})`) // Intersection avec période demandée
    
    if (!localError && localData && localData.length > 0) {
      // MAITRE: Filtrer les données du cache selon la période EXACTE sélectionnée
      const fromDate = new Date(from)
      const toDate = new Date(to)
      
      const filteredLocalData = localData.filter(row => {
        const adStartDate = new Date(row.date_start)
        const adStopDate = new Date(row.date_stop)
        
        // Vérifier si les dates de l'ad intersectent avec la période sélectionnée
        return (adStartDate <= toDate && adStopDate >= fromDate)
      })
      
      console.log(`🔍 FILTRAGE CACHE: ${localData.length} → ${filteredLocalData.length} pour période ${from} à ${to}`)
      
      // Si on a des données filtrées pour cette période exacte
      if (filteredLocalData.length > 0) {
        // Agrégation des métriques pour la période exacte (si plusieurs jours)
        const aggregatedData = aggregateAdsByPeriod(filteredLocalData, fromDate, toDate)
        
        console.log(`💾 CACHE LOCAL FILTRÉ: ${aggregatedData.length} publicités agrégées pour période exacte`)
        return NextResponse.json({
          message: `${aggregatedData.length} publicités trouvées depuis le cache local (filtrées pour période ${from} à ${to})`,
          data: aggregatedData,
          facebook_api_called: false,
          source: 'local_cache_filtered',
          cache_hit: true,
          original_count: localData.length,
          filtered_count: filteredLocalData.length,
          aggregated_count: aggregatedData.length,
          period: { from, to }
        })
      } else {
        console.log(`⚠️ CACHE LOCAL VIDE pour période ${from} à ${to} - appel Facebook nécessaire`)
      }
    } else if (localError) {
      console.log(`❌ ERREUR CACHE LOCAL:`, localError)
    } else {
      console.log(`📭 CACHE LOCAL VIDE: Aucune donnée récente trouvée`)
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
      console.log('📅 DATES EXACTES envoyées à Facebook:', { from, to })
      
      // MAITRE: FORCE ABSOLUE DAILY - STOP MONTHLY DATA
      const dateFrom = new Date(from)
      const dateTo = new Date(to)
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      console.log(`🚨 MAITRE: SUPPRESSION DATA MONTHLY - FORCE DAILY`)
      console.log(`📅 Période demandée: ${from} à ${to} (${daysDiff} jours)`)
      console.log(`📊 Limite: ${limit} lignes max (pour supporter ${daysDiff} jours x plusieurs ads)`)
      
      // MAITRE: Syntaxe corrigée pour Facebook API v22.0 - time_increment dans params séparés
      
      const params = new URLSearchParams({
        fields: `insights{impressions,reach,frequency,spend,clicks,unique_clicks,cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,website_ctr,cost_per_inline_link_click,cost_per_unique_click,actions,action_values,unique_actions,date_start,date_stop},id,name,adset_id,adset{name},campaign_id,campaign{name},status,effective_status`,
        time_range: JSON.stringify({
          since: from,
          until: to
        }),
        time_increment: '1',
        access_token: facebookApi.access_token,
        limit: limit
      })
      
      console.log(`🎯 PARAMS FACEBOOK: time_increment(1) + time_range comme paramètres séparés`)
      console.log('📊 Fields complets:', params.get('fields'))
      console.log('📅 Time range:', params.get('time_range'))
      console.log('⏰ Time increment:', params.get('time_increment'))

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
        daysDiff: daysDiff,
        params_sent: {
          time_increment_in_fields: true,
          time_range: { from, to }
        },
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
      
      console.log(`🔍 MAITRE DEBUG: Response has ${realResponse?.data?.length || 0} ads from Facebook`)
      
      if (realResponse?.data && Array.isArray(realResponse.data)) {
        // MAITRE: Logger CHAQUE ad pour comprendre + analyser insights
        realResponse.data.forEach((ad, index) => {
          console.log(`📌 Ad ${index + 1}/${realResponse.data?.length || 0}: ${ad.name} (${ad.id})`)
          console.log(`   - Status: ${ad.status}, Effective: ${ad.effective_status}`)
          console.log(`   - Has insights: ${(ad.insights?.data?.length || 0) > 0 ? 'YES' : 'NO'}`)
          
          // MAITRE: Analyser la structure des insights pour comprendre daily vs monthly
          if (ad.insights?.data && ad.insights.data.length > 0) {
            const firstInsight = ad.insights.data[0]
            console.log(`   - Insights count: ${ad.insights.data.length}`)
            console.log(`   - First insight dates: ${firstInsight.date_start} à ${firstInsight.date_stop}`)
            console.log(`   - Is daily: ${firstInsight.date_start === firstInsight.date_stop ? 'YES ✅' : 'NO ❌'}`)
            console.log(`   - Spend: ${firstInsight.spend}`)
          }
        })
        
        // FACEBOOK.md: Mapper et filtrer les données selon la période EXACTE
        const mappedData = realResponse.data.flatMap(ad => {
          try {
            // Si l'ad a des insights multiples (journaliers), les traiter séparément
            if (ad.insights?.data && Array.isArray(ad.insights.data) && ad.insights.data.length > 0) {
              return ad.insights.data.map(insight => {
                // Créer une nouvelle structure pour chaque jour d'insights
                const adWithSingleInsight = {
                  ...ad,
                  insights: { data: [insight] }
                }
                return mapFacebookResponseToDatabase(adWithSingleInsight, facebookAccountId, compteId, session.user.id)
              }).filter(mappedAd => {
                // MAITRE: Filtrer selon la période EXACTE sélectionnée
                if (!mappedAd.date_start || !mappedAd.date_stop) return false
                
                const adStartDate = new Date(mappedAd.date_start)
                const adStopDate = new Date(mappedAd.date_stop)
                const fromDate = new Date(from)
                const toDate = new Date(to)
                
                // Vérifier si les dates de l'ad intersectent avec la période sélectionnée
                const isInPeriod = (adStartDate <= toDate && adStopDate >= fromDate)
                
                if (!isInPeriod) {
                  console.log(`🗓️ Exclu: Ad ${mappedAd.ad_name} (${mappedAd.date_start} à ${mappedAd.date_stop}) hors période (${from} à ${to})`)
                }
                
                return isInPeriod
              })
            } else {
              // MAITRE: Ad sans insights - Logger pour comprendre
              console.log(`⚠️ Ad sans insights: ${ad.name} (${ad.id})`)
              console.log(`   Status: ${ad.status}, Effective: ${ad.effective_status}`)
              console.log(`   Insights:`, JSON.stringify(ad.insights))
              return [] // Ne pas mapper les ads sans data
            }
          } catch (mapError) {
            console.error('❌ Erreur mapping ad:', ad.id, mapError)
            return []
          }
        }).filter(Boolean) // Supprimer les null/undefined
        
        console.log(`✅ ${mappedData.length} publicités mappées et filtrées pour période ${from} à ${to}`)
        
        // MAITRE: DEBUG AVANCÉ - analyser la granularité des données
        mappedData.forEach((ad, index) => {
          if (index < 3) { // Analyser les 3 premières ads
            console.log(`🔍 DEBUG Ad ${index + 1}: ${ad.ad_name}`)
            console.log(`   📅 Dates: ${ad.date_start} à ${ad.date_stop}`)
            console.log(`   💰 Spend: ${ad.spend}`)
            console.log(`   👁️ Impressions: ${ad.impressions}`)
            
            // Vérifier si c'est vraiment daily (date_start === date_stop)
            const isDailyData = ad.date_start === ad.date_stop
            console.log(`   📊 Granularité: ${isDailyData ? 'DAILY ✅' : 'MONTHLY/AGGREGATE ❌'}`)
          }
        })
        
        // MAITRE: Diagnostiquer ads manquantes
        const uniqueAdIds = new Set(mappedData.map(ad => ad.ad_id))
        console.log(`📊 DIAGNOSTIC ADS: ${uniqueAdIds.size} ads uniques trouvées`)
        console.log(`📊 Total lignes daily: ${mappedData.length} (moyenne ${Math.round(mappedData.length / uniqueAdIds.size)} jours/ad)`)
        
        // MAITRE: Compter vraies données daily vs aggregated
        const dailyCount = mappedData.filter(ad => ad.date_start === ad.date_stop).length
        const aggregatedCount = mappedData.length - dailyCount
        console.log(`📈 GRANULARITÉ: ${dailyCount} lignes daily, ${aggregatedCount} lignes agrégées`)
        
        // MAITRE: SAUVEGARDER EN BASE POUR ÉCONOMISER LES APPELS FUTURS
        if (mappedData.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('facebook_ads_data')
            .upsert(mappedData, {
              onConflict: 'compte_id,ad_id,date_start,date_stop'
            })
          
          if (insertError) {
            console.error(`❌ Erreur sauvegarde en base:`, {
              error: insertError,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              code: insertError.code,
              dataCount: mappedData.length,
              sampleData: mappedData[0]
            })
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

// MAITRE: Fonction d'agrégation des données par période exacte
function aggregateAdsByPeriod(adsData: unknown[], fromDate: Date, toDate: Date) {
  // Grouper par ad_id pour agréger les métriques sur la période
  const adGroups = new Map<string, unknown[]>()
  
  adsData.forEach(ad => {
    const adData = ad as Record<string, unknown>
    const key = adData.ad_id as string
    if (!adGroups.has(key)) {
      adGroups.set(key, [])
    }
    adGroups.get(key)!.push(ad)
  })
  
  // Agréger chaque groupe d'ads
  return Array.from(adGroups.entries()).map(([, ads]) => {
    const firstAd = ads[0] as Record<string, unknown>
    
    // Calculer les totaux pour la période
    const aggregated = {
      ...firstAd, // Garder les infos de base (nom, campagne, etc.)
      
      // Métriques agrégées (somme)
      spend: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.spend as number) || 0)
      }, 0),
      impressions: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.impressions as number) || 0)
      }, 0),
      clicks: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.clicks as number) || 0)
      }, 0),
      reach: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.reach as number) || 0)
      }, 0),
      unique_clicks: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.unique_clicks as number) || 0)
      }, 0),
      inline_link_clicks: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.inline_link_clicks as number) || 0)
      }, 0),
      inline_post_engagement: ads.reduce((sum: number, ad) => {
        const adData = ad as Record<string, unknown>
        return sum + ((adData.inline_post_engagement as number) || 0)
      }, 0),
      
      // Métriques calculées (moyennes pondérées)
      ctr: 0, // Sera calculé après
      cpc: 0, // Sera calculé après
      cpm: 0, // Sera calculé après
      frequency: 0, // Sera calculé après
      website_ctr: 0, // Sera calculé après
      cost_per_inline_link_click: 0, // Sera calculé après
      cost_per_unique_click: 0, // Sera calculé après
      
      // Dates de la période agrégée
      date_start: fromDate.toISOString().split('T')[0],
      date_stop: toDate.toISOString().split('T')[0],
      
      // Actions agrégées (JSON)
      actions: aggregateActions(ads, 'actions'),
      action_values: aggregateActions(ads, 'action_values'),
      unique_actions: aggregateActions(ads, 'unique_actions')
    }
    
    // Calculer les métriques dérivées
    const totalImpressions = aggregated.impressions
    const totalClicks = aggregated.clicks
    const totalSpend = aggregated.spend
    const totalReach = aggregated.reach
    const totalInlineClicks = aggregated.inline_link_clicks
    const totalUniqueClicks = aggregated.unique_clicks
    
    aggregated.ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    aggregated.cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    aggregated.cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    aggregated.frequency = totalReach > 0 ? totalImpressions / totalReach : 0
    aggregated.website_ctr = totalImpressions > 0 ? (totalInlineClicks / totalImpressions) * 100 : 0
    aggregated.cost_per_inline_link_click = totalInlineClicks > 0 ? totalSpend / totalInlineClicks : 0
    aggregated.cost_per_unique_click = totalUniqueClicks > 0 ? totalSpend / totalUniqueClicks : 0
    
    return aggregated
  })
}

// Fonction helper pour agréger les actions JSON
function aggregateActions(ads: unknown[], actionField: string) {
  const actionTotals = new Map<string, number>()
  
  ads.forEach(ad => {
    try {
      const adData = ad as Record<string, unknown>
      const actions = adData[actionField] ? JSON.parse(adData[actionField] as string) : []
      actions.forEach((action: Record<string, unknown>) => {
        const key = action.action_type as string
        const value = parseFloat((action.value as string) || '0')
        actionTotals.set(key, (actionTotals.get(key) || 0) + value)
      })
    } catch (e) {
      // Ignorer les erreurs de parsing JSON
    }
  })
  
  // Convertir en format Facebook
  const aggregatedActions = Array.from(actionTotals.entries()).map(([action_type, value]) => ({
    action_type,
    value: value.toString()
  }))
  
  return JSON.stringify(aggregatedActions)
}