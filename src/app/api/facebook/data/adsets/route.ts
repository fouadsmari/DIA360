import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Paramètres from et to requis' },
        { status: 400 }
      )
    }

    console.log(`Récupération données adsets: ${from} à ${to}`)

    // Utiliser la vue d'agrégation pour les données adsets
    const { data, error } = await supabaseAdmin
      .from('facebook_adset_summary')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date_start', from)
      .lte('date_stop', to)
      .order('total_spend', { ascending: false })

    if (error) {
      console.error('Erreur récupération données adsets:', error)
      throw error
    }

    // Grouper par adset_id et calculer les totaux
    const adsetsMap = new Map()
    
    data.forEach(row => {
      const key = row.adset_id
      if (!adsetsMap.has(key)) {
        adsetsMap.set(key, {
          adset_id: row.adset_id,
          adset_name: row.adset_name,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          account_id: row.account_id,
          total_spend: 0,
          total_impressions: 0,
          total_reach: 0,
          total_clicks: 0,
          avg_ctr: 0,
          avg_cpc: 0,
          avg_cpm: 0,
          ads_count: 0,
          days_count: 0,
          status: 'ACTIVE' // Mock status
        })
      }
      
      const adset = adsetsMap.get(key)
      adset.total_spend += row.total_spend || 0
      adset.total_impressions += row.total_impressions || 0
      adset.total_reach += row.total_reach || 0
      adset.total_clicks += row.total_clicks || 0
      adset.ads_count = Math.max(adset.ads_count, row.ads_count || 0)
      adset.days_count++
    })

    // Calculer les moyennes
    const adsets = Array.from(adsetsMap.values()).map(adset => ({
      ...adset,
      avg_ctr: adset.total_impressions > 0 ? (adset.total_clicks / adset.total_impressions) * 100 : 0,
      avg_cpc: adset.total_clicks > 0 ? adset.total_spend / adset.total_clicks : 0,
      avg_cpm: adset.total_impressions > 0 ? (adset.total_spend / adset.total_impressions) * 1000 : 0
    }))

    return NextResponse.json(adsets)

  } catch (error) {
    console.error('Erreur API données adsets Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données adsets' },
      { status: 500 }
    )
  }
}