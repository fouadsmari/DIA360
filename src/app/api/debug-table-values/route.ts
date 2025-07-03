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

    // 1. Vérifier données brutes dans facebook_ads_data
    const { data: rawData } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('*')
      .eq('compte_id', compteId)
      .order('created_at', { ascending: false })
      .limit(3)

    // 2. Vérifier API call direct avec transformation
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

    // 3. Diagnostiquer problèmes potentiels
    const diagnostics = []
    
    if (!rawData || rawData.length === 0) {
      diagnostics.push("❌ PROBLÈME: Aucune donnée dans facebook_ads_data")
    } else {
      diagnostics.push(`✅ Données trouvées: ${rawData.length} lignes`)
      
      // Vérifier types de données
      const firstRow = rawData[0]
      const typeChecks = {
        spend: typeof firstRow.spend,
        impressions: typeof firstRow.impressions,
        clicks: typeof firstRow.clicks,
        ctr: typeof firstRow.ctr,
        cpc: typeof firstRow.cpc
      }
      
      diagnostics.push(`📊 Types de données: ${JSON.stringify(typeChecks)}`)
      
      // Vérifier valeurs nulles/invalides
      const invalidValues = rawData.filter(row => 
        row.spend < 0 || 
        row.impressions < 0 || 
        row.clicks < 0 ||
        isNaN(row.spend) ||
        isNaN(row.impressions) ||
        isNaN(row.clicks)
      )
      
      if (invalidValues.length > 0) {
        diagnostics.push(`⚠️ PROBLÈME: ${invalidValues.length} lignes avec valeurs invalides`)
      } else {
        diagnostics.push("✅ Toutes les valeurs sont valides")
      }
      
      // Vérifier calculs CTR et CPC
      rawData.forEach((row, i) => {
        const calculatedCtr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0
        const calculatedCpc = row.clicks > 0 ? row.spend / row.clicks : 0
        
        if (Math.abs(calculatedCtr - row.ctr) > 0.01) {
          diagnostics.push(`⚠️ CTR INCORRECT ligne ${i}: DB=${row.ctr}, Calculé=${calculatedCtr.toFixed(2)}`)
        }
        
        if (Math.abs(calculatedCpc - row.cpc) > 0.01) {
          diagnostics.push(`⚠️ CPC INCORRECT ligne ${i}: DB=${row.cpc}, Calculé=${calculatedCpc.toFixed(2)}`)
        }
      })
    }

    // 4. Vérifier doublons simples
    const { data: duplicateCheck } = await supabaseAdmin
      .from('facebook_ads_data')
      .select('ad_id, date_start, date_stop, count(*)')
      .eq('compte_id', compteId)
      .limit(5)
    
    return NextResponse.json({
      debug: 'Facebook Table Values Analysis',
      rawData: rawData || [],
      apiTest: apiTestResult,
      diagnostics,
      duplicateCheck,
      summary: {
        totalRows: rawData?.length || 0,
        hasData: rawData && rawData.length > 0,
        apiWorking: apiTestResult?.status === 200,
        dataTypes: rawData?.[0] ? Object.keys(rawData[0]).map(key => `${key}: ${typeof rawData[0][key]}`).join(', ') : 'No data'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur debug table values:', error)
    return NextResponse.json({
      error: 'Erreur lors du debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}