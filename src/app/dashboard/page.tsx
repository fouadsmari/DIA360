'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, UserPlus, Shield } from 'lucide-react'
import { RecentActivity } from '@/components/dashboard/recent-activity'

interface UserStats {
  totalUsers: number
  activeUsers: number
  newThisMonth: number
  superAdmins: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newThisMonth: 0,
    superAdmins: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Superadmin': return 'bg-red-100 text-red-800'
      case 'Direction': return 'bg-purple-100 text-purple-800'
      case 'Responsable': return 'bg-blue-100 text-blue-800'
      case 'PUP': return 'bg-green-100 text-green-800'
      case 'GMS': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWelcomeMessage = (role: string) => {
    switch (role) {
      case 'Superadmin': 
        return 'Vous avez accès à toutes les fonctionnalités de la plateforme.'
      case 'Direction': 
        return 'Accédez aux analytics et rapports stratégiques.'
      case 'Responsable': 
        return 'Consultez les données de votre secteur.'
      case 'PUP': 
        return 'Visualisez vos métriques et rapports.'
      case 'GMS': 
        return 'Accédez à votre tableau de bord personnalisé.'
      default: 
        return 'Bienvenue sur DIA360.'
    }
  }

  const metricsCards = [
    {
      title: 'Total Utilisateurs',
      value: loading ? '...' : stats.totalUsers.toString(),
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Utilisateurs Actifs',
      value: loading ? '...' : stats.activeUsers.toString(),
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Nouveaux ce mois',
      value: loading ? '...' : stats.newThisMonth.toString(),
      icon: UserPlus,
      color: 'text-purple-600'
    },
    {
      title: 'Admins',
      value: loading ? '...' : stats.superAdmins.toString(),
      icon: Shield,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <Badge className={getRoleColor(session?.user.role || '')}>
            {session?.user.role}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Bienvenue, {session?.user.name?.split(' ')[0] || 'Utilisateur'}
        </p>
        <p className="text-sm text-muted-foreground">
          {getWelcomeMessage(session?.user.role || '')}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsCards.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  Données depuis la base de données
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivity />
        </CardContent>
      </Card>
    </div>
  )
}