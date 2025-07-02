import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface UserData {
  id: number
  nom: string
  prenom: string
  email: string
  poste: string
  is_active: boolean
  created_at: string
}

export function useUserData() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshUserData = async () => {
    if (!session?.user?.email) return

    setLoading(true)
    try {
      const response = await fetch(`/api/users/by-email/${encodeURIComponent(session.user.email)}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
        console.log('Données utilisateur rafraîchies:', data)
      }
    } catch (error) {
      console.error('Erreur refresh user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.email) {
      refreshUserData()
    }
  }, [session?.user?.email])

  return { userData, loading, refreshUserData }
}