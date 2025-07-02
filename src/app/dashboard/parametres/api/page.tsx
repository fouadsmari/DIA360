'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Plus, 
  Edit, 
  Trash, 
  Eye, 
  EyeOff,
  Facebook,
  Chrome,
  Instagram,
  Linkedin
} from 'lucide-react'

interface FacebookAdsApi {
  id: number
  nom: string
  app_id: string
  app_secret: string
  access_token: string
  account_id?: string
  is_active: boolean
  created_at: string
}

interface GoogleAdsApi {
  id: number
  nom: string
  client_id: string
  client_secret: string
  refresh_token: string
  developer_token: string
  customer_id?: string
  is_active: boolean
  created_at: string
}

interface SocialMediaApi {
  id: number
  plateforme: 'facebook_page' | 'instagram' | 'linkedin' | 'tiktok'
  nom: string
  api_key?: string
  api_secret?: string
  access_token?: string
  refresh_token?: string
  page_id?: string
  account_id?: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export default function ApiPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  
  // États pour les APIs
  const [facebookAdsApis, setFacebookAdsApis] = useState<FacebookAdsApi[]>([])
  const [googleAdsApis, setGoogleAdsApis] = useState<GoogleAdsApi[]>([])
  const [socialApis, setSocialApis] = useState<SocialMediaApi[]>([])
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (session?.user?.role === 'Superadmin' || session?.user?.role === 'Direction') {
      fetchAllApis()
    }
  }, [session])

  const fetchAllApis = async () => {
    try {
      setLoading(true)
      
      // Fetch Facebook Ads APIs
      const facebookResponse = await fetch('/api/facebook-ads-apis')
      if (facebookResponse.ok) {
        const facebookData = await facebookResponse.json()
        setFacebookAdsApis(facebookData)
      }

      // Fetch Google Ads APIs
      const googleResponse = await fetch('/api/google-ads-apis')
      if (googleResponse.ok) {
        const googleData = await googleResponse.json()
        setGoogleAdsApis(googleData)
      }

      // Fetch Social Media APIs
      const socialResponse = await fetch('/api/social-media-apis')
      if (socialResponse.ok) {
        const socialData = await socialResponse.json()
        setSocialApis(socialData)
      }

    } catch (error) {
      console.error('Erreur chargement APIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const maskSecret = (secret: string) => {
    if (!secret) return '-'
    return secret.length > 8 ? secret.substring(0, 4) + '••••••••' + secret.slice(-4) : '••••••••'
  }

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getPlatformIcon = (plateforme: string) => {
    switch (plateforme) {
      case 'facebook_page': return <Facebook className="h-4 w-4 text-blue-600" />
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />
      case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-700" />
      case 'tiktok': return <div className="h-4 w-4 rounded bg-black text-white text-xs flex items-center justify-center font-bold">T</div>
      default: return null
    }
  }

  const getPlatformLabel = (plateforme: string) => {
    switch (plateforme) {
      case 'facebook_page': return 'Facebook Page'
      case 'instagram': return 'Instagram'
      case 'linkedin': return 'LinkedIn'
      case 'tiktok': return 'TikTok'
      default: return plateforme
    }
  }

  if (session?.user?.role !== 'Superadmin' && session?.user?.role !== 'Direction') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="text-center p-6">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground">
              Seuls les Superadmin et Direction peuvent accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration API</h1>
        <p className="text-muted-foreground">
          Gérez les clés API et tokens pour les différentes plateformes publicitaires et réseaux sociaux
        </p>
      </div>

      <Tabs defaultValue="facebook" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook Ads
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Chrome className="h-4 w-4" />
            Google Ads
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Réseaux sociaux
          </TabsTrigger>
        </TabsList>

        {/* Facebook Ads Tab */}
        <TabsContent value="facebook">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  APIs Facebook Ads
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurez vos tokens et clés d&apos;accès Facebook Ads
                </p>
              </div>
              <Button onClick={() => console.log('Ajouter Facebook API')}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter API
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>App ID</TableHead>
                        <TableHead>App Secret</TableHead>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facebookAdsApis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Aucune API Facebook Ads configurée
                          </TableCell>
                        </TableRow>
                      ) : (
                        facebookAdsApis.map((api) => (
                          <TableRow key={api.id}>
                            <TableCell className="font-medium">{api.nom}</TableCell>
                            <TableCell>{api.app_id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {showSecrets[`fb-secret-${api.id}`] ? api.app_secret : maskSecret(api.app_secret)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSecretVisibility(`fb-secret-${api.id}`)}
                                >
                                  {showSecrets[`fb-secret-${api.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{api.account_id || '-'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                api.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {api.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Edit Facebook API:', api.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Delete Facebook API:', api.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Ads Tab */}
        <TabsContent value="google">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5 text-red-600" />
                  APIs Google Ads
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurez vos tokens et clés d&apos;accès Google Ads
                </p>
              </div>
              <Button onClick={() => console.log('Ajouter Google API')}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter API
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>Developer Token</TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {googleAdsApis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Aucune API Google Ads configurée
                          </TableCell>
                        </TableRow>
                      ) : (
                        googleAdsApis.map((api) => (
                          <TableRow key={api.id}>
                            <TableCell className="font-medium">{api.nom}</TableCell>
                            <TableCell>{api.client_id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {showSecrets[`google-token-${api.id}`] ? api.developer_token : maskSecret(api.developer_token)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSecretVisibility(`google-token-${api.id}`)}
                                >
                                  {showSecrets[`google-token-${api.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{api.customer_id || '-'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                api.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {api.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Edit Google API:', api.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Delete Google API:', api.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Réseaux sociaux Tab */}
        <TabsContent value="social">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  APIs Réseaux sociaux
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurez vos APIs pour Facebook Pages, Instagram, LinkedIn et TikTok
                </p>
              </div>
              <Button onClick={() => console.log('Ajouter Social API')}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter API
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plateforme</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Page/Account ID</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {socialApis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Aucune API de réseau social configurée
                          </TableCell>
                        </TableRow>
                      ) : (
                        socialApis.map((api) => (
                          <TableRow key={api.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPlatformIcon(api.plateforme)}
                                <span className="font-medium">{getPlatformLabel(api.plateforme)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{api.nom}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {showSecrets[`social-key-${api.id}`] ? api.api_key : maskSecret(api.api_key || '')}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSecretVisibility(`social-key-${api.id}`)}
                                >
                                  {showSecrets[`social-key-${api.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{api.page_id || api.account_id || '-'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                api.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {api.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Edit Social API:', api.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => console.log('Delete Social API:', api.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}