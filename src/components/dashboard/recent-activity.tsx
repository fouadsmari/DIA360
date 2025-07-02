'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogIn, UserPlus, Lock, AlertTriangle } from 'lucide-react'

interface AuthLog {
  id: number
  user_id: number
  action: string
  success: boolean
  created_at: string
  ip_address: string
  details: string
  user: {
    nom: string
    prenom: string
    email: string
    poste: string
  }
}

export function RecentActivity() {
  const [activities, setActivities] = useState<AuthLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/dashboard/recent-activity')
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
        console.log('Activités récentes chargées:', data.length)
      }
    } catch (error) {
      console.error('Erreur chargement activités récentes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string, success: boolean) => {
    if (!success) return <AlertTriangle className="h-4 w-4 text-red-500" />
    
    switch (action) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-500" />
      case 'register':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'password_change':
        return <Lock className="h-4 w-4 text-purple-500" />
      default:
        return <LogIn className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionText = (action: string, success: boolean) => {
    if (!success) {
      switch (action) {
        case 'login': return 'Échec de connexion'
        case 'register': return 'Échec d\'inscription'
        default: return 'Action échouée'
      }
    }

    switch (action) {
      case 'login': return 'Connexion'
      case 'register': return 'Inscription'
      case 'password_change': return 'Changement de mot de passe'
      default: return 'Action inconnue'
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

  const getInitials = (nom: string, prenom: string) => {
    return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `il y a ${diffInMinutes} min`
    } else if (diffInHours < 24) {
      return `il y a ${diffInHours}h`
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Aucune activité récente</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getActionIcon(activity.action, activity.success)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(activity.user.nom, activity.user.prenom)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">
                  {activity.user.nom} {activity.user.prenom}
                </span>
                <Badge className={`${getRoleColor(activity.user.poste)} text-xs`}>
                  {activity.user.poste}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {getActionText(activity.action, activity.success)}
                {activity.success && activity.action === 'login' && (
                  <span className="ml-2 text-xs">
                    ({activity.ip_address})
                  </span>
                )}
              </p>
              
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}