'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Activity, TrendingUp, Shield } from 'lucide-react'

export default function DashboardPage() {
  const { data: session } = useSession()

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

  const stats = [
    {
      title: 'Utilisateurs Actifs',
      value: '1,234',
      icon: Users,
      change: '+12%',
      color: 'text-blue-600'
    },
    {
      title: 'Sessions Aujourd\'hui',
      value: '89',
      icon: Activity,
      change: '+23%',
      color: 'text-green-600'
    },
    {
      title: 'Croissance Mensuelle',
      value: '15.3%',
      icon: TrendingUp,
      change: '+4.2%',
      color: 'text-purple-600'
    },
    {
      title: 'Sécurité',
      value: '99.9%',
      icon: Shield,
      change: '+0.1%',
      color: 'text-emerald-600'
    }
  ]

  const recentActivities = [
    { user: 'Marie Dubois', action: 'Connexion', time: 'Il y a 5 min', type: 'login' },
    { user: 'Jean Martin', action: 'Rapport généré', time: 'Il y a 12 min', type: 'report' },
    { user: 'Sophie Bernard', action: 'Paramètres modifiés', time: 'Il y a 23 min', type: 'settings' },
    { user: 'Pierre Leroy', action: 'Nouveau utilisateur', time: 'Il y a 1h', type: 'user' },
    { user: 'Lisa Chen', action: 'Analyse complétée', time: 'Il y a 2h', type: 'analysis' }
  ]

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-100 text-green-800'
      case 'report': return 'bg-blue-100 text-blue-800'
      case 'settings': return 'bg-yellow-100 text-yellow-800'
      case 'user': return 'bg-purple-100 text-purple-800'
      case 'analysis': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Bonjour, {session?.user.name?.split(' ')[0] || 'Utilisateur'} 👋
          </h2>
          <Badge className={getRoleColor(session?.user.role || '')}>
            {session?.user.role}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {getWelcomeMessage(session?.user.role || '')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> par rapport au mois dernier
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
            <CardDescription>
              Accédez rapidement aux fonctionnalités principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {session?.user.role === 'Superadmin' && (
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Gérer les utilisateurs</span>
                </div>
                <span className="text-sm text-muted-foreground">→</span>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-green-600" />
                <span className="font-medium">Voir les analytics</span>
              </div>
              <span className="text-sm text-muted-foreground">→</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Générer un rapport</span>
              </div>
              <span className="text-sm text-muted-foreground">→</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>
              Dernières actions sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className={getActivityColor(activity.type)}>
                    {activity.action}
                  </Badge>
                  <span className="text-sm font-medium">{activity.user}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>État du Système</CardTitle>
          <CardDescription>
            Statut des services de la plateforme DIA360
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Base de données</span>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Opérationnel
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">API</span>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Opérationnel
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Authentification</span>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Opérationnel
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}