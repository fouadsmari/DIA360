'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog'
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

  // États pour les modals
  const [facebookDialogOpen, setFacebookDialogOpen] = useState(false)
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false)
  const [socialDialogOpen, setSocialDialogOpen] = useState(false)

  // États pour les formulaires
  const [newFacebookApi, setNewFacebookApi] = useState({
    nom: '',
    app_id: '',
    app_secret: '',
    access_token: '',
    account_id: ''
  })

  const [newGoogleApi, setNewGoogleApi] = useState({
    nom: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    developer_token: '',
    customer_id: ''
  })

  const [newSocialApi, setNewSocialApi] = useState<{
    plateforme: 'facebook_page' | 'instagram' | 'linkedin' | 'tiktok'
    nom: string
    api_key: string
    api_secret: string
    access_token: string
    refresh_token: string
    page_id: string
    account_id: string
  }>({
    plateforme: 'facebook_page',
    nom: '',
    api_key: '',
    api_secret: '',
    access_token: '',
    refresh_token: '',
    page_id: '',
    account_id: ''
  })

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

  // Fonctions pour Facebook Ads
  const handleAddFacebookApi = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newFacebookApi.nom || !newFacebookApi.app_id || !newFacebookApi.app_secret || !newFacebookApi.access_token) {
      return
    }

    try {
      const response = await fetch('/api/facebook-ads-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFacebookApi)
      })

      if (response.ok) {
        await fetchAllApis()
        setFacebookDialogOpen(false)
        setNewFacebookApi({
          nom: '',
          app_id: '',
          app_secret: '',
          access_token: '',
          account_id: ''
        })
      } else {
        const data = await response.json()
        console.error('Erreur ajout Facebook Ads API:', data.error)
      }
    } catch (error) {
      console.error('Erreur ajout Facebook Ads API:', error)
    }
  }

  // Fonctions pour Google Ads
  const handleAddGoogleApi = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newGoogleApi.nom || !newGoogleApi.client_id || !newGoogleApi.client_secret || !newGoogleApi.refresh_token || !newGoogleApi.developer_token) {
      return
    }

    try {
      const response = await fetch('/api/google-ads-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoogleApi)
      })

      if (response.ok) {
        await fetchAllApis()
        setGoogleDialogOpen(false)
        setNewGoogleApi({
          nom: '',
          client_id: '',
          client_secret: '',
          refresh_token: '',
          developer_token: '',
          customer_id: ''
        })
      } else {
        const data = await response.json()
        console.error('Erreur ajout Google Ads API:', data.error)
      }
    } catch (error) {
      console.error('Erreur ajout Google Ads API:', error)
    }
  }

  // Fonctions pour Social Media
  const handleAddSocialApi = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newSocialApi.nom || !newSocialApi.plateforme) {
      return
    }

    try {
      const response = await fetch('/api/social-media-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSocialApi)
      })

      if (response.ok) {
        await fetchAllApis()
        setSocialDialogOpen(false)
        setNewSocialApi({
          plateforme: 'facebook_page',
          nom: '',
          api_key: '',
          api_secret: '',
          access_token: '',
          refresh_token: '',
          page_id: '',
          account_id: ''
        })
      } else {
        const data = await response.json()
        console.error('Erreur ajout Social Media API:', data.error)
      }
    } catch (error) {
      console.error('Erreur ajout Social Media API:', error)
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
              <Button onClick={() => setFacebookDialogOpen(true)}>
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
              <Button onClick={() => setGoogleDialogOpen(true)}>
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
              <Button onClick={() => setSocialDialogOpen(true)}>
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

      {/* Modal Facebook Ads */}
      <Dialog open={facebookDialogOpen} onOpenChange={setFacebookDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une API Facebook Ads</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFacebookApi} className="space-y-4">
            <div>
              <Label htmlFor="fb_nom">Nom *</Label>
              <Input
                id="fb_nom"
                value={newFacebookApi.nom}
                onChange={(e) => setNewFacebookApi({...newFacebookApi, nom: e.target.value})}
                placeholder="Ex: Facebook Ads Principal"
                required
              />
            </div>
            <div>
              <Label htmlFor="fb_app_id">App ID *</Label>
              <Input
                id="fb_app_id"
                value={newFacebookApi.app_id}
                onChange={(e) => setNewFacebookApi({...newFacebookApi, app_id: e.target.value})}
                placeholder="123456789012345"
                required
              />
            </div>
            <div>
              <Label htmlFor="fb_app_secret">App Secret *</Label>
              <Input
                id="fb_app_secret"
                type="password"
                value={newFacebookApi.app_secret}
                onChange={(e) => setNewFacebookApi({...newFacebookApi, app_secret: e.target.value})}
                placeholder="••••••••••••••••"
                required
              />
            </div>
            <div>
              <Label htmlFor="fb_access_token">Access Token *</Label>
              <Input
                id="fb_access_token"
                type="password"
                value={newFacebookApi.access_token}
                onChange={(e) => setNewFacebookApi({...newFacebookApi, access_token: e.target.value})}
                placeholder="••••••••••••••••"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFacebookDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Google Ads */}
      <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une API Google Ads</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGoogleApi} className="space-y-4">
            <div>
              <Label htmlFor="g_nom">Nom *</Label>
              <Input
                id="g_nom"
                value={newGoogleApi.nom}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, nom: e.target.value})}
                placeholder="Ex: Google Ads Principal"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_client_id">Client ID *</Label>
              <Input
                id="g_client_id"
                value={newGoogleApi.client_id}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, client_id: e.target.value})}
                placeholder="123456789012-abc123.apps.googleusercontent.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_client_secret">Client Secret *</Label>
              <Input
                id="g_client_secret"
                type="password"
                value={newGoogleApi.client_secret}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, client_secret: e.target.value})}
                placeholder="••••••••••••••••"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_refresh_token">Refresh Token *</Label>
              <Input
                id="g_refresh_token"
                type="password"
                value={newGoogleApi.refresh_token}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, refresh_token: e.target.value})}
                placeholder="••••••••••••••••"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_developer_token">Developer Token *</Label>
              <Input
                id="g_developer_token"
                type="password"
                value={newGoogleApi.developer_token}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, developer_token: e.target.value})}
                placeholder="••••••••••••••••"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_customer_id">Customer ID</Label>
              <Input
                id="g_customer_id"
                value={newGoogleApi.customer_id}
                onChange={(e) => setNewGoogleApi({...newGoogleApi, customer_id: e.target.value})}
                placeholder="123-456-7890"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGoogleDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Social Media */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une API Réseau Social</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSocialApi} className="space-y-4">
            <div>
              <Label htmlFor="s_plateforme">Plateforme *</Label>
              <Select 
                value={newSocialApi.plateforme} 
                onValueChange={(value: 'facebook_page' | 'instagram' | 'linkedin' | 'tiktok') => 
                  setNewSocialApi({...newSocialApi, plateforme: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une plateforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook_page">Facebook Page</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s_nom">Nom *</Label>
              <Input
                id="s_nom"
                value={newSocialApi.nom}
                onChange={(e) => setNewSocialApi({...newSocialApi, nom: e.target.value})}
                placeholder="Ex: Page Facebook Principale"
                required
              />
            </div>
            <div>
              <Label htmlFor="s_api_key">API Key</Label>
              <Input
                id="s_api_key"
                value={newSocialApi.api_key}
                onChange={(e) => setNewSocialApi({...newSocialApi, api_key: e.target.value})}
                placeholder="Clé API"
              />
            </div>
            <div>
              <Label htmlFor="s_api_secret">API Secret</Label>
              <Input
                id="s_api_secret"
                type="password"
                value={newSocialApi.api_secret}
                onChange={(e) => setNewSocialApi({...newSocialApi, api_secret: e.target.value})}
                placeholder="••••••••••••••••"
              />
            </div>
            <div>
              <Label htmlFor="s_access_token">Access Token</Label>
              <Input
                id="s_access_token"
                type="password"
                value={newSocialApi.access_token}
                onChange={(e) => setNewSocialApi({...newSocialApi, access_token: e.target.value})}
                placeholder="••••••••••••••••"
              />
            </div>
            <div>
              <Label htmlFor="s_page_id">Page/Account ID</Label>
              <Input
                id="s_page_id"
                value={newSocialApi.page_id}
                onChange={(e) => setNewSocialApi({...newSocialApi, page_id: e.target.value})}
                placeholder="ID de la page ou du compte"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSocialDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}