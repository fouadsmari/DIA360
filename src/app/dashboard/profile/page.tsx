'use client'

import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'
import { useUserData } from '@/hooks/useUserData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Lock, CheckCircle, AlertCircle, Edit2 } from 'lucide-react'
import { useEffect } from 'react'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const { userData, refreshUserData } = useUserData()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Editable fields for Superadmin
  const [isEditing, setIsEditing] = useState(false)
  const [editableData, setEditableData] = useState({
    nom: '',
    prenom: '',
    email: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)

  const user = session?.user
  const isSuperAdmin = user?.role === 'Superadmin'
  
  // Utiliser userData (fraîches) au lieu de session
  const displayData = userData || {
    nom: user?.name?.split(' ')[0] || '',
    prenom: user?.name?.split(' ')[1] || '',
    email: user?.email || ''
  }
  
  useEffect(() => {
    if (userData) {
      setEditableData({
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email
      })
    } else if (user) {
      const nameParts = user.name?.split(' ') || ['', '']
      setEditableData({
        nom: nameParts[0] || '',
        prenom: nameParts[1] || '',
        email: user.email || ''
      })
    }
  }, [userData, user])

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

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.length >= 2 
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }

  const getPasswordStrength = (password: string) => {
    let score = 0
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    Object.values(requirements).forEach(req => {
      if (req) score++
    })

    return { score, requirements }
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const isPasswordValid = passwordStrength.score >= 4 && newPassword.length >= 8
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Tous les champs sont obligatoires' })
      return
    }

    if (!isPasswordValid) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe ne respecte pas les critères de sécurité' })
      return
    }

    if (!passwordsMatch) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' })
      return
    }

    console.log('Tentative de changement de mot de passe pour:', user?.email)
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          email: user?.email
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Mot de passe changé avec succès')
        setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        console.error('Erreur changement mot de passe:', data.error)
        setMessage({ type: 'error', text: data.error || 'Erreur lors du changement de mot de passe' })
      }
    } catch (error) {
      console.error('Erreur réseau changement mot de passe:', error)
      setMessage({ type: 'error', text: 'Erreur de connexion' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editableData.nom || !editableData.prenom || !editableData.email) {
      setMessage({ type: 'error', text: 'Tous les champs sont obligatoires' })
      return
    }

    console.log('Mise à jour profil Superadmin:', editableData)
    setProfileLoading(true)

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableData)
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Profil mis à jour avec succès')
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès' })
        setIsEditing(false)
        
        // Mettre à jour la session avec les nouvelles données
        await update({
          ...session,
          user: {
            ...session?.user,
            name: `${editableData.nom} ${editableData.prenom}`,
            email: editableData.email
          }
        })
        
        // Rafraîchir les données utilisateur
        await refreshUserData()
        
        console.log('Session et données utilisateur mises à jour')
      } else {
        console.error('Erreur mise à jour profil:', data.error)
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour' })
      }
    } catch (error) {
      console.error('Erreur réseau mise à jour profil:', error)
      setMessage({ type: 'error', text: 'Erreur de connexion' })
    } finally {
      setProfileLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Chargement du profil...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Consultez et modifiez vos informations personnelles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informations personnelles
              </div>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {isEditing ? 'Annuler' : 'Modifier'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials(`${displayData.nom} ${displayData.prenom}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{displayData.nom} {displayData.prenom}</h3>
                <Badge className={getRoleColor(user?.role || '')}>
                  {user?.role}
                </Badge>
              </div>
            </div>

            {isEditing && isSuperAdmin ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-nom">Nom</Label>
                  <Input
                    id="edit-nom"
                    value={editableData.nom}
                    onChange={(e) => setEditableData({...editableData, nom: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-prenom">Prénom</Label>
                  <Input
                    id="edit-prenom"
                    value={editableData.prenom}
                    onChange={(e) => setEditableData({...editableData, prenom: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editableData.email}
                    onChange={(e) => setEditableData({...editableData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="poste">Poste</Label>
                  <div className="mt-2">
                    <Badge className={getRoleColor(user.role || '')}>
                      {user.role} (non modifiable)
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={displayData.nom}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={displayData.prenom}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={displayData.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="poste">Poste</Label>
                  <div className="mt-2">
                    <Badge className={getRoleColor(user.role || '')}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Modifier mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.score <= 2 ? 'bg-red-500' :
                            passwordStrength.score <= 3 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {passwordStrength.score <= 2 ? 'Faible' :
                         passwordStrength.score <= 3 ? 'Moyen' : 'Fort'}
                      </span>
                    </div>
                    
                    <div className="text-xs space-y-1">
                      <div className={`flex items-center space-x-1 ${passwordStrength.requirements.length ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.requirements.length ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>Au moins 8 caractères</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>Une majuscule</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>Une minuscule</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${passwordStrength.requirements.number ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.requirements.number ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>Un chiffre</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${passwordStrength.requirements.special ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.requirements.special ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>Un caractère spécial</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirmer nouveau mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && (
                  <div className={`mt-1 text-xs flex items-center space-x-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    <span>{passwordsMatch ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}</span>
                  </div>
                )}
              </div>

              {message && (
                <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                  <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                >
                  {loading ? 'Modification...' : 'Modifier le mot de passe'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}