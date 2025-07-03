import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
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

interface SyncRequest {
  compteId: number
  facebookAccountId: string
  dateFrom: string
  dateTo: string
  comparisonDateFrom?: string
  comparisonDateTo?: string
  level: 'account' | 'campaign' | 'adset' | 'ad'
}

interface DataAvailability {
  primaryPeriod: {
    totalDays: number
    availableDays: number
    missingDays: string[]
    dataExists: boolean
  }
  comparisonPeriod?: {
    totalDays: number
    availableDays: number
    missingDays: string[]
    dataExists: boolean
  }
  needsSync: boolean
  canDisplayData: boolean
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier et appliquer la migration si nécessaire
    await ensureDatabaseMigration()

    const {
      compteId,
      facebookAccountId,
      dateFrom,
      dateTo,
      comparisonDateFrom,
      comparisonDateTo,
      level
    }: SyncRequest = await request.json()

    if (!compteId || !facebookAccountId || !dateFrom || !dateTo || !level) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    console.log(`Smart sync check - Compte: ${compteId}, Facebook: ${facebookAccountId}, Période: ${dateFrom} à ${dateTo}`)

    // Vérifier que l'utilisateur a accès à ce compte
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

    // Vérifier API Facebook configurée pour cet utilisateur
    const { data: facebookApi, error: apiError } = await supabaseAdmin
      .from('facebook_ads_apis')
      .select('account_id, app_id, access_token')
      .eq('created_by', session.user.id)
      .eq('is_active', true)
      .single()

    if (apiError || !facebookApi) {
      return NextResponse.json(
        { error: 'Aucune API Facebook configurée. Veuillez configurer vos clés API Facebook.' },
        { status: 400 }
      )
    }

    // Analyser la disponibilité des données pour la période principale
    const primaryAvailability = await checkDataAvailability(
      compteId,
      facebookAccountId,
      dateFrom,
      dateTo
    )

    // Analyser la période de comparaison si fournie
    let comparisonAvailability
    if (comparisonDateFrom && comparisonDateTo) {
      comparisonAvailability = await checkDataAvailability(
        compteId,
        facebookAccountId,
        comparisonDateFrom,
        comparisonDateTo
      )
    }

    const dataAnalysis: DataAvailability = {
      primaryPeriod: primaryAvailability,
      comparisonPeriod: comparisonAvailability,
      needsSync: primaryAvailability.missingDays.length > 0 || 
                (comparisonAvailability?.missingDays.length || 0) > 0,
      canDisplayData: primaryAvailability.dataExists || 
                     (comparisonAvailability?.dataExists || false)
    }

    // Si on a besoin de sync, démarrer la synchronisation intelligente
    if (dataAnalysis.needsSync) {
      await startSmartSync(
        session.user.id,
        compteId,
        facebookAccountId,
        facebookApi,
        primaryAvailability.missingDays,
        comparisonAvailability?.missingDays || []
      )
    }

    return NextResponse.json({
      success: true,
      dataAnalysis,
      message: dataAnalysis.needsSync 
        ? 'Synchronisation des données manquantes en cours...'
        : 'Toutes les données sont disponibles'
    })

  } catch (error) {
    console.error('Erreur smart sync Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse des données' },
      { status: 500 }
    )
  }
}

async function checkDataAvailability(
  compteId: number,
  facebookAccountId: string,
  dateFrom: string,
  dateTo: string
) {
  // Générer toutes les dates de la période
  const allDays = eachDayOfInterval({
    start: parseISO(dateFrom),
    end: parseISO(dateTo)
  }).map(date => format(date, 'yyyy-MM-dd'))

  // MAITRE: Vérifier données selon architecture unifiée
  const { data: existingData } = await supabaseAdmin
    .from('facebook_ads_data')
    .select('date_start')
    .eq('compte_id', compteId)
    .eq('account_id', facebookAccountId)
    .gte('date_start', dateFrom)
    .lte('date_start', dateTo)

  const existingDays = new Set(existingData?.map(d => d.date_start) || [])
  const missingDays = allDays.filter(day => !existingDays.has(day))

  return {
    totalDays: allDays.length,
    availableDays: existingDays.size,
    missingDays,
    dataExists: existingDays.size > 0
  }
}

async function startSmartSync(
  userId: string,
  compteId: number,
  facebookAccountId: string,
  facebookApi: { account_id: string; app_id: string; access_token: string },
  primaryMissingDays: string[],
  comparisonMissingDays: string[]
) {
  const allMissingDays = Array.from(new Set([...primaryMissingDays, ...comparisonMissingDays]))
  
  if (allMissingDays.length === 0) return

  console.log(`Démarrage sync intelligent - ${allMissingDays.length} jours manquants`)

  // Créer ou mettre à jour le statut de synchronisation
  const syncId = `${compteId}_${facebookAccountId}_${Date.now()}`
  
  await supabaseAdmin
    .from('facebook_sync_status')
    .upsert({
      user_id: userId,
      compte_id: compteId,
      account_id: facebookAccountId,
      sync_id: syncId,
      date_start: allMissingDays[0],
      date_stop: allMissingDays[allMissingDays.length - 1],
      status: 'syncing',
      progress: 0,
      total_days: allMissingDays.length,
      synced_days: 0,
      started_at: new Date().toISOString()
    })

  // Démarrer la synchronisation en arrière-plan
  syncMissingData(userId, compteId, facebookAccountId, facebookApi, allMissingDays, syncId)
}

