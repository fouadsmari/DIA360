import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, email } = await request.json()

    console.log('Tentative changement mot de passe pour:', email)

    // Vérifier l'utilisateur actuel
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (fetchError || !user) {
      console.error('Utilisateur non trouvé:', fetchError)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    
    if (!isCurrentPasswordValid) {
      console.log('Mot de passe actuel incorrect pour:', email)
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      )
    }

    // Hash du nouveau mot de passe
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Mettre à jour le mot de passe
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erreur mise à jour mot de passe:', updateError)
      throw updateError
    }

    // Log de l'activité
    await supabase
      .from('auth_logs')
      .insert({
        user_id: user.id,
        action: 'password_change',
        ip_address: request.ip || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        success: true,
        details: 'Mot de passe modifié avec succès'
      })

    console.log('Mot de passe changé avec succès pour:', email)
    return NextResponse.json({ message: 'Mot de passe modifié avec succès' })

  } catch (error) {
    console.error('Erreur API change password:', error)
    return NextResponse.json(
      { error: 'Erreur lors du changement de mot de passe' },
      { status: 500 }
    )
  }
}