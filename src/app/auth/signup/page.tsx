'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { RegisterSchema, type RegisterInput } from '@/lib/validations'
import { logger } from '@/lib/logger'

const POSTES = [
  { value: 'Superadmin', label: 'Superadmin' },
  { value: 'Direction', label: 'Direction' },
  { value: 'Responsable', label: 'Responsable' },
  { value: 'PUP', label: 'PUP' },
  { value: 'GMS', label: 'GMS' },
  { value: 'Client', label: 'Client' }
] as const

export default function SignUpPage() {
  const [formData, setFormData] = useState<RegisterInput>({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    poste: 'PUP'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Supprimer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, poste: value as RegisterInput['poste'] }))
    if (errors.poste) {
      setErrors(prev => ({ ...prev, poste: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneralError('')
    setErrors({})

    // Validation côté client
    const validation = RegisterSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0].toString()] = error.message
        }
      })
      setErrors(fieldErrors)
      setLoading(false)
      logger.register.failedValidation(formData.email, fieldErrors)
      return
    }

    try {
      logger.register.attempt(formData.email)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.message })
        } else {
          setGeneralError(data.message || 'Erreur lors de l\'inscription')
        }
        logger.register.failedValidation(formData.email, data)
        return
      }

      logger.register.success({
        id: data.user.id,
        nom: data.user.nom,
        prenom: data.user.prenom,
        email: data.user.email,
        poste: data.user.poste
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin?message=inscription-reussie')
      }, 2000)

    } catch (error) {
      setGeneralError('Une erreur est survenue lors de l\'inscription')
      logger.register.failedDatabase(formData.email, error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-green-600 text-6xl">✓</div>
              <h2 className="text-2xl font-bold">Inscription réussie !</h2>
              <p className="text-gray-600">
                Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">DIA360</CardTitle>
          <CardDescription>
            Créez votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  name="prenom"
                  type="text"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Prénom"
                  required
                  autoComplete="given-name"
                />
                {errors.prenom && (
                  <p className="text-sm text-red-600">{errors.prenom}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  name="nom"
                  type="text"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Nom"
                  required
                  autoComplete="family-name"
                />
                {errors.nom && (
                  <p className="text-sm text-red-600">{errors.nom}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="poste">Poste</Label>
              <Select value={formData.poste} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre poste" />
                </SelectTrigger>
                <SelectContent>
                  {POSTES.map((poste) => (
                    <SelectItem key={poste.value} value={poste.value}>
                      {poste.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.poste && (
                <p className="text-sm text-red-600">{errors.poste}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500">
                Min. 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer le compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}