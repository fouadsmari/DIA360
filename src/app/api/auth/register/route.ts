import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { RegisterSchema } from '@/lib/validations'
import { logger, getRequestContext } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const context = getRequestContext(request)

  try {
    const body = await request.json()
    logger.api.request('POST', '/api/auth/register', context)

    // Validation des données
    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
      const errors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0].toString()] = error.message
        }
      })
      
      logger.api.validation('POST', '/api/auth/register', errors, context)
      return NextResponse.json(
        { message: 'Données invalides', errors },
        { status: 400 }
      )
    }

    const { nom, prenom, email, password, poste } = validation.data

    logger.register.attempt(email, context)

    // Vérifier si l'email existe déjà
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      logger.register.failedEmailExists(email, context)
      return NextResponse.json(
        { message: 'Un compte avec cet email existe déjà', field: 'email' },
        { status: 409 }
      )
    }

    if (checkError && checkError.code !== 'PGRST116') {
      logger.register.failedDatabase(email, checkError as Error, context)
      return NextResponse.json(
        { message: 'Erreur lors de la vérification de l\'email' },
        { status: 500 }
      )
    }

    // Hasher le mot de passe
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Créer l'utilisateur
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        nom,
        prenom,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        poste,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      logger.register.failedDatabase(email, createError as Error, context)
      return NextResponse.json(
        { message: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    logger.register.success({
      id: newUser.id,
      nom: newUser.nom,
      prenom: newUser.prenom,
      email: newUser.email,
      poste: newUser.poste
    }, context)

    const duration = Date.now() - startTime
    logger.api.success('POST', '/api/auth/register', duration, context)

    // Retourner les données de l'utilisateur (sans le mot de passe)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = newUser
    return NextResponse.json({
      message: 'Compte créé avec succès',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.api.error('POST', '/api/auth/register', error as Error, duration, context)
    
    return NextResponse.json(
      { message: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}