import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { dateFrom, dateTo, level } = await request.json()

    if (!dateFrom || !dateTo || !level) {
      return NextResponse.json(
        { error: 'Date de début, date de fin et niveau sont requis' },
        { status: 400 }
      )
    }

    console.log(`Début synchronisation Facebook ${level}: ${dateFrom} à ${dateTo}`)

    // Vérifier si l'utilisateur a une API Facebook configurée
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

    // Vérifier les données existantes
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('date_start, date_stop')
      .eq('user_id', session.user.id)
      .gte('date_start', dateFrom)
      .lte('date_stop', dateTo)

    if (existingError) {
      console.error('Erreur vérification données existantes:', existingError)
    }

    // Calculer les jours manquants
    const missingDays = calculateMissingDays(dateFrom, dateTo, existingData || [])
    
    if (missingDays.length === 0) {
      return NextResponse.json({
        message: 'Données déjà à jour',
        status: 'completed',
        progress: 100
      })
    }

    // Créer ou mettre à jour le statut de synchronisation
    const { error: statusError } = await supabaseAdmin
      .from('facebook_sync_status')
      .upsert({
        user_id: session.user.id,
        account_id: facebookApi.account_id || 'default',
        date_start: dateFrom,
        date_stop: dateTo,
        status: 'syncing',
        progress: 0,
        total_days: missingDays.length,
        synced_days: 0,
        started_at: new Date().toISOString()
      })

    if (statusError) {
      console.error('Erreur création statut sync:', statusError)
    }

    // Démarrer la synchronisation en arrière-plan
    syncFacebookData(session.user.id, facebookApi, missingDays, dateFrom, dateTo)

    return NextResponse.json({
      message: 'Synchronisation démarrée',
      status: 'syncing',
      progress: 0,
      totalDays: missingDays.length
    })

  } catch (error) {
    console.error('Erreur API sync Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors du démarrage de la synchronisation' },
      { status: 500 }
    )
  }
}

function calculateMissingDays(dateFrom: string, dateTo: string, existingData: any[]): string[] {
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  const existing = new Set(existingData.map(d => d.date_start))
  const missing: string[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    if (!existing.has(dateStr)) {
      missing.push(dateStr)
    }
  }

  return missing
}

async function syncFacebookData(userId: string, facebookApi: any, missingDays: string[], dateFrom: string, dateTo: string) {
  let syncedDays = 0
  const totalDays = missingDays.length

  try {
    for (const day of missingDays) {
      // Simuler appel API Facebook ici
      // En production, utiliser l'API Facebook Marketing v22
      console.log(`Synchronisation jour ${day} pour utilisateur ${userId}`)
      
      // Simuler des données pour le développement
      const mockData = generateMockFacebookData(userId, day, facebookApi.account_id)
      
      // Insérer les données dans la base
      const { error: insertError } = await supabaseAdmin
        .from('facebook_ads_data')
        .insert(mockData)

      if (insertError) {
        console.error(`Erreur insertion données ${day}:`, insertError)
        continue
      }

      syncedDays++
      const progress = Math.round((syncedDays / totalDays) * 100)

      // Mettre à jour le progress
      await supabaseAdmin
        .from('facebook_sync_status')
        .update({
          progress,
          synced_days: syncedDays
        })
        .eq('user_id', userId)
        .eq('date_start', dateFrom)
        .eq('date_stop', dateTo)

      // Attendre 100ms pour éviter les rate limits
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
      .eq('user_id', userId)
      .eq('date_start', dateFrom)
      .eq('date_stop', dateTo)

    // Log de succès
    await supabaseAdmin
      .from('facebook_import_logs')
      .insert({
        user_id: userId,
        account_id: facebookApi.account_id || 'default',
        date_start: dateFrom,
        date_stop: dateTo,
        status: 'success',
        rows_imported: syncedDays,
        duration_seconds: Math.floor((Date.now() - new Date().getTime()) / 1000)
      })

  } catch (error) {
    console.error('Erreur sync Facebook:', error)
    
    // Marquer comme failed
    await supabaseAdmin
      .from('facebook_sync_status')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erreur inconnue'
      })
      .eq('user_id', userId)
      .eq('date_start', dateFrom)
      .eq('date_stop', dateTo)
  }
}

function generateMockFacebookData(userId: string, date: string, accountId: string) {
  // Générer des données mock pour le développement
  // En production, ces données viendraient de l'API Facebook
  const campaigns = ['Campaign-001', 'Campaign-002', 'Campaign-003']
  const data = []

  campaigns.forEach((campaign, i) => {
    const adsets = [`AdSet-${i}-001`, `AdSet-${i}-002`]
    
    adsets.forEach((adset, j) => {
      const ads = [`Ad-${i}-${j}-001`, `Ad-${i}-${j}-002`, `Ad-${i}-${j}-003`]
      
      ads.forEach((ad, k) => {
        const impressions = Math.floor(Math.random() * 10000) + 1000
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.005)) // CTR entre 0.5% et 5.5%
        const spend = clicks * (Math.random() * 2 + 0.5) // CPC entre 0.5$ et 2.5$
        
        data.push({
          user_id: userId,
          account_id: accountId,
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