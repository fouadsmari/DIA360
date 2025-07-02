'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Facebook, ImageIcon, Play, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Import des nouveaux composants
import { AdvancedCalendar, DateRange } from '@/components/ui/advanced-calendar'
import { ClientSelector, ClientOption } from '@/components/ui/client-selector'

interface AdData {
  ad_id: string
  ad_name: string
  adset_id: string
  adset_name: string
  campaign_id: string
  campaign_name: string
  account_id: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  status: string
  ad_type: string
  demographics: {
    age: string[]
    gender: string[]
    country: string[]
    platform: string[]
  }
}

interface SyncStatus {
  needsSync: boolean
  canDisplayData: boolean
  syncing: boolean
  progress: number
}

export default function FacebookAdsPage() {
  const { data: session } = useSession()
  
  // États pour les données
  const [ads, setAds] = useState<AdData[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    needsSync: false,
    canDisplayData: false,
    syncing: false,
    progress: 0
  })
  
  // États pour les sélections
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  })
  const [comparisonRange, setComparisonRange] = useState<DateRange | undefined>(undefined)
  const [comparisonMode, setComparisonMode] = useState(false)
  
  // États pour l'UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Récupération des données des ads
  const loadAdsData = useCallback(async () => {
    if (!selectedClient || !dateRange.from || !dateRange.to) return

    try {
      const params = new URLSearchParams({
        compteId: selectedClient.compteId.toString(),
        facebookAccountId: selectedClient.facebookAccountId,
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      })

      if (comparisonMode && comparisonRange?.from && comparisonRange?.to) {
        params.append('comparisonFrom', format(comparisonRange.from, 'yyyy-MM-dd'))
        params.append('comparisonTo', format(comparisonRange.to, 'yyyy-MM-dd'))
      }

      console.log('📱 MAITRE: Appel API Facebook ads avec params:', params.toString())
      const response = await fetch(`/api/facebook/data/ads?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur de parsing JSON' }))
        console.error('❌ Erreur API ads:', response.status, errorData)
        throw new Error(`Erreur ${response.status}: ${errorData.error || 'Erreur lors du chargement des publicités'}`)
      }

      const result = await response.json()
      console.log('✅ Réponse API ads:', {
        facebook_api_called: result.facebook_api_called,
        source: result.source,
        data_count: result.data?.length || 0,
        message: result.message
      })

      // MAITRE: Utiliser les données mappées depuis Facebook API
      const adsData = result.data || []
      setAds(adsData)
      
      if (adsData.length === 0) {
        console.log('📭 MAITRE: Aucune publicité retournée')
        
        // Si pas de données et source était Facebook API, il n'y a vraiment rien
        if (result.source === 'facebook_api') {
          setError('Aucune publicité trouvée pour cette période - vérifiez votre compte Facebook et vos clés API')
        }
        // Si pas de données et source était cache local, on peut essayer smart-sync
        else if (result.source === 'local_cache' || result.cache_hit) {
          setError('Pas de données en cache local pour cette période')
        }
      } else {
        setError(null) // Réinitialiser l'erreur si on a des données
        console.log(`✅ MAITRE: ${adsData.length} publicités chargées depuis ${result.source || 'source inconnue'}`)
      }

    } catch (err) {
      console.error('Erreur chargement publicités:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des publicités')
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode])

  // Surveillance du progrès de sync (pour usage futur)
  // const pollSyncProgress = useCallback(() => {
  //   const interval = setInterval(() => {
  //     setSyncStatus(prev => {
  //       const newProgress = Math.min(prev.progress + 10, 100)
  //       if (newProgress >= 100) {
  //         clearInterval(interval)
  //         loadAdsData()
  //         return { ...prev, syncing: false, progress: 100 }
  //       }
  //       return { ...prev, progress: newProgress }
  //     })
  //   }, 1000)

  //   return interval
  // }, [loadAdsData])

  // Smart sync et récupération des données optimisé
  const smartSyncAndLoadData = useCallback(async () => {
    if (!selectedClient || !dateRange.from || !dateRange.to) return

    setLoading(true)
    setError(null)

    try {
      // 1. MAITRE: Essayer d'abord le cache local directement
      console.log('💾 MAITRE: Tentative cache local d\'abord')
      await loadAdsData()
      
      // Si on a des données, pas besoin de smart-sync
      // loadAdsData va nous dire si c'est du cache ou Facebook API

    } catch (err) {
      console.error('Erreur chargement publicités:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [selectedClient, dateRange, loadAdsData])

  // Test de connexion Facebook
  const testFacebookConnection = useCallback(async () => {
    if (!selectedClient) return

    try {
      setLoading(true)
      const response = await fetch(`/api/facebook/test-connection?accountId=${selectedClient.facebookAccountId}`)
      const result = await response.json()
      
      console.log('🧪 Test connexion Facebook:', result)
      
      if (result.success) {
        setError(null)
        alert(`✅ Connexion Facebook réussie!\n\nCompte: ${result.account_info?.name || 'N/A'}\nStatut: ${result.account_info?.account_status || 'N/A'}\nPublicités accessibles: ${result.ads_accessible ? 'Oui' : 'Non'}\nNombre de publicités: ${result.ads_count}`)
      } else {
        setError(`❌ Échec connexion Facebook: ${result.error}\n${result.details || ''}`)
        alert(`❌ Échec du test de connexion Facebook\n\nErreur: ${result.error}\nDétails: ${result.details || ''}\n\nVérifiez vos clés API Facebook dans les paramètres.`)
      }
    } catch (err) {
      console.error('Erreur test connexion:', err)
      setError('Erreur lors du test de connexion Facebook')
    } finally {
      setLoading(false)
    }
  }, [selectedClient])

  // Déclenchement optimisé - charge directement depuis cache/API
  useEffect(() => {
    if (selectedClient && dateRange.from && dateRange.to) {
      smartSyncAndLoadData()
    }
  }, [selectedClient, dateRange.from, dateRange.to, smartSyncAndLoadData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-CA').format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'DISAPPROVED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'video': return <Play className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getPerformanceLevel = (ctr: number, cpc: number) => {
    if (ctr >= 2 && cpc <= 1) return { label: 'Excellent', color: 'bg-green-500' }
    if (ctr >= 1 && cpc <= 2) return { label: 'Bon', color: 'bg-blue-500' }
    if (ctr >= 0.5 && cpc <= 5) return { label: 'Moyen', color: 'bg-yellow-500' }
    return { label: 'À optimiser', color: 'bg-red-500' }
  }

  if (session?.user?.role && !['Superadmin', 'Direction', 'Responsable'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="text-center p-6">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground">
              Seuls les Superadmin, Direction et Responsable peuvent accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - Publicités</h1>
          {selectedClient && (
            <Badge variant="secondary" className="ml-2">
              {selectedClient.entreprise}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {/* Sélecteur de compte client */}
          <ClientSelector
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            placeholder="Sélectionner un compte client..."
          />

          {/* Calendrier avancé */}
          <AdvancedCalendar
            dateRange={dateRange}
            comparisonRange={comparisonRange}
            onDateRangeChange={setDateRange}
            onComparisonRangeChange={setComparisonRange}
            comparisonMode={comparisonMode}
            onComparisonModeChange={setComparisonMode}
          />
        </div>
      </div>

      {/* Messages d'état */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedClient && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Veuillez sélectionner un compte client pour afficher les publicités Facebook Ads.
          </AlertDescription>
        </Alert>
      )}

      {/* Statut de synchronisation */}
      {syncStatus.syncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Synchronisation des publicités en cours...</span>
              </div>
              <Progress value={syncStatus.progress} />
              <p className="text-xs text-muted-foreground">
                {syncStatus.progress}% complété - Récupération des données manquantes depuis Facebook
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Données Facebook disponibles */}
      {!syncStatus.syncing && ads.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {ads.length} publicités récupérées via Facebook API.
            {syncStatus.needsSync && " Synchronisation terminée."}
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques des publicités */}
      {ads.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Publicités</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ads.length}</div>
                <p className="text-xs text-muted-foreground">
                  Publicités configurées
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Publicités Actives</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ads.filter(a => a.status === 'ACTIVE').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ads.length > 0 
                    ? ((ads.filter(a => a.status === 'ACTIVE').length / ads.length) * 100).toFixed(0)
                    : 0}% du total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Excellente</CardTitle>
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ads.filter(a => getPerformanceLevel(a.ctr || 0, a.cpc || 0).label === 'Excellent').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Publicités performantes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC Moyen</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ads.length > 0 
                    ? formatCurrency(ads.reduce((acc, a) => acc + (a.cpc || 0), 0) / ads.length)
                    : formatCurrency(0)
                  }
                </div>
                <p className="text-xs text-muted-foreground">Coût par clic</p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des publicités */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Performance Détaillée des Publicités
                <Badge variant="outline">
                  {ads.length} publicités
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom Publicité</TableHead>
                      <TableHead>AdSet</TableHead>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clics</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => {
                      const performance = getPerformanceLevel(ad.ctr || 0, ad.cpc || 0)
                      return (
                        <TableRow key={ad.ad_id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {ad.ad_name}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {ad.adset_name}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {ad.campaign_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getAdTypeIcon(ad.ad_type)}
                              <span className="text-xs">{ad.ad_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              getStatusColor(ad.status)
                            )}>
                              {ad.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={performance.color}>
                              {performance.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(ad.spend)}</TableCell>
                          <TableCell>{formatNumber(ad.impressions)}</TableCell>
                          <TableCell>{formatNumber(ad.clicks)}</TableCell>
                          <TableCell>{ad.ctr?.toFixed(2)}%</TableCell>
                          <TableCell>{formatCurrency(ad.cpc)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Message si pas de données */}
      {!ads.length && selectedClient && dateRange.from && dateRange.to && !loading && !syncStatus.syncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune publicité disponible</h3>
              <p className="text-muted-foreground mb-4">
                Aucune publicité Facebook Ads trouvée pour la période sélectionnée.
              </p>
              <div className="flex gap-2">
                <Button onClick={smartSyncAndLoadData} disabled={loading}>
                  Relancer la synchronisation
                </Button>
                {selectedClient && (
                  <Button 
                    variant="outline" 
                    onClick={() => testFacebookConnection()} 
                    disabled={loading}
                  >
                    Tester connexion Facebook
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}