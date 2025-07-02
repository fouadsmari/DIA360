import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'Superadmin') {
      console.log('Accès refusé: utilisateur non Superadmin')
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const { nom, prenom, email } = await request.json()

    console.log('Mise à jour profil Superadmin:', { nom, prenom, email })

    // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .neq('id', session.user.id)
      .single()

    if (existingUser) {
      console.log('Email déjà utilisé par un autre utilisateur')
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un autre utilisateur' },
        { status: 400 }
      )
    }

    // Mettre à jour les informations
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        nom,
        prenom,
        email: email.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour profil:', error)
      throw error
    }

    console.log('Profil Superadmin mis à jour avec succès:', data)
    return NextResponse.json({ message: 'Profil mis à jour avec succès', user: data })

  } catch (error) {
    console.error('Erreur API update profile:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    )
  }
}