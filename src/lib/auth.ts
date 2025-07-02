import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.auth.loginFailedCredentials('', { reason: 'Missing credentials' })
          return null
        }

        try {
          logger.auth.loginAttempt(credentials.email)

          // Récupérer l'utilisateur de la base de données
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email.toLowerCase())
            .single()

          if (error || !user) {
            logger.auth.loginFailedCredentials(credentials.email, { reason: 'User not found' })
            return null
          }

          // Vérifier si l'utilisateur est actif
          if (!user.is_active) {
            logger.auth.loginFailedInactive(credentials.email)
            return null
          }

          // Vérifier le mot de passe
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash)
          
          if (!isPasswordValid) {
            logger.auth.loginFailedCredentials(credentials.email, { reason: 'Invalid password' })
            return null
          }

          // Mettre à jour la dernière connexion
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)

          logger.auth.loginSuccess({
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            poste: user.poste
          })

          return {
            id: user.id,
            email: user.email,
            name: `${user.prenom} ${user.nom}`,
            role: user.poste
          }
        } catch (error) {
          logger.auth.loginFailedDatabase(credentials.email, error as Error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token, trigger, newSession }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        
        // Si la session est mise à jour manuellement, utiliser les nouvelles données
        if (trigger === 'update' && newSession?.user) {
          session.user.name = newSession.user.name || session.user.name
          session.user.email = newSession.user.email || session.user.email
          console.log('Session mise à jour avec:', newSession.user)
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET
}