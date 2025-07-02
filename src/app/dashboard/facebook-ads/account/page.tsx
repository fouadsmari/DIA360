'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { 
  Facebook, 
  DollarSign, 
  Eye, 
  MousePointer, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Import des nouveaux composants
import { AdvancedCalendar, DateRange } from '@/components/ui/advanced-calendar'
import { ClientSelector, ClientOption } from '@/components/ui/client-selector'

interface SmartAccountData {
  compte: {
    id: number
    name: string
    facebookAccountId: string
  }
  primary: {
    period: { from: string; to: string }
    data: {
      total_spend: number
      total_impressions: number
      total_reach: number
      total_clicks: number
      avg_ctr: number
      avg_cpc: number
      avg_cpm: number
      daily_data: Array<{
        date: string
        spend: number
        impressions: number
        reach: number
        clicks: number
        ctr: number
        cpc: number
        cpm: number
      }>
      data_availability: {
        total_days: number
        has_data: boolean
      }
    }
    summary: {
      total_spend: number
      total_impressions: number
      total_clicks: number
      avg_ctr: number
      avg_cpc: number
      performance_trend: 'improving' | 'declining' | 'stable'
    }
  }
  comparison?: {
    period: { from: string; to: string }
    data: {
      total_spend: number
      total_impressions: number
      total_reach: number
      total_clicks: number
      avg_ctr: number
      avg_cpc: number
      avg_cpm: number
      daily_data: Array<{ date: string; spend: number; impressions: number; reach: number; clicks: number; ctr: number; cpc: number; cpm: number }>
    }
    summary: {
      total_spend: number
      total_impressions: number
      total_clicks: number
      avg_ctr: number
      avg_cpc: number
      performance_trend: string
    }
    changes: {
      spend_change: number
      impressions_change: number
      clicks_change: number
      ctr_change: number
      cpc_change: number
    }
  }
}

interface SyncStatus {
  needsSync: boolean
  canDisplayData: boolean
  dataAnalysis: {
    primaryPeriod: { totalDays: number; availableDays: number; missingDays: string[]; dataExists: boolean }
    comparisonPeriod?: { totalDays: number; availableDays: number; missingDays: string[]; dataExists: boolean }
    needsSync: boolean
    canDisplayData: boolean
  } | null
  syncing: boolean
  progress: number
}

export default function FacebookAccountPage() {
  const { data: session } = useSession()
  
  // États pour les données
  const [data, setData] = useState<SmartAccountData | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    needsSync: false,
    canDisplayData: false,
    dataAnalysis: null,
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

  // Récupération des données du compte
  const loadAccountData = useCallback(async () => {
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

      const response = await fetch(`/api/facebook/data/smart-account?${params}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données')
      }

      const accountData = await response.json()
      setData(accountData)

    } catch (err) {
      console.error('Erreur chargement données:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données')
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode])

  // Surveillance du progrès de sync
  const pollSyncProgress = useCallback(() => {
    const interval = setInterval(() => {
      setSyncStatus(prev => {
        const newProgress = Math.min(prev.progress + 10, 100)
        if (newProgress >= 100) {
          clearInterval(interval)
          loadAccountData()
          return { ...prev, syncing: false, progress: 100 }
        }
        return { ...prev, progress: newProgress }
      })
    }, 1000)

    return interval
  }, [loadAccountData])

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
        level: 'account'
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
        dataAnalysis: syncResult.dataAnalysis,
        syncing: syncResult.dataAnalysis.needsSync,
        progress: 0
      })

      // 2. Si on peut afficher des données, les récupérer
      if (syncResult.dataAnalysis.canDisplayData) {
        await loadAccountData()
      }

      // 3. Si sync en cours, surveiller le progrès
      if (syncResult.dataAnalysis.needsSync) {
        pollSyncProgress()
      }

    } catch (err) {
      console.error('Erreur smart sync:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode, loadAccountData, pollSyncProgress])

  // Déclenchement du smart sync quand les paramètres changent
  useEffect(() => {
    if (selectedClient && dateRange.from && dateRange.to) {
      smartSyncAndLoadData()
    }
  }, [selectedClient, dateRange.from, dateRange.to, smartSyncAndLoadData])

  // Fonctions utilitaires
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value)
  }, [])

  const formatNumber = useCallback((value: number) => {
    return new Intl.NumberFormat('fr-CA').format(value)
  }, [])

  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }, [])

  const getChangeIcon = useCallback((change: number) => {
    if (change > 5) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < -5) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }, [])

  const formatChange = useCallback((change: number) => {
    const absChange = Math.abs(change)
    const sign = change >= 0 ? '+' : '-'
    return `${sign}${absChange.toFixed(1)}%`
  }, [])

  // Vérification des permissions
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
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - Account</h1>
          {data && (
            <Badge variant="secondary" className="ml-2">
              {data.compte.name}
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
            Veuillez sélectionner un compte client pour afficher les données Facebook Ads.
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
                <span className="text-sm font-medium">Synchronisation des données en cours...</span>
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
      {syncStatus.canDisplayData && !syncStatus.syncing && data && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Données affichées depuis la base locale. 
            {syncStatus.needsSync && " Synchronisation des données manquantes terminée."}
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques principales */}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Dépenses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.primary.data.total_spend || 0)}
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getChangeIcon(data.comparison.changes.spend_change)}
                    <span>{formatChange(data.comparison.changes.spend_change)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impressions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.primary.data.total_impressions || 0)}
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getChangeIcon(data.comparison.changes.impressions_change)}
                    <span>{formatChange(data.comparison.changes.impressions_change)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clics</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(data.primary.data.total_clicks || 0)}
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getChangeIcon(data.comparison.changes.clicks_change)}
                    <span>{formatChange(data.comparison.changes.clicks_change)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTR */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR Moyen</CardTitle>
                <div className="flex items-center gap-1">
                  {getTrendIcon(data.primary.summary.performance_trend)}
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(data.primary.data.avg_ctr || 0).toFixed(2)}%
                </div>
                {data.comparison && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getChangeIcon(data.comparison.changes.ctr_change)}
                    <span>{formatChange(data.comparison.changes.ctr_change)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tableau des données journalières */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Résumé par jour
                <Badge variant="outline">
                  {data.primary.data.daily_data?.length || 0} jours
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clics</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>CPM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.primary.data.daily_data?.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{formatCurrency(day.spend)}</TableCell>
                        <TableCell>{formatNumber(day.impressions)}</TableCell>
                        <TableCell>{formatNumber(day.clicks)}</TableCell>
                        <TableCell>{day.ctr.toFixed(2)}%</TableCell>
                        <TableCell>{formatCurrency(day.cpc)}</TableCell>
                        <TableCell>{formatCurrency(day.cpm)}</TableCell>
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
      {!data && selectedClient && dateRange.from && dateRange.to && !loading && !syncStatus.syncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune donnée disponible</h3>
              <p className="text-muted-foreground mb-4">
                Aucune donnée Facebook Ads trouvée pour la période sélectionnée.
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