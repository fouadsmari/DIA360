import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'Superadmin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const compteId = parseInt(searchParams.get('compteId') || '1')

    // 1. Vérifier données dans facebook_ads_data
    const { data: adsData, error: adsError } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('*')
      .eq('compte_id', compteId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 2. Vérifier logs API récents
    const { data: logsData, error: logsError } = await supabaseAdmin
      .from('facebook_api_logs')
      .select('*')
      .eq('compte_id', compteId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 3. Vérifier si appel direct à l'API retourne des données
    let apiTestResult = null
    try {
      const apiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/facebook/data/ads?compteId=${compteId}&facebookAccountId=1934832220246764&from=2025-07-01&to=2025-07-01`)
      apiTestResult = {
        status: apiResponse.status,
        data: await apiResponse.json()
      }
    } catch (apiError) {
      apiTestResult = { error: 'Erreur appel API' }
    }

    return NextResponse.json({
      debug: 'Facebook Data Sources Analysis',
      database: {
        adsCount: adsData?.length || 0,
        adsData: adsData || [],
        error: adsError
      },
      logs: {
        logsCount: logsData?.length || 0,
        recentLogs: logsData || [],
        error: logsError
      },
      apiTest: apiTestResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur debug Facebook:', error)
    return NextResponse.json({
      error: 'Erreur lors du debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}