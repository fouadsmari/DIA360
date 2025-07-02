import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { accountId } = params
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Paramètres from et to requis' },
        { status: 400 }
      )
    }

    console.log(`Vérification statut sync account ${accountId}: ${dateFrom} à ${dateTo}`)

    // Récupérer le statut de synchronisation
    const { data: syncStatus, error: statusError } = await supabaseAdmin
      .from('facebook_sync_status')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('account_id', accountId)
      .eq('date_start', dateFrom)
      .eq('date_stop', dateTo)
      .single()

    if (statusError && statusError.code !== 'PGRST116') {
      console.error('Erreur récupération statut sync:', statusError)
      throw statusError
    }

    if (!syncStatus) {
      return NextResponse.json({
        status: 'idle',
        progress: 0,
        message: 'Aucune synchronisation en cours'
      })
    }

    // Si la sync est terminée, vérifier les données
    if (syncStatus.status === 'completed') {
      const { data: dataCount, error: countError } = await supabaseAdmin
        .from('facebook_ads_data')
        .select('id', { count: 'exact' })
        .eq('user_id', session.user.id)
        .gte('date_start', dateFrom)
        .lte('date_stop', dateTo)

      if (countError) {
        console.error('Erreur vérification données:', countError)
      }

      return NextResponse.json({
        status: syncStatus.status,
        progress: syncStatus.progress,
        totalDays: syncStatus.total_days,
        syncedDays: syncStatus.synced_days,
        dataRows: dataCount?.length || 0,
        startedAt: syncStatus.started_at,
        completedAt: syncStatus.completed_at,
        message: `Synchronisation terminée - ${dataCount?.length || 0} lignes de données`
      })
    }

    // Sync en cours ou failed
    return NextResponse.json({
      status: syncStatus.status,
      progress: syncStatus.progress,
      totalDays: syncStatus.total_days,
      syncedDays: syncStatus.synced_days,
      startedAt: syncStatus.started_at,
      errorMessage: syncStatus.error_message,
      message: syncStatus.status === 'syncing' 
        ? `Synchronisation en cours: ${syncStatus.synced_days}/${syncStatus.total_days} jours`
        : `Erreur: ${syncStatus.error_message}`
    })

  } catch (error) {
    console.error('Erreur API statut Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    )
  }
}