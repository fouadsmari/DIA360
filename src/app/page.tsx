import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          DIA360
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Plateforme d&apos;Analyse et Business Intelligence Moderne pour des insights en temps réel et des tableaux de bord interactifs.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">📊 Analytics</CardTitle>
              <CardDescription>
                Dashboards temps réel avec métriques personnalisables
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">👥 Multi-Users</CardTitle>
              <CardDescription>
                Gestion des rôles et permissions granulaires
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">☁️ Cloud-Native</CardTitle>
              <CardDescription>
                Architecture moderne Vercel + Supabase
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Accéder au Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/auth/signin">
              Se connecter
            </Link>
          </Button>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>🚀 Infrastructure prête - Next.js 14 + TypeScript + Supabase + Vercel</p>
        </div>
      </div>
    </main>
  )
}