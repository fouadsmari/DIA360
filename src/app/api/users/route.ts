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
    const body = await request.json()
    const { nom, prenom, email, password, poste } = body
    
    console.log('Création utilisateur:', email, 'Poste:', poste)

    // Validation des champs requis
    if (!nom || !prenom || !email || !password || !poste) {
      return NextResponse.json(
        { error: 'Tous les champs sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier que l'email n'existe pas déjà
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erreur vérification email:', checkError)
      throw checkError
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hash du mot de passe
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Créer l'utilisateur
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
      console.error('Erreur création utilisateur DB:', error)
      throw error
    }

    console.log('✓ Utilisateur créé:', newUser.email)
    return NextResponse.json(newUser)

  } catch (error) {
    console.error('Erreur API POST users:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    )
  }
}