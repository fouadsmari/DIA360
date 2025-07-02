import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total users
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Erreur total users:', totalError)
      throw totalError
    }

    // Active users
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) {
      console.error('Erreur active users:', activeError)
      throw activeError
    }

    // New users this month
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)

    const { count: newThisMonth, error: newError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString())

    if (newError) {
      console.error('Erreur new users:', newError)
      throw newError
    }

    // Super admins
    const { count: superAdmins, error: adminError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('poste', 'Superadmin')

    if (adminError) {
      console.error('Erreur super admins:', adminError)
      throw adminError
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newThisMonth: newThisMonth || 0,
      superAdmins: superAdmins || 0
    }

    console.log('Dashboard stats récupérées:', stats)
    return NextResponse.json(stats)

  } catch (error) {
    console.error('Erreur API dashboard stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 }
    )
  }
}