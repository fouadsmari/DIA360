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

    console.log(`Récupération données campaigns: ${from} à ${to}`)

    // Utiliser la vue d'agrégation pour les données campaigns
    const { data, error } = await supabaseAdmin
      .from('facebook_campaign_summary')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date_start', from)
      .lte('date_stop', to)
      .order('total_spend', { ascending: false })

    if (error) {
      console.error('Erreur récupération données campaigns:', error)
      throw error
    }

    // Grouper par campaign_id et calculer les totaux
    const campaignsMap = new Map()
    
    data.forEach(row => {
      const key = row.campaign_id
      if (!campaignsMap.has(key)) {
        campaignsMap.set(key, {
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
          adsets_count: 0,
          ads_count: 0,
          days_count: 0,
          status: 'ACTIVE' // Mock status
        })
      }
      
      const campaign = campaignsMap.get(key)
      campaign.total_spend += row.total_spend || 0
      campaign.total_impressions += row.total_impressions || 0
      campaign.total_reach += row.total_reach || 0
      campaign.total_clicks += row.total_clicks || 0
      campaign.adsets_count = Math.max(campaign.adsets_count, row.adsets_count || 0)
      campaign.ads_count = Math.max(campaign.ads_count, row.ads_count || 0)
      campaign.days_count++
    })

    // Calculer les moyennes
    const campaigns = Array.from(campaignsMap.values()).map(campaign => ({
      ...campaign,
      avg_ctr: campaign.total_impressions > 0 ? (campaign.total_clicks / campaign.total_impressions) * 100 : 0,
      avg_cpc: campaign.total_clicks > 0 ? campaign.total_spend / campaign.total_clicks : 0,
      avg_cpm: campaign.total_impressions > 0 ? (campaign.total_spend / campaign.total_impressions) * 1000 : 0
    }))

    return NextResponse.json(campaigns)

  } catch (error) {
    console.error('Erreur API données campaigns Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données campaigns' },
      { status: 500 }
    )
  }
}