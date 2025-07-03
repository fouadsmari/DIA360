import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔍 API Logs Facebook - Session:', { 
      user: session?.user?.id, 
      role: session?.user?.role 
    })
    
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      console.log('❌ API Logs Facebook - Non autorisé')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const endpoint = searchParams.get('endpoint')
    const success = searchParams.get('success')
    const account_id = searchParams.get('account_id')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    const offset = (page - 1) * limit

    // Construire la requête avec filtres
    let query = supabaseAdmin
      .from('facebook_api_logs')
      .select(`
        id,
        endpoint,
        method,
        request_url,
        request_params,
        response_status,
        response_body,
        response_time_ms,
        success,
        error_message,
        error_code,
        level,
        date_range_from,
        date_range_to,
        account_id,
        compte_id,
        created_at
      `, { count: 'exact' })

    // MAITRE: Filtrer par utilisateur si pas Superadmin/Direction
    if (!['Superadmin', 'Direction'].includes(session.user.role)) {
      query = query.eq('user_id', session.user.id)
    }

    // Appliquer les filtres
    if (endpoint) {
      query = query.ilike('endpoint', `%${endpoint}%`)
    }
    if (success !== null && success !== undefined) {
      query = query.eq('success', success === 'true')
    }
    if (account_id) {
      query = query.eq('account_id', account_id)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59')
    }

    console.log('🔍 API Logs Facebook - Paramètres requête:', {
      page, limit, offset, 
      filters: { endpoint, success, account_id, dateFrom, dateTo },
      userRole: session.user.role
    })
    
    // Pagination et tri
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    console.log('🔍 API Logs Facebook - Résultat requête:', {
      error: error,
      count: count,
      logsLength: logs?.length || 0
    })

    if (error) {
      console.error('❌ Erreur récupération logs Facebook:', error)
      throw error
    }

    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      data: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev
      }
    })

  } catch (error) {
    console.error('Erreur API logs Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé - Seuls Superadmin et Direction peuvent supprimer les logs' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const days = parseInt(searchParams.get('days') || '0')

    if (action === 'cleanup') {
      // Nettoyer les logs expirés
      const { data, error } = await supabaseAdmin.rpc('cleanup_expired_facebook_logs')
      
      if (error) {
        throw error
      }

      return NextResponse.json({
        message: `${data || 0} logs expirés supprimés`,
        deleted_count: data || 0
      })
    }

    if (action === 'purge' && days > 0) {
      // Supprimer les logs plus anciens que X jours
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      let deleteQuery = supabaseAdmin
        .from('facebook_api_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      // Si pas Superadmin, filtrer par utilisateur
      if (session.user.role !== 'Superadmin') {
        deleteQuery = deleteQuery.eq('user_id', session.user.id)
      }

      const { error, count } = await deleteQuery

      if (error) {
        throw error
      }

      return NextResponse.json({
        message: `${count || 0} logs supprimés (plus anciens que ${days} jours)`,
        deleted_count: count || 0
      })
    }

    return NextResponse.json(
      { error: 'Action non valide' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Erreur suppression logs Facebook:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { retention_days } = body

    if (!retention_days || retention_days < 1 || retention_days > 90) {
      return NextResponse.json(
        { error: 'retention_days doit être entre 1 et 90 jours' },
        { status: 400 }
      )
    }

    // Mettre à jour la configuration de rétention
    const { error } = await supabaseAdmin.rpc('update_facebook_logs_retention', {
      p_user_id: session.user.id,
      p_retention_days: retention_days
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: `Configuration de rétention mise à jour: ${retention_days} jours`,
      retention_days
    })

  } catch (error) {
    console.error('Erreur mise à jour configuration logs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la configuration' },
      { status: 500 }
    )
  }
}