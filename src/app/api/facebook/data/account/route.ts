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

    console.log(`Récupération données account: ${from} à ${to}`)

    // Utiliser la vue d'agrégation pour les données account
    const { data, error } = await supabaseAdmin
      .from('facebook_account_summary')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date_start', from)
      .lte('date_stop', to)
      .order('date_start', { ascending: true })

    if (error) {
      console.error('Erreur récupération données account:', error)
      throw error
    }

    // Calculer les totaux et moyennes
    const summary = {
      total_spend: data.reduce((acc, d) => acc + (d.total_spend || 0), 0),
      total_impressions: data.reduce((acc, d) => acc + (d.total_impressions || 0), 0),
      total_reach: data.reduce((acc, d) => acc + (d.total_reach || 0), 0),
      total_clicks: data.reduce((acc, d) => acc + (d.total_clicks || 0), 0),
      avg_ctr: data.length > 0 ? data.reduce((acc, d) => acc + (d.avg_ctr || 0), 0) / data.length : 0,
      avg_cpc: data.length > 0 ? data.reduce((acc, d) => acc + (d.avg_cpc || 0), 0) / data.length : 0,
      avg_cpm: data.length > 0 ? data.reduce((acc, d) => acc + (d.avg_cpm || 0), 0) / data.length : 0,
      campaigns_count: Math.max(...data.map(d => d.campaigns_count || 0), 0),
      adsets_count: Math.max(...data.map(d => d.adsets_count || 0), 0),
      ads_count: Math.max(...data.map(d => d.ads_count || 0), 0),
      daily_data: data.map(d => ({
        date: d.date_start,
        spend: d.total_spend || 0,
        impressions: d.total_impressions || 0,
        reach: d.total_reach || 0,
        clicks: d.total_clicks || 0,
        ctr: d.avg_ctr || 0,
        cpc: d.avg_cpc || 0,
        cpm: d.avg_cpm || 0
      }))
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Erreur API données account Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données account' },
      { status: 500 }
    )
  }
}