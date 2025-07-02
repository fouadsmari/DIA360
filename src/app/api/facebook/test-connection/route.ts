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
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId requis' },
        { status: 400 }
      )
    }

    // Récupérer les clés API Facebook
    const { data: facebookApi, error: apiError } = await supabaseAdmin
      .from('facebook_ads_apis')
      .select('access_token, app_id, account_id')
      .eq('created_by', session.user.id)
      .eq('is_active', true)
      .single()

    if (apiError || !facebookApi?.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Clés API Facebook non configurées',
        details: 'Veuillez configurer vos clés API Facebook dans les paramètres',
        api_configured: false
      })
    }

    // Test de connexion simple - vérifier le token
    try {
      const testUrl = `https://graph.facebook.com/v22.0/me?access_token=${facebookApi.access_token}`
      const testResponse = await fetch(testUrl)
      const testData = await testResponse.json()

      if (!testResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Token Facebook invalide',
          facebook_error: testData,
          api_configured: true,
          token_valid: false
        })
      }

      // Test d'accès au compte publicitaire
      const accountUrl = `https://graph.facebook.com/v22.0/act_${accountId}?fields=id,name,account_status,currency&access_token=${facebookApi.access_token}`
      const accountResponse = await fetch(accountUrl)
      const accountData = await accountResponse.json()

      if (!accountResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Accès au compte publicitaire refusé',
          facebook_error: accountData,
          api_configured: true,
          token_valid: true,
          account_accessible: false
        })
      }

      // Test d'accès aux publicités
      const adsUrl = `https://graph.facebook.com/v22.0/act_${accountId}/ads?fields=id,name&limit=1&access_token=${facebookApi.access_token}`
      const adsResponse = await fetch(adsUrl)
      const adsData = await adsResponse.json()

      return NextResponse.json({
        success: true,
        message: 'Connexion Facebook API réussie',
        api_configured: true,
        token_valid: true,
        account_accessible: true,
        account_info: accountData,
        ads_accessible: adsResponse.ok,
        ads_count: adsData?.data?.length || 0,
        ads_error: adsResponse.ok ? null : adsData,
        facebook_user: testData,
        test_timestamp: new Date().toISOString()
      })

    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Erreur de connexion à Facebook',
        details: fetchError instanceof Error ? fetchError.message : 'Erreur réseau',
        api_configured: true,
        network_error: true
      })
    }

  } catch (error) {
    console.error('Erreur test connexion Facebook:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors du test de connexion',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}