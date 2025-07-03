'use client'

import { useSession } from 'next-auth/react'
import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Facebook, TrendingUp, Target, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Import des nouveaux composants
import { AdvancedCalendar, DateRange } from '@/components/ui/advanced-calendar'
import { ClientSelector, ClientOption } from '@/components/ui/client-selector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface CampaignData {
  campaign_id: string
  campaign_name: string
  account_id: string
  total_spend: number
  total_impressions: number
  total_reach: number
  total_clicks: number
  avg_ctr: number
  avg_cpc: number
  avg_cpm: number
  adsets_count: number
  ads_count: number
  status: string
}

interface SyncStatus {
  needsSync: boolean
  canDisplayData: boolean
  syncing: boolean
  progress: number
}

export default function FacebookCampaignsPage() {
  const { data: session } = useSession()
  
  // États pour les données
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
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

  // Récupération des données des campagnes
  const loadCampaignsData = useCallback(async () => {
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

      const response = await fetch(`/api/facebook/data/campaigns?${params}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des campagnes')
      }

      const campaignsData = await response.json()
      setCampaigns(campaignsData)

    } catch (err) {
      console.error('Erreur chargement campagnes:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des campagnes')
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode])

  // Surveillance du progrès de sync
  const pollSyncProgress = useCallback(() => {
    const interval = setInterval(() => {
      setSyncStatus(prev => {
        const newProgress = Math.min(prev.progress + 10, 100)
        if (newProgress >= 100) {
          clearInterval(interval)
          loadCampaignsData()
          return { ...prev, syncing: false, progress: 100 }
        }
        return { ...prev, progress: newProgress }
      })
    }, 1000)

    return interval
  }, [loadCampaignsData])

  // Smart sync et récupération des données
  const smartSyncAndLoadData = useCallback(async () => {
    if (!selectedClient || !dateRange.from || !dateRange.to) return

    setLoading(true)
    setError(null)

    try {
      // 1. Effectuer le smart sync
      const syncPayload = {
        compteId: selectedClient.compteId,
        facebookAccountId: selectedClient.facebookAccountId,
        dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
        dateTo: format(dateRange.to, 'yyyy-MM-dd'),
        ...(comparisonMode && comparisonRange?.from && comparisonRange?.to && {
          comparisonDateFrom: format(comparisonRange.from, 'yyyy-MM-dd'),
          comparisonDateTo: format(comparisonRange.to, 'yyyy-MM-dd')
        }),
        level: 'campaign'
      }

      const syncResponse = await fetch('/api/facebook/smart-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload)
      })

      if (!syncResponse.ok) {
        throw new Error('Erreur lors de la synchronisation')
      }

      const syncResult = await syncResponse.json()
      setSyncStatus({
        needsSync: syncResult.dataAnalysis.needsSync,
        canDisplayData: syncResult.dataAnalysis.canDisplayData,
        syncing: syncResult.dataAnalysis.needsSync,
        progress: 0
      })

      // 2. Si on peut afficher des données, les récupérer
      if (syncResult.dataAnalysis.canDisplayData) {
        await loadCampaignsData()
      }

      // 3. Si sync en cours, surveiller le progrès
      if (syncResult.dataAnalysis.needsSync) {
        pollSyncProgress()
      }

    } catch (err) {
      console.error('Erreur smart sync campagnes:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode, loadCampaignsData, pollSyncProgress])

  // URGENT: DÉSACTIVER APPELS AUTOMATIQUES FACEBOOK  
  // Déclenchement MANUEL uniquement pour éviter boucle infinie d'appels API
  // useEffect(() => {
  //   if (selectedClient && dateRange.from && dateRange.to) {
  //     smartSyncAndLoadData()
  //   }
  // }, [selectedClient, dateRange.from, dateRange.to, smartSyncAndLoadData])

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
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - Campaigns</h1>
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

          {/* MAITRE: Bouton validation manuel pour contrôler appels API */}
          {selectedClient && dateRange.from && dateRange.to && (
            <Button 
              onClick={smartSyncAndLoadData}
              disabled={loading}
              className="whitespace-nowrap bg-blue-600 hover:bg-blue-700"
            >
              {loading ? '⏳ Chargement...' : '🔄 Charger Données Facebook'}
            </Button>
          )}
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
            Veuillez sélectionner un compte client pour afficher les campagnes Facebook Ads.
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
                <span className="text-sm font-medium">Synchronisation des campagnes en cours...</span>
              </div>
              <Progress value={syncStatus.progress} />
              <p className="text-xs text-muted-foreground">
                {syncStatus.progress}% complété - Récupération des données manquantes depuis Facebook
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Données existantes disponibles */}
      {syncStatus.canDisplayData && !syncStatus.syncing && campaigns.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Campagnes affichées depuis la base locale.
            {syncStatus.needsSync && " Synchronisation des données manquantes terminée."}
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques des campagnes */}
      {campaigns.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campagnes Actives</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'ACTIVE').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sur {campaigns.length} total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Moyenne</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? (campaigns.reduce((acc, c) => acc + (c.avg_ctr || 0), 0) / campaigns.length).toFixed(2)
                    : '0.00'}%
                </div>
                <p className="text-xs text-muted-foreground">CTR Moyen</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Total</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(campaigns.reduce((acc, c) => acc + (c.total_spend || 0), 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des campagnes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance des Campagnes
                <Badge variant="outline">
                  {campaigns.length} campagnes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clics</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>AdSets</TableHead>
                      <TableHead>Ads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.campaign_id}>
                        <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(campaign.status)
                          )}>
                            {campaign.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(campaign.total_spend)}</TableCell>
                        <TableCell>{formatNumber(campaign.total_impressions)}</TableCell>
                        <TableCell>{formatNumber(campaign.total_clicks)}</TableCell>
                        <TableCell>{campaign.avg_ctr?.toFixed(2)}%</TableCell>
                        <TableCell>{formatCurrency(campaign.avg_cpc)}</TableCell>
                        <TableCell>{campaign.adsets_count || 0}</TableCell>
                        <TableCell>{campaign.ads_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Message si pas de données */}
      {!campaigns.length && selectedClient && dateRange.from && dateRange.to && !loading && !syncStatus.syncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune campagne disponible</h3>
              <p className="text-muted-foreground mb-4">
                Aucune campagne Facebook Ads trouvée pour la période sélectionnée.
              </p>
              <Button onClick={smartSyncAndLoadData} disabled={loading}>
                Relancer la synchronisation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}