import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('Début de la migration pour les tables comptes...')
    
    const results = []

    // Étape 1: Vérifier et créer la table comptes
    try {
      const { error } = await supabaseAdmin
        .from('comptes')
        .select('id')
        .limit(1)
      
      if (error && error.code === '42P01') {
        // Table n'existe pas, mais on ne peut pas la créer via l'API standard
        results.push({
          step: 'check_comptes_table',
          status: 'table_missing',
          message: 'Table comptes n\'existe pas - création manuelle requise'
        })
      } else {
        results.push({
          step: 'check_comptes_table',
          status: 'exists',
          message: 'Table comptes existe déjà'
        })
      }
    } catch (e) {
      results.push({
        step: 'check_comptes_table',
        status: 'error',
        message: 'Erreur lors de la vérification'
      })
    }

    // Étape 2: Vérifier la table users et sa structure
    try {
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, email, poste')
        .limit(1)
      
      if (error) {
        results.push({
          step: 'check_users_table',
          status: 'error',
          message: error.message
        })
      } else {
        results.push({
          step: 'check_users_table',
          status: 'success',
          message: 'Table users accessible',
          sample_user: userData?.[0]
        })
      }
    } catch (e) {
      results.push({
        step: 'check_users_table',
        status: 'error',
        message: 'Erreur lors de l\'accès aux utilisateurs'
      })
    }

    // Étape 3: Tenter de créer un compte test (si la table existe)
    const tableExists = !results.some(r => r.step === 'check_comptes_table' && r.status === 'table_missing')
    
    if (tableExists) {
      try {
        const { data, error } = await supabaseAdmin
          .from('comptes')
          .insert({
            entreprise: 'Test Migration',
            adresse: 'Test Address',
            created_by: 1
          })
          .select()
          .single()
        
        if (error) {
          results.push({
            step: 'test_insert',
            status: 'error',
            message: error.message
          })
        } else {
          // Supprimer le test immédiatement
          await supabaseAdmin
            .from('comptes')
            .delete()
            .eq('id', data.id)
          
          results.push({
            step: 'test_insert',
            status: 'success',
            message: 'Insertion et suppression test réussies'
          })
        }
      } catch (e) {
        results.push({
          step: 'test_insert',
          status: 'error',
          message: 'Erreur lors du test d\'insertion'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vérification de migration terminée',
      results,
      instructions: tableExists ? 
        'Les tables semblent prêtes pour les comptes' : 
        'Veuillez créer les tables manuellement via la console Supabase'
    })

  } catch (error) {
    console.error('Erreur migration:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la migration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}