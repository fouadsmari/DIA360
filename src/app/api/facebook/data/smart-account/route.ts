import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// interface SmartAccountRequest {
//   compteId: number
//   facebookAccountId: string
//   dateFrom: string
//   dateTo: string
//   comparisonDateFrom?: string
//   comparisonDateTo?: string
// }

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
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const comparisonDateFrom = searchParams.get('comparisonFrom')
    const comparisonDateTo = searchParams.get('comparisonTo')

    if (!compteId || !facebookAccountId || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Paramètres requis: compteId, facebookAccountId, from, to' },
        { status: 400 }
      )
    }

    // Vérifier l'accès au compte
    const { data: compteAccess } = await supabaseAdmin
      .from('comptes')
      .select(`
        id,
        entreprise,
        id_facebook_ads,
        compte_users_clients!inner(user_id),
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
      const hasAccess = compteAccess.compte_users_clients.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id)) ||
                       compteAccess.compte_users_pub_gms.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id)) ||
                       compteAccess.compte_gestionnaires.some((rel: { user_id: number }) => rel.user_id === parseInt(session.user.id))
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Accès non autorisé à ce compte' },
          { status: 403 }
        )
      }
    }

    // Récupérer les données de la période principale
    const primaryData = await getAccountData(compteId, facebookAccountId, dateFrom, dateTo)

    // Récupérer les données de comparaison si demandées
    let comparisonData = null
    if (comparisonDateFrom && comparisonDateTo) {
      comparisonData = await getAccountData(compteId, facebookAccountId, comparisonDateFrom, comparisonDateTo)
    }

    // Calculer les métriques de comparaison
    const response = {
      compte: {
        id: compteAccess.id,
        name: compteAccess.entreprise,
        facebookAccountId: compteAccess.id_facebook_ads
      },
      primary: {
        period: { from: dateFrom, to: dateTo },
        data: primaryData,
        summary: calculateSummary(primaryData.daily_data || [])
      },
      comparison: comparisonData ? {
        period: { from: comparisonDateFrom, to: comparisonDateTo },
        data: comparisonData,
        summary: calculateSummary(comparisonData.daily_data || []),
        changes: calculateChanges(primaryData, comparisonData)
      } : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur API smart account Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    )
  }
}

async function getAccountData(compteId: number, facebookAccountId: string, dateFrom: string, dateTo: string) {
  // Récupérer toutes les données de la période
  const { data: rawData, error: dataError } = await supabaseAdmin
    .from('facebook_ads_data')
    .select('date_start, spend, impressions, reach, clicks')
    .eq('compte_id', compteId)
    .eq('account_id', facebookAccountId)
    .gte('date_start', dateFrom)
    .lte('date_start', dateTo)
    .order('date_start')

  if (dataError) {
    console.error('Erreur récupération données:', dataError)
    throw dataError
  }

  // Grouper les données par jour et calculer les agrégations
  const dailyMap = new Map<string, { spend: number; impressions: number; reach: number; clicks: number }>()
  
  rawData?.forEach(row => {
    const date = row.date_start
    const existing = dailyMap.get(date) || { spend: 0, impressions: 0, reach: 0, clicks: 0 }
    
    dailyMap.set(date, {
      spend: existing.spend + (row.spend || 0),
      impressions: existing.impressions + (row.impressions || 0),
      reach: existing.reach + (row.reach || 0),
      clicks: existing.clicks + (row.clicks || 0)
    })
  })

  // Convertir en array et calculer les métriques dérivées
  const processedDailyData = Array.from(dailyMap.entries()).map(([date, data]) => {
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
    const cpc = data.clicks > 0 ? data.spend / data.clicks : 0
    const cpm = data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0

    return {
      date,
      spend: data.spend,
      impressions: data.impressions,
      reach: data.reach,
      clicks: data.clicks,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      cpm: Math.round(cpm * 100) / 100
    }
  }).sort((a, b) => a.date.localeCompare(b.date))

  // Calculer les totaux
  const totals = processedDailyData.reduce(
    (acc, day) => ({
      total_spend: acc.total_spend + day.spend,
      total_impressions: acc.total_impressions + day.impressions,
      total_reach: acc.total_reach + day.reach,
      total_clicks: acc.total_clicks + day.clicks
    }),
    { total_spend: 0, total_impressions: 0, total_reach: 0, total_clicks: 0 }
  )

  // Calculer les moyennes
  const avg_ctr = totals.total_impressions > 0 
    ? (totals.total_clicks / totals.total_impressions) * 100 
    : 0
  const avg_cpc = totals.total_clicks > 0 
    ? totals.total_spend / totals.total_clicks 
    : 0
  const avg_cpm = totals.total_impressions > 0 
    ? (totals.total_spend / totals.total_impressions) * 1000 
    : 0

  return {
    ...totals,
    avg_ctr: Math.round(avg_ctr * 100) / 100,
    avg_cpc: Math.round(avg_cpc * 100) / 100,
    avg_cpm: Math.round(avg_cpm * 100) / 100,
    daily_data: processedDailyData,
    data_availability: {
      total_days: processedDailyData.length,
      has_data: processedDailyData.length > 0
    }
  }
}

function calculateSummary(dailyData: Array<{ spend: number; impressions: number; clicks: number; ctr: number }>) {
  if (!dailyData.length) {
    return {
      total_spend: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_ctr: 0,
      avg_cpc: 0,
      performance_trend: 'stable'
    }
  }

  const totals = dailyData.reduce(
    (acc, day) => ({
      spend: acc.spend + day.spend,
      impressions: acc.impressions + day.impressions,
      clicks: acc.clicks + day.clicks
    }),
    { spend: 0, impressions: 0, clicks: 0 }
  )

  // Analyser la tendance (comparer première moitié vs seconde moitié)
  const midPoint = Math.floor(dailyData.length / 2)
  const firstHalf = dailyData.slice(0, midPoint)
  const secondHalf = dailyData.slice(midPoint)

  const firstHalfCtr = firstHalf.reduce((acc, day) => acc + day.ctr, 0) / firstHalf.length
  const secondHalfCtr = secondHalf.reduce((acc, day) => acc + day.ctr, 0) / secondHalf.length

  let performanceTrend = 'stable'
  if (secondHalfCtr > firstHalfCtr * 1.1) performanceTrend = 'improving'
  else if (secondHalfCtr < firstHalfCtr * 0.9) performanceTrend = 'declining'

  return {
    total_spend: totals.spend,
    total_impressions: totals.impressions,
    total_clicks: totals.clicks,
    avg_ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avg_cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    performance_trend: performanceTrend
  }
}

function calculateChanges(primaryData: { total_spend: number; total_impressions: number; total_clicks: number; avg_ctr: number; avg_cpc: number }, comparisonData: { total_spend: number; total_impressions: number; total_clicks: number; avg_ctr: number; avg_cpc: number }) {
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  return {
    spend_change: calculatePercentChange(primaryData.total_spend, comparisonData.total_spend),
    impressions_change: calculatePercentChange(primaryData.total_impressions, comparisonData.total_impressions),
    clicks_change: calculatePercentChange(primaryData.total_clicks, comparisonData.total_clicks),
    ctr_change: calculatePercentChange(primaryData.avg_ctr, comparisonData.avg_ctr),
    cpc_change: calculatePercentChange(primaryData.avg_cpc, comparisonData.avg_cpc)
  }
}