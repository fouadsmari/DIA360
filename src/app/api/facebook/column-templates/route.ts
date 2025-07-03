import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ColumnTemplate {
  id?: number
  user_id: string
  template_name: string
  is_default: boolean
  is_shared: boolean
  description?: string
  visible_columns: string[]
  column_order: string[]
  column_widths?: Record<string, number>
  usage_count?: number
  created_at?: string
  updated_at?: string
}

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
    const includeShared = searchParams.get('includeShared') === 'true'

    // Récupérer modèles utilisateur + modèles partagés
    let query = supabaseAdmin
      .from('facebook_column_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('template_name')

    if (includeShared) {
      query = query.or(`user_id.eq.${session.user.id},is_shared.eq.true`)
    } else {
      query = query.eq('user_id', session.user.id)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Erreur récupération modèles colonnes:', error)
      throw error
    }

    return NextResponse.json({
      data: templates || [],
      count: templates?.length || 0
    })

  } catch (error) {
    console.error('Erreur API modèles colonnes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modèles' },
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

    const body: Omit<ColumnTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'> = await request.json()

    // Validation
    if (!body.template_name || !Array.isArray(body.visible_columns) || !Array.isArray(body.column_order)) {
      return NextResponse.json(
        { error: 'Données manquantes: template_name, visible_columns, column_order requis' },
        { status: 400 }
      )
    }

    // Si c'est le nouveau modèle par défaut, désactiver l'ancien
    if (body.is_default) {
      await supabaseAdmin
        .from('facebook_column_templates')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
        .eq('is_default', true)
    }

    // Créer le nouveau modèle
    const { data: newTemplate, error } = await supabaseAdmin
      .from('facebook_column_templates')
      .insert([{
        user_id: session.user.id,
        template_name: body.template_name,
        is_default: body.is_default,
        is_shared: body.is_shared,
        description: body.description,
        visible_columns: JSON.stringify(body.visible_columns),
        column_order: JSON.stringify(body.column_order),
        column_widths: JSON.stringify(body.column_widths || {}),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Erreur création modèle:', error)
      throw error
    }

    return NextResponse.json({
      message: 'Modèle créé avec succès',
      data: newTemplate
    })

  } catch (error) {
    console.error('Erreur création modèle colonnes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du modèle' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body: ColumnTemplate = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID du modèle requis' },
        { status: 400 }
      )
    }

    // Si c'est le nouveau modèle par défaut, désactiver l'ancien
    if (body.is_default) {
      await supabaseAdmin
        .from('facebook_column_templates')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
        .eq('is_default', true)
        .neq('id', body.id)
    }

    // Mettre à jour le modèle
    const { data: updatedTemplate, error } = await supabaseAdmin
      .from('facebook_column_templates')
      .update({
        template_name: body.template_name,
        is_default: body.is_default,
        is_shared: body.is_shared,
        description: body.description,
        visible_columns: JSON.stringify(body.visible_columns),
        column_order: JSON.stringify(body.column_order),
        column_widths: JSON.stringify(body.column_widths || {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .eq('user_id', session.user.id) // Sécurité: seul le propriétaire peut modifier
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour modèle:', error)
      throw error
    }

    return NextResponse.json({
      message: 'Modèle mis à jour avec succès',
      data: updatedTemplate
    })

  } catch (error) {
    console.error('Erreur mise à jour modèle colonnes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du modèle' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: 'ID du modèle requis' },
        { status: 400 }
      )
    }

    // Supprimer le modèle
    const { error } = await supabaseAdmin
      .from('facebook_column_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', session.user.id) // Sécurité: seul le propriétaire peut supprimer

    if (error) {
      console.error('Erreur suppression modèle:', error)
      throw error
    }

    return NextResponse.json({
      message: 'Modèle supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur suppression modèle colonnes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du modèle' },
      { status: 500 }
    )
  }
}