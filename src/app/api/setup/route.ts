import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('Début de la migration des tables comptes...')

    // 1. Créer le type enum user_role s'il n'existe pas
    try {
      const { error: enumError } = await supabaseAdmin.rpc('create_user_role_enum')
      if (enumError && !enumError.message.includes('already exists')) {
        console.error('Erreur création enum:', enumError)
      }
    } catch (e) {
      console.log('Type enum probablement déjà existant')
    }

    // 2. Créer la table comptes
    const createComptesSQL = `
      CREATE TABLE IF NOT EXISTS comptes (
        id SERIAL PRIMARY KEY,
        entreprise VARCHAR(255) NOT NULL,
        adresse TEXT NOT NULL,
        id_facebook_ads VARCHAR(255),
        id_google_ads VARCHAR(255),
        id_pages_facebook TEXT[],
        id_page_instagram TEXT[],
        id_compte_tiktok VARCHAR(255),
        id_compte_linkedin VARCHAR(255),
        budget DECIMAL(10, 2),
        objectif_facebook_ads TEXT[] DEFAULT ARRAY[
          'Trafic', 'Notoriété', 'E-commerce', 'Prospects', 
          'Visites en magasin', 'Appels', 'Infolettres', 'Messages', 'Contact'
        ],
        objectif_google_ads TEXT[] DEFAULT ARRAY[
          'Trafic', 'Notoriété', 'E-commerce', 'Prospects', 
          'Visites en magasin', 'Appels', 'Infolettres', 'Contact'
        ],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by INT REFERENCES users(id)
      );
    `

    const { error: comptesError } = await supabaseAdmin.rpc('exec_sql', { sql: createComptesSQL })
    if (comptesError) {
      console.log('Tentative de création directe de la table comptes...')
      // Essayer de créer via une insertion simple pour tester
      const { data: testData, error: testError } = await supabaseAdmin
        .from('comptes')
        .select('id')
        .limit(1)
        
      if (testError && testError.code === '42P01') {
        // Table n'existe pas, la créer manuellement
        console.log('Table comptes n\'existe pas, création nécessaire via console Supabase')
        return NextResponse.json({
          success: false,
          message: 'Table comptes doit être créée via la console Supabase',
          sql: createComptesSQL
        })
      }
    }

    // 3. Vérifier si les tables existent
    const { data: comptesExists } = await supabaseAdmin
      .from('comptes')
      .select('id')
      .limit(1)

    console.log('Tables de comptes vérifiées')
    
    return NextResponse.json({
      success: true,
      message: 'Migration des tables comptes terminée',
      comptesExists: !!comptesExists
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