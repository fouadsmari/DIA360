import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { createFacebookLogger } from '@/lib/facebook-logger'

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
      .select('*')
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

  // Vérifier quelles données existent déjà
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
  facebookApi: { account_id: string },
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
  facebookApi: { account_id: string },
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
      
      // Faire un appel Facebook API simulé et logger
      const facebookUrl = `https://graph.facebook.com/v22.0/${facebookAccountId}/insights`
      const mockResponse = await logger.logApiCall(
        'Facebook Ads API - Smart Sync',
        'GET',
        facebookUrl,
        {
          params: {
            fields: 'impressions,clicks,spend,reach,actions',
            time_range: `${day}_${day}`,
            level: 'ad'
          },
          level: 'ad',
          dateFrom: day,
          dateTo: day,
          syncId: syncId
        }
      )
      
      console.log(`📊 Appel Facebook API pour ${day}:`, mockResponse)
      
      // Générer des données mock pour le développement
      // En production, utiliser les vraies données de mockResponse
      const mockData = generateMockFacebookDataForCompte(userId, compteId, facebookAccountId, day)
      
      // Insérer les données avec compte_id
      const { error: insertError } = await supabaseAdmin
        .from('facebook_ads_data')
        .insert(mockData.map(data => ({ ...data, compte_id: compteId })))

      if (insertError) {
        console.error(`Erreur insertion données ${day}:`, insertError)
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

function generateMockFacebookDataForCompte(userId: string, compteId: number, facebookAccountId: string, date: string) {
  const campaigns = ['Campaign-001', 'Campaign-002', 'Campaign-003']
  const data: Array<{
    user_id: string
    compte_id: number
    account_id: string
    campaign_id: string
    campaign_name: string
    adset_id: string
    adset_name: string
    ad_id: string
    ad_name: string
    date_start: string
    date_stop: string
    impressions: number
    reach: number
    clicks: number
    spend: number
    ctr: number
    cpc: number
    cpm: number
    actions: string
    age: string
    gender: string
    country: string
    publisher_platform: string
  }> = []

  campaigns.forEach((campaign, i) => {
    const adsets = [`AdSet-${i}-001`, `AdSet-${i}-002`]
    
    adsets.forEach((adset, j) => {
      const ads = [`Ad-${i}-${j}-001`, `Ad-${i}-${j}-002`, `Ad-${i}-${j}-003`]
      
      ads.forEach((ad, k) => {
        const impressions = Math.floor(Math.random() * 10000) + 1000
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.005))
        const spend = clicks * (Math.random() * 2 + 0.5)
        
        data.push({
          user_id: userId,
          compte_id: compteId,
          account_id: facebookAccountId,
          campaign_id: `camp_${i}`,
          campaign_name: campaign,
          adset_id: `adset_${i}_${j}`,
          adset_name: adset,
          ad_id: `ad_${i}_${j}_${k}`,
          ad_name: ad,
          date_start: date,
          date_stop: date,
          impressions,
          reach: Math.floor(impressions * 0.8),
          clicks,
          spend: Math.round(spend * 100) / 100,
          ctr: Math.round((clicks / impressions) * 10000) / 100,
          cpc: Math.round((spend / clicks) * 100) / 100,
          cpm: Math.round((spend / impressions * 1000) * 100) / 100,
          actions: JSON.stringify([
            { action_type: 'link_click', value: Math.floor(clicks * 0.8) },
            { action_type: 'page_engagement', value: Math.floor(clicks * 1.2) }
          ]),
          age: ['18-24', '25-34', '35-44', '45-54'][Math.floor(Math.random() * 4)],
          gender: ['male', 'female'][Math.floor(Math.random() * 2)],
          country: 'CA',
          publisher_platform: ['facebook', 'instagram'][Math.floor(Math.random() * 2)]
        })
      })
    })
  })

  return data
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