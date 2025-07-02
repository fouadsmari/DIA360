'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Settings, 
  BarChart3, 
  FileText, 
  User,
  LogOut,
  Building,
  ChevronDown,
  ChevronRight,
  Cog,
  Facebook
} from 'lucide-react'
import { logger } from '@/lib/logger'

const MENU_ITEMS = [
  { icon: Home, label: 'Accueil', href: '/dashboard', roles: ['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS'] },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['Superadmin', 'Direction', 'Responsable'] },
  { icon: Facebook, label: 'Facebook Ads', href: '/dashboard/facebook-ads', roles: ['Superadmin', 'Direction', 'Responsable'], hasSubmenu: true },
  { icon: FileText, label: 'Rapports', href: '/dashboard/reports', roles: ['Superadmin', 'Direction', 'Responsable', 'PUP'] },
  { icon: Building, label: 'Comptes', href: '/dashboard/comptes', roles: ['Superadmin', 'Direction', 'Responsable'] },
  { icon: Users, label: 'Utilisateurs', href: '/dashboard/users', roles: ['Superadmin'] },
  { icon: Settings, label: 'Paramètres', href: '/dashboard/settings', roles: ['Superadmin', 'Direction'] }
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [facebookOpen, setFacebookOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    logger.info('Dashboard accessed', { 
      userId: session.user.id, 
      email: session.user.email,
      role: session.user.role 
    })
  }, [session, status, router])

  const handleLogout = async () => {
    logger.auth.logout(session?.user.id || '')
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  const hasAccess = (roles: string[]) => {
    return session?.user.role && roles.includes(session.user.role)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-4"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">DIA360</h1>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(session.user.name || session.user.email || '')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside 
          className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          <nav className="p-4 space-y-2">
            {MENU_ITEMS.map((item) => {
              if (!hasAccess(item.roles)) return null
              
              const Icon = item.icon
              
              // Traitement spécial pour Facebook Ads (dropdown)
              if (item.label === 'Facebook Ads' && item.hasSubmenu) {
                return (
                  <div key={item.href} className="space-y-1">
                    <button
                      onClick={() => setFacebookOpen(!facebookOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5" />
                        {sidebarOpen && (
                          <span className="ml-3 text-sm font-medium">{item.label}</span>
                        )}
                      </div>
                      {sidebarOpen && (
                        facebookOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      )}
                    </button>
                    
                    {facebookOpen && sidebarOpen && (
                      <div className="ml-6 space-y-1">
                        <Link
                          href="/dashboard/facebook-ads/account"
                          className="flex items-center px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">Account</span>
                        </Link>
                        <Link
                          href="/dashboard/facebook-ads/campaigns"
                          className="flex items-center px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">Campaigns</span>
                        </Link>
                        <Link
                          href="/dashboard/facebook-ads/adsets"
                          className="flex items-center px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">AdSets</span>
                        </Link>
                        <Link
                          href="/dashboard/facebook-ads/ads"
                          className="flex items-center px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">Ads</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              }
              
              // Traitement spécial pour Paramètres (dropdown)
              if (item.label === 'Paramètres') {
                return (
                  <div key={item.href} className="space-y-1">
                    <button
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5" />
                        {sidebarOpen && (
                          <span className="ml-3 text-sm font-medium">{item.label}</span>
                        )}
                      </div>
                      {sidebarOpen && (
                        settingsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      )}
                    </button>
                    
                    {settingsOpen && sidebarOpen && (
                      <div className="ml-6 space-y-1">
                        <Link
                          href="/dashboard/parametres/api"
                          className="flex items-center px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Cog className="h-4 w-4" />
                          <span className="ml-3 text-sm">API</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              }
              
              // Rendu normal pour les autres items
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {sidebarOpen && (
                    <span className="ml-3 text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}