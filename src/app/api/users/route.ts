import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération utilisateurs:', error)
      throw error
    }

    console.log(`${users?.length || 0} utilisateurs récupérés`)
    return NextResponse.json(users || [])

  } catch (error) {
    console.error('Erreur API users:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des utilisateurs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== API POST /users - DÉBUT ===')
    
    const body = await request.json()
    const { nom, prenom, email, password, poste } = body
    
    console.log('Body reçu:', body)
    console.log('Données extraites:', { nom, prenom, email, poste, passwordLength: password?.length })

    // Validation des champs requis
    if (!nom || !prenom || !email || !password || !poste) {
      console.error('Champs manquants détectés')
      return NextResponse.json(
        { error: 'Tous les champs sont obligatoires' },
        { status: 400 }
      )
    }

    console.log('✓ Validation des champs réussie')

    // Vérifier que l'email n'existe pas déjà
    console.log('Vérification email existant...')
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification email:', checkError)
      throw checkError
    }

    if (existingUser) {
      console.log('❌ Email déjà utilisé:', email)
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    console.log('✓ Email disponible')

    // Hash du mot de passe
    console.log('Hashage du mot de passe...')
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)
    console.log('✓ Mot de passe hashé')

    // Créer l'utilisateur
    console.log('Insertion en base de données...')
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        nom,
        prenom,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        poste,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erreur insertion Supabase:', error)
      throw error
    }

    console.log('✓ Utilisateur créé avec succès:', newUser.email)
    console.log('Nouvel utilisateur ID:', newUser.id)
    console.log('=== API POST /users - SUCCÈS ===')
    
    return NextResponse.json(newUser)

  } catch (error) {
    console.error('❌ ERREUR API POST users:', error)
    console.log('=== API POST /users - ERREUR ===')
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    )
  }
}