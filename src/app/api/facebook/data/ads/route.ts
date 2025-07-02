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
    const limit = searchParams.get('limit') || '100'

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Paramètres from et to requis' },
        { status: 400 }
      )
    }

    console.log(`Récupération données ads: ${from} à ${to}`)

    // Récupérer les données détaillées au niveau ad
    const { data, error } = await supabaseAdmin
      .from('facebook_ads_data')
      .select(`
        ad_id,
        ad_name,
        adset_id,
        adset_name,
        campaign_id,
        campaign_name,
        account_id,
        date_start,
        date_stop,
        impressions,
        reach,
        clicks,
        spend,
        ctr,
        cpc,
        cpm,
        actions,
        age,
        gender,
        country,
        publisher_platform
      `)
      .eq('user_id', session.user.id)
      .gte('date_start', from)
      .lte('date_stop', to)
      .order('spend', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('Erreur récupération données ads:', error)
      throw error
    }

    // Grouper par ad_id et calculer les totaux
    const adsMap = new Map()
    
    data.forEach(row => {
      const key = row.ad_id
      if (!adsMap.has(key)) {
        adsMap.set(key, {
          ad_id: row.ad_id,
          ad_name: row.ad_name,
          adset_id: row.adset_id,
          adset_name: row.adset_name,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          account_id: row.account_id,
          impressions: 0,
          reach: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          status: 'ACTIVE', // Mock status
          ad_type: 'image', // Mock type
          demographics: {
            age: new Set(),
            gender: new Set(),
            country: new Set(),
            platform: new Set()
          },
          days_count: 0
        })
      }
      
      const ad = adsMap.get(key)
      ad.impressions += row.impressions || 0
      ad.reach += row.reach || 0
      ad.clicks += row.clicks || 0
      ad.spend += row.spend || 0
      ad.demographics.age.add(row.age)
      ad.demographics.gender.add(row.gender)
      ad.demographics.country.add(row.country)
      ad.demographics.platform.add(row.publisher_platform)
      ad.days_count++
    })

    // Calculer les métriques finales
    const ads = Array.from(adsMap.values()).map(ad => ({
      ...ad,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0,
      cpm: ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0,
      demographics: {
        age: Array.from(ad.demographics.age),
        gender: Array.from(ad.demographics.gender),
        country: Array.from(ad.demographics.country),
        platform: Array.from(ad.demographics.platform)
      }
    }))

    return NextResponse.json(ads)

  } catch (error) {
    console.error('Erreur API données ads Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données ads' },
      { status: 500 }
    )
  }
}