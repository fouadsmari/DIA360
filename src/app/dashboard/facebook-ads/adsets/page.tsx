'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Facebook, Users, Target, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react'
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

// Import des nouveaux composants
import { AdvancedCalendar, DateRange } from '@/components/ui/advanced-calendar'
import { ClientSelector, ClientOption } from '@/components/ui/client-selector'

interface AdSetData {
  adset_id: string
  adset_name: string
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
  ads_count: number
}

interface SyncStatus {
  needsSync: boolean
  canDisplayData: boolean
  syncing: boolean
  progress: number
}

export default function FacebookAdSetsPage() {
  const { data: session } = useSession()
  
  // États pour les données
  const [adsets, setAdsets] = useState<AdSetData[]>([])
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

  // Récupération des données des adsets
  const loadAdSetsData = useCallback(async () => {
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

      const response = await fetch(`/api/facebook/data/adsets?${params}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des adsets')
      }

      const adsetsData = await response.json()
      setAdsets(adsetsData)

    } catch (err) {
      console.error('Erreur chargement adsets:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des adsets')
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode])

  // Surveillance du progrès de sync
  const pollSyncProgress = useCallback(() => {
    const interval = setInterval(() => {
      setSyncStatus(prev => {
        const newProgress = Math.min(prev.progress + 10, 100)
        if (newProgress >= 100) {
          clearInterval(interval)
          loadAdSetsData()
          return { ...prev, syncing: false, progress: 100 }
        }
        return { ...prev, progress: newProgress }
      })
    }, 1000)

    return interval
  }, [loadAdSetsData])

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
        level: 'adset'
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
        await loadAdSetsData()
      }

      // 3. Si sync en cours, surveiller le progrès
      if (syncResult.dataAnalysis.needsSync) {
        pollSyncProgress()
      }

    } catch (err) {
      console.error('Erreur smart sync adsets:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode, loadAdSetsData, pollSyncProgress])

  // Déclenchement du smart sync quand les paramètres changent
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

  const getPerformanceBadge = (ctr: number) => {
    if (ctr >= 2) return <Badge className="bg-green-500">Excellent</Badge>
    if (ctr >= 1) return <Badge className="bg-blue-500">Bon</Badge>
    if (ctr >= 0.5) return <Badge className="bg-yellow-500">Moyen</Badge>
    return <Badge className="bg-red-500">Faible</Badge>
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
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - AdSets</h1>
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
            Veuillez sélectionner un compte client pour afficher les adsets Facebook Ads.
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
                <span className="text-sm font-medium">Synchronisation des adsets en cours...</span>
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
      {syncStatus.canDisplayData && !syncStatus.syncing && adsets.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            AdSets affichés depuis la base locale.
            {syncStatus.needsSync && " Synchronisation des données manquantes terminée."}
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques des adsets */}
      {adsets.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total AdSets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adsets.length}</div>
                <p className="text-xs text-muted-foreground">
                  AdSets configurés
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reach Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(adsets.reduce((acc, a) => acc + (a.total_reach || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Personnes atteintes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC Moyen</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {adsets.length > 0 
                    ? formatCurrency(adsets.reduce((acc, a) => acc + (a.avg_cpc || 0), 0) / adsets.length)
                    : formatCurrency(0)
                  }
                </div>
                <p className="text-xs text-muted-foreground">Coût par clic</p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des adsets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance des AdSets
                <Badge variant="outline">
                  {adsets.length} adsets
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom AdSet</TableHead>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Reach</TableHead>
                      <TableHead>Clics</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Ads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adsets.map((adset) => (
                      <TableRow key={adset.adset_id}>
                        <TableCell className="font-medium">{adset.adset_name}</TableCell>
                        <TableCell>{adset.campaign_name}</TableCell>
                        <TableCell>{getPerformanceBadge(adset.avg_ctr || 0)}</TableCell>
                        <TableCell>{formatCurrency(adset.total_spend)}</TableCell>
                        <TableCell>{formatNumber(adset.total_impressions)}</TableCell>
                        <TableCell>{formatNumber(adset.total_reach)}</TableCell>
                        <TableCell>{formatNumber(adset.total_clicks)}</TableCell>
                        <TableCell>{adset.avg_ctr?.toFixed(2)}%</TableCell>
                        <TableCell>{formatCurrency(adset.avg_cpc)}</TableCell>
                        <TableCell>{adset.ads_count || 0}</TableCell>
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
      {!adsets.length && selectedClient && dateRange.from && dateRange.to && !loading && !syncStatus.syncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun adset disponible</h3>
              <p className="text-muted-foreground mb-4">
                Aucun adset Facebook Ads trouvé pour la période sélectionnée.
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