async function syncMissingData(
  userId: string,
  compteId: number,
  facebookAccountId: string,
  facebookApi: { account_id: string; app_id: string; access_token: string },
  missingDays: string[],
  syncId: string
) {
  let syncedDays = 0
  const totalDays = missingDays.length
  
  // Créer le logger Facebook
  const logger = await createFacebookLogger(userId, compteId, facebookAccountId)

  try {
    for (const day of missingDays) {
      console.log(`Synchronisation jour ${day} pour compte ${compteId}`)
      
      // FACEBOOK.md: URL CORRECTE avec préfixe act_ obligatoire
      const accountIdWithPrefix = facebookAccountId.startsWith('act_') ? facebookAccountId : `act_${facebookAccountId}`
      const facebookUrl = `https://graph.facebook.com/v22.0/${accountIdWithPrefix}/ads`
      const params = new URLSearchParams({
        fields: `insights{impressions,reach,frequency,spend,clicks,unique_clicks,cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,website_ctr,cost_per_inline_link_click,cost_per_unique_click,actions,action_values,unique_actions},id,name,adset_id,adset{name},campaign_id,campaign{name},status,effective_status`,
        time_range: JSON.stringify({
          since: day,
          until: day
        }),
        access_token: facebookApi.access_token || '',
        limit: '1000'
      })

      try {
        // VRAI appel API Facebook avec logging
        const realResponse = await logger.logApiCall(
          'Facebook Ads API - Real Sync',
          'GET',
          `${facebookUrl}?${params}`,
          {
            params: Object.fromEntries(params.entries()),
            level: 'ad',
            dateFrom: day,
            dateTo: day,
            syncId: syncId
          }
        ) as FacebookApiResponse

        console.log(`🎯 VRAI appel Facebook API pour ${day}:`, realResponse)
        
        // MAITRE: STOCKER LES VRAIES DONNÉES FACEBOOK POUR ÉCONOMISER LES APPELS
        console.log(`📋 Traitement des données Facebook pour ${day}`)
        
        // Traiter et stocker les vraies données Facebook
        if (realResponse?.data && Array.isArray(realResponse.data)) {
          console.log(`✅ ${realResponse.data.length} publicités trouvées via Facebook API pour ${day}`)
          
          // Mapper et insérer les données dans la base
          const mappedData = realResponse.data.map(ad => {
            try {
              return mapFacebookResponseToDatabase(ad, facebookAccountId, compteId, userId)
            } catch (mapError) {
              console.error('❌ Erreur mapping ad:', ad.id, mapError)
              return null
            }
          }).filter(Boolean) // Supprimer les null
          
          if (mappedData.length > 0) {
            // Insérer en base pour économiser les appels futurs
            const { error: insertError } = await supabaseAdmin
              .from('facebook_ads_data')
              .upsert(mappedData, {
                onConflict: 'compte_id,ad_id,date_start,date_stop,age,gender,country,publisher_platform,platform_position,impression_device'
              })
            
            if (insertError) {
              console.error(`❌ Erreur insertion BDD pour ${day}:`, insertError)
            } else {
              console.log(`💾 ${mappedData.length} publicités sauvegardées en base pour ${day}`)
            }
          }
        } else {
          console.log(`📭 Aucune publicité Facebook trouvée pour ${day}`)
        }
      } catch (apiError) {
        console.error(`❌ Erreur appel Facebook API pour ${day}:`, apiError)
        // Continuer avec le jour suivant
        continue
      }

      syncedDays++
      const progress = Math.round((syncedDays / totalDays) * 100)

      // Mettre à jour le progrès
      await supabaseAdmin
        .from('facebook_sync_status')
        .update({
          progress,
          synced_days: syncedDays,
          last_sync_at: new Date().toISOString()
        })
        .eq('sync_id', syncId)

      // Attendre pour éviter les rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Marquer comme terminé
    await supabaseAdmin
      .from('facebook_sync_status')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('sync_id', syncId)

    console.log(`Sync terminé pour ${syncedDays} jours`)

  } catch (error) {
    console.error('Erreur sync données:', error)
    
    await supabaseAdmin
      .from('facebook_sync_status')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erreur inconnue'
      })
      .eq('sync_id', syncId)
  }
}

async function ensureDatabaseMigration() {
  try {
    // Vérifier si la colonne compte_id existe en essayant de l'utiliser dans une requête
    const { error: checkError } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('compte_id')
      .limit(1)

    if (checkError && (checkError.message.includes('column "compte_id" does not exist') || 
                       checkError.message.includes('compte_id'))) {
      console.log('Column compte_id missing, migration required but will be handled manually.')
      console.log('Please run the migration script: scripts/add-compte-id-to-facebook-tables.sql')
    } else {
      console.log('Database migration check passed - compte_id column exists')
    }
  } catch (error) {
    console.log('Migration check completed with note:', error)
  }
}

// FACEBOOK.md: Fonction de mapping des données (même que dans ads/route.ts)
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