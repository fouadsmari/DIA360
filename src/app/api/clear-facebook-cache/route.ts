import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'Superadmin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Cette route va retourner des instructions pour vider le cache côté client
    return NextResponse.json({
      message: 'Instructions pour vider le cache Facebook',
      instructions: {
        localStorage: 'Vider localStorage facebook-ads-* keys',
        sessionStorage: 'Vider sessionStorage',
        browserCache: 'Forcer refresh (Ctrl+F5)',
        context: 'Reset du contexte React'
      },
      clearCacheScript: `
        // Script à exécuter dans la console du navigateur
        Object.keys(localStorage).forEach(key => {
          if (key.includes('facebook') || key.includes('ads')) {
            localStorage.removeItem(key);
            console.log('Removed:', key);
          }
        });
        
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('facebook') || key.includes('ads')) {
            sessionStorage.removeItem(key);
            console.log('Removed:', key);
          }
        });
        
        window.location.reload(true);
      `,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur clear cache:', error)
    return NextResponse.json({
      error: 'Erreur lors du clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}