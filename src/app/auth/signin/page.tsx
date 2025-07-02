'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { LoginSchema, type LoginInput } from '@/lib/validations'
import { logger } from '@/lib/logger'

export default function SignInPage() {
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Supprimer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneralError('')
    setErrors({})

    // Validation côté client
    const validation = LoginSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0].toString()] = error.message
        }
      })
      setErrors(fieldErrors)
      setLoading(false)
      logger.api.validation('POST', '/auth/signin', fieldErrors)
      return
    }

    try {
      logger.auth.loginAttempt(formData.email)

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setGeneralError('Email ou mot de passe incorrect')
        logger.auth.loginFailedCredentials(formData.email, { reason: result.error })
      } else if (result?.ok) {
        // Récupérer la session pour confirmer la connexion
        const session = await getSession()
        if (session) {
          logger.auth.loginSuccess({
            id: session.user.id,
            nom: '',
            prenom: '',
            email: session.user.email || '',
            poste: session.user.role
          })
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setGeneralError('Une erreur est survenue lors de la connexion')
      logger.auth.loginFailedDatabase(formData.email, error as Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">DIA360</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

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
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-blue-600 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
            <div className="text-sm text-gray-600">
              Pas de compte ?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                S&apos;inscrire
              </Link>
            </div>
          </div>

        </CardContent>
      </Card>
    </main>
  )
}