'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash, 
  Eye, 
  EyeOff,
  Facebook,
  Chrome,
  Instagram,
  Linkedin,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Settings,
  RefreshCw
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

interface FacebookApiLog {
  id: string
  endpoint: string
  method: string
  request_url: string
  request_params?: Record<string, unknown>
  response_status?: number
  response_body?: unknown
  response_time_ms?: number
  success: boolean
  error_message?: string
  error_code?: string
  level?: string
  date_range_from?: string
  date_range_to?: string
  account_id: string
  created_at: string
}

interface LogsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ApiPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  
  // États pour les APIs
  const [facebookAdsApis, setFacebookAdsApis] = useState<FacebookAdsApi[]>([])
  const [googleAdsApis, setGoogleAdsApis] = useState<GoogleAdsApi[]>([])
  const [socialApis, setSocialApis] = useState<SocialMediaApi[]>([])
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({})

  // États pour les logs Facebook
  const [facebookLogs, setFacebookLogs] = useState<FacebookApiLog[]>([])
  const [logsPagination, setLogsPagination] = useState<LogsPagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [logsLoading, setLogsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<FacebookApiLog | null>(null)
  const [logDetailOpen, setLogDetailOpen] = useState(false)
  const [retentionDays, setRetentionDays] = useState(15)
  const [retentionLoading, setRetentionLoading] = useState(false)
  
  // États pour les filtres de logs
  const [logFilters, setLogFilters] = useState({
    endpoint: '',
    success: 'all',
    dateFrom: '',
    dateTo: '',
    accountId: ''
  })

  // États pour les modals
  const [facebookDialogOpen, setFacebookDialogOpen] = useState(false)
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false)
  const [socialDialogOpen, setSocialDialogOpen] = useState(false)
  const [retentionDialogOpen, setRetentionDialogOpen] = useState(false)

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

  // Fonctions pour les logs Facebook
  const fetchFacebookLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      
      const params = new URLSearchParams({
        page: logsPagination.page.toString(),
        limit: logsPagination.limit.toString(),
        ...(logFilters.endpoint && { endpoint: logFilters.endpoint }),
        ...(logFilters.success !== 'all' && { success: logFilters.success }),
        ...(logFilters.dateFrom && { from: logFilters.dateFrom }),
        ...(logFilters.dateTo && { to: logFilters.dateTo }),
        ...(logFilters.accountId && { account_id: logFilters.accountId })
      })

      console.log('🔍 Chargement logs Facebook avec params:', params.toString())
      const response = await fetch(`/api/facebook/logs?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Logs Facebook reçus:', data)
        setFacebookLogs(data.data || [])
        setLogsPagination(data.pagination)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur de parsing' }))
        console.error('❌ Erreur chargement logs Facebook:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
      }
    } catch (error) {
      console.error('Erreur chargement logs Facebook:', error)
    } finally {
      setLogsLoading(false)
    }
  }, [logFilters, logsPagination.page, logsPagination.limit])

  useEffect(() => {
    if (session?.user?.role && ['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
      fetchFacebookLogs()
    }
  }, [session, logFilters, logsPagination.page, fetchFacebookLogs])

  // Test de connexion logs Facebook
  const testFacebookLogsConnection = async () => {
    try {
      console.log('🧪 Test connexion logs Facebook...')
      const response = await fetch('/api/facebook/logs/test')
      const result = await response.json()
      
      console.log('🧪 Résultat test logs:', result)
      
      if (result.success) {
        alert(`✅ Test logs Facebook réussi!\n\nLogs totaux: ${result.tests.totalCount}\nLogs récents: ${result.tests.recentLogsCount}\nLogs utilisateur: ${result.tests.userLogsCount}\nRôle: ${result.tests.userRole}`)
      } else {
        alert(`❌ Test logs Facebook échoué!\n\nErreur: ${result.error}\nDétails: ${result.details}`)
      }
    } catch (error) {
      console.error('Erreur test logs:', error)
      alert('❌ Erreur lors du test de connexion logs')
    }
  }

  const handleDeleteExpiredLogs = async () => {
    try {
      const response = await fetch('/api/facebook/logs?action=cleanup', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Logs expirés supprimés:', data.message)
        await fetchFacebookLogs()
      }
    } catch (error) {
      console.error('Erreur suppression logs expirés:', error)
    }
  }

  const handleUpdateRetention = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (retentionDays < 1 || retentionDays > 90) {
      return
    }

    try {
      setRetentionLoading(true)
      
      const response = await fetch('/api/facebook/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retention_days: retentionDays })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Rétention mise à jour:', data.message)
        setRetentionDialogOpen(false)
      } else {
        const data = await response.json()
        console.error('Erreur mise à jour rétention:', data.error)
      }
    } catch (error) {
      console.error('Erreur mise à jour rétention:', error)
    } finally {
      setRetentionLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const getStatusIcon = (success: boolean) => {
    return success 
      ? <CheckCircle className="h-4 w-4 text-green-600" />
      : <XCircle className="h-4 w-4 text-red-600" />
  }

  const getStatusBadge = (success: boolean) => {
    return success 
      ? <Badge className="bg-green-100 text-green-800">Succès</Badge>
      : <Badge className="bg-red-100 text-red-800">Échec</Badge>
  }

  const openLogDetail = (log: FacebookApiLog) => {
    setSelectedLog(log)
    setLogDetailOpen(true)
  }

  const renderLogDetail = (): React.ReactNode => {
    if (!selectedLog) return null
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Endpoint</Label>
            <p className="font-mono text-sm p-2 bg-gray-50 rounded">{selectedLog.endpoint}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Méthode</Label>
            <p className="text-sm p-2">
              <Badge variant="outline">{selectedLog.method}</Badge>
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Statut</Label>
          <p className="text-sm">
            {getStatusBadge(selectedLog.success)}
          </p>
        </div>

        {selectedLog.request_url && (
          <div>
            <Label className="text-sm font-medium">URL</Label>
            <p className="font-mono text-xs p-2 bg-gray-50 rounded break-all">{selectedLog.request_url}</p>
          </div>
        )}

        {selectedLog.error_message && (
          <div>
            <Label className="text-sm font-medium text-red-600">Erreur</Label>
            <p className="text-sm text-red-800 p-2 bg-red-50 rounded">{selectedLog.error_message}</p>
          </div>
        )}
      </div>
    )
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

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Logs Facebook
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

        {/* Facebook Ads Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Logs Facebook Ads API
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Historique des requêtes envoyées à l&apos;API Facebook Marketing
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRetentionDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Rétention
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeleteExpiredLogs}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Nettoyer
                </Button>
                <Button 
                  variant="secondary"
                  onClick={testFacebookLogsConnection}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Test API
                </Button>
                <Button onClick={fetchFacebookLogs} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtres */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Endpoint</Label>
                  <Input
                    placeholder="Filtrer par endpoint..."
                    value={logFilters.endpoint}
                    onChange={(e) => setLogFilters({...logFilters, endpoint: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select 
                    value={logFilters.success} 
                    onValueChange={(value) => setLogFilters({...logFilters, success: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="true">Succès</SelectItem>
                      <SelectItem value="false">Échec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={logFilters.dateFrom}
                    onChange={(e) => setLogFilters({...logFilters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={logFilters.dateTo}
                    onChange={(e) => setLogFilters({...logFilters, dateTo: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Account ID</Label>
                  <Input
                    placeholder="ID du compte..."
                    value={logFilters.accountId}
                    onChange={(e) => setLogFilters({...logFilters, accountId: e.target.value})}
                  />
                </div>
              </div>

              {/* Table des logs */}
              {logsLoading ? (
                <div className="text-center py-8">Chargement des logs...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Temps (ms)</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facebookLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Aucun log Facebook trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        facebookLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.success)}
                                {getStatusBadge(log.success)}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.method}</Badge>
                            </TableCell>
                            <TableCell>
                              {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                            </TableCell>
                            <TableCell>
                              {log.level && (
                                <Badge variant="secondary">{log.level}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.account_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(log.created_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLogDetail(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {logsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {logsPagination.page} sur {logsPagination.totalPages} 
                    ({logsPagination.total} logs au total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!logsPagination.hasPrev}
                      onClick={() => setLogsPagination({...logsPagination, page: logsPagination.page - 1})}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!logsPagination.hasNext}
                      onClick={() => setLogsPagination({...logsPagination, page: logsPagination.page + 1})}
                    >
                      Suivant
                    </Button>
                  </div>
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

      {/* Modal détail des logs */}
      <Dialog open={logDetailOpen} onOpenChange={setLogDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détail du log Facebook API
            </DialogTitle>
          </DialogHeader>
          {renderLogDetail()}
        </DialogContent>
      </Dialog>

      {/* Modal configuration rétention */}
      <Dialog open={retentionDialogOpen} onOpenChange={setRetentionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuration de la rétention des logs</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRetention} className="space-y-4">
            <div>
              <Label htmlFor="retention_days">Durée de rétention (en jours) *</Label>
              <Input
                id="retention_days"
                type="number"
                min="1"
                max="90"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 15)}
                placeholder="15"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Les logs seront automatiquement supprimés après cette durée (1-90 jours)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRetentionDialogOpen(false)}
                disabled={retentionLoading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={retentionLoading}>
                {retentionLoading ? 'Mise à jour...' : 'Sauvegarder'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}