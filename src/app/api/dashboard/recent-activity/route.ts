import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: activities, error } = await supabase
      .from('auth_logs')
      .select(`
        *,
        user:users!inner(nom, prenom, email, poste)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erreur récupération activités récentes:', error)
      throw error
    }

    console.log(`${activities?.length || 0} activités récentes récupérées`)
    return NextResponse.json(activities || [])

  } catch (error) {
    console.error('Erreur API recent activity:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des activités récentes' },
      { status: 500 }
    )
  }
}