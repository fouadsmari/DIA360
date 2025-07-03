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
import { AdvancedCalendar } from '@/components/ui/advanced-calendar'
import { ClientSelector } from '@/components/ui/client-selector'
import { ColumnSelector, ColumnConfig, ColumnTemplate } from '@/components/ui/column-selector'
import { useFacebookAds } from '@/contexts/FacebookAdsContext'

interface AdData {
  // IDs et hiérarchie
  ad_id: string
  ad_name: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  account_id: string
  
  // Métriques principales
  impressions: number
  reach: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  frequency: number
  unique_clicks: number
  
  // Métriques avancées
  inline_link_clicks: number
  inline_post_engagement: number
  website_ctr: number
  cost_per_inline_link_click: number
  cost_per_unique_click: number
  
  // Statut et qualité
  sync_status: string
  data_quality_score: number
  
  // Dates
  date_start: string
  date_stop: string
  
  // Actions (JSON)
  actions?: string
  action_values?: string
  unique_actions?: string
}

interface SyncStatus {
  needsSync: boolean
  canDisplayData: boolean
  syncing: boolean
  progress: number
}

export default function FacebookAdsPage() {
  const { data: session } = useSession()
  const { 
    state, 
    updateSelectedClient, 
    updateDateRange, 
    updateComparisonRange, 
    updateComparisonMode,
    updateReportData,
    updateAdsData,
    updateErrorState,
    updateLoadingState,
    updateSelectedColumnTemplate,
    updateCustomColumnsConfig
  } = useFacebookAds()
  
  // MAITRE: États pour les données - FORCE RESET des données incorrectes + déduplication
  const [ads, setAds] = useState<AdData[]>([])
  
  // MAITRE: Fonction de déduplication des données en cas de doublons
  const deduplicateAds = (adsData: AdData[]) => {
    const seen = new Set<string>()
    return adsData.filter(ad => {
      const key = `${ad.ad_id}_${ad.date_start}_${ad.date_stop}`
      if (seen.has(key)) {
        console.warn('🔄 Doublon détecté et supprimé:', key)
        return false
      }
      seen.add(key)
      return true
    })
  }
  const [syncStatus] = useState<SyncStatus>({
    needsSync: false,
    canDisplayData: false,
    syncing: false,
    progress: 0
  })
  
  // MAITRE: États pour l'UI - maintenant avec persistance
  const [loading, setLoading] = useState(state.lastLoadingState || false)
  const [error, setError] = useState<string | null>(state.lastError || null)
  
  // MAITRE: États pour la configuration des colonnes - avec persistance
  const [columns, setColumns] = useState<ColumnConfig[]>(
    state.customColumnsConfig as ColumnConfig[] || [
      { key: 'ad_name', label: 'Nom Publicité', visible: true },
      { key: 'adset_name', label: 'AdSet', visible: true },
      { key: 'campaign_name', label: 'Campagne', visible: true },
      { key: 'sync_status', label: 'Statut', visible: true },
      { key: 'performance', label: 'Performance', visible: true },
      { key: 'spend', label: 'Dépenses', visible: true },
      { key: 'impressions', label: 'Impressions', visible: true },
      { key: 'clicks', label: 'Clics', visible: true },
      { key: 'ctr', label: 'CTR', visible: true },
      { key: 'cpc', label: 'CPC', visible: true }
    ]
  )
  const [selectedTemplate, setSelectedTemplate] = useState<ColumnTemplate | undefined>(
    state.selectedColumnTemplate ? {
      id: state.selectedColumnTemplate.id,
      template_name: state.selectedColumnTemplate.template_name,
      is_default: false,
      is_shared: false,
      visible_columns: [],
      column_order: []
    } as ColumnTemplate : undefined
  )

  // MAITRE: Utiliser l'état persisté du contexte
  const selectedClient = state.selectedClient
  const dateRange = state.dateRange
  const comparisonRange = state.comparisonRange
  const comparisonMode = state.comparisonMode

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

      // MAITRE: Utiliser les données mappées depuis Facebook API + déduplication
      const adsData = result.data || []
      const cleanedAds = deduplicateAds(adsData)
      console.log(`🧹 Données nettoyées: ${adsData.length} → ${cleanedAds.length} (${adsData.length - cleanedAds.length} doublons supprimés)`)
      
      // MAITRE: Debug valeurs pour diagnostiquer problèmes
      if (cleanedAds.length > 0) {
        const firstAd = cleanedAds[0]
        console.log('🔍 Première publicité pour diagnostic:', {
          ad_name: firstAd.ad_name,
          spend: firstAd.spend,
          impressions: firstAd.impressions,
          clicks: firstAd.clicks,
          ctr: firstAd.ctr,
          cpc: firstAd.cpc,
          calculated_ctr: firstAd.impressions > 0 ? (firstAd.clicks / firstAd.impressions * 100).toFixed(2) : 0,
          calculated_cpc: firstAd.clicks > 0 ? (firstAd.spend / firstAd.clicks).toFixed(2) : 0
        })
      }
      
      setAds(cleanedAds)
      
      if (cleanedAds.length === 0) {
        console.log('📭 MAITRE: Aucune publicité retournée après nettoyage')
        
        // Si pas de données et source était Facebook API, il n'y a vraiment rien
        if (result.source === 'facebook_api') {
          const errorMsg = 'Aucune publicité trouvée pour cette période - vérifiez votre compte Facebook et vos clés API'
          setError(errorMsg)
          updateErrorState(errorMsg)
        }
        // Si pas de données et source était cache local, on peut essayer smart-sync
        else if (result.source === 'local_cache' || result.cache_hit) {
          const errorMsg = 'Pas de données en cache local pour cette période'
          setError(errorMsg)
          updateErrorState(errorMsg)
        }
      } else {
        setError(null) // Réinitialiser l'erreur si on a des données
        updateErrorState(null)
        console.log(`✅ MAITRE: ${cleanedAds.length} publicités chargées depuis ${result.source || 'source inconnue'}`)
        
        // MAITRE: Sauvegarder les données NETTOYÉES dans le contexte pour persistance
        updateReportData(cleanedAds)
        updateAdsData(cleanedAds)
      }

    } catch (err) {
      console.error('Erreur chargement publicités:', err)
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors du chargement des publicités'
      setError(errorMsg)
      updateErrorState(errorMsg)
    }
  }, [selectedClient, dateRange, comparisonRange, comparisonMode, updateReportData, updateAdsData, updateErrorState])

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
    updateLoadingState(true)
    setError(null)
    updateErrorState(null)

    try {
      // 1. MAITRE: Essayer d'abord le cache local directement
      console.log('💾 MAITRE: Tentative cache local d\'abord')
      await loadAdsData()
      
      // Si on a des données, pas besoin de smart-sync
      // loadAdsData va nous dire si c'est du cache ou Facebook API

    } catch (err) {
      console.error('Erreur chargement publicités:', err)
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMsg)
      updateErrorState(errorMsg)
    } finally {
      setLoading(false)
      updateLoadingState(false)
    }
  }, [selectedClient, dateRange, loadAdsData, updateLoadingState, updateErrorState])

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

  // MAITRE: Récupérer les données persistées au chargement initial
  useEffect(() => {
    if (state.adsData && state.adsData.length > 0) {
      console.log('🔄 MAITRE: Récupération données persistées:', state.adsData.length, 'ads')
      setAds(state.adsData as AdData[])
      setError(state.lastError)
      setLoading(state.lastLoadingState)
    }
  }, [state.adsData, state.lastError, state.lastLoadingState])

  // URGENT: DÉSACTIVER APPELS AUTOMATIQUES FACEBOOK
  // Déclenchement MANUEL uniquement pour éviter boucle infinie d'appels API
  // useEffect(() => {
  //   if (selectedClient && dateRange.from && dateRange.to) {
  //     // Si on n'a pas de données persistées pour ce client/période, charger
  //     if (!state.adsData || state.adsData.length === 0) {
  //       console.log('📥 MAITRE: Pas de données persistées, chargement depuis API')
  //       smartSyncAndLoadData()
  //     } else {
  //       console.log('✅ MAITRE: Utilisation données persistées existantes')
  //     }
  //   }
  // }, [selectedClient, dateRange.from, dateRange.to, smartSyncAndLoadData, state.adsData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-CA').format(value)
  }

  // MAITRE: Calculs totaux/moyennes pour ligne de total
  const calculateColumnTotal = (columnKey: string, ads: AdData[]) => {
    if (ads.length === 0) return 0

    switch (columnKey) {
      // Totaux (somme)
      case 'spend':
      case 'impressions':
      case 'clicks':
      case 'reach':
      case 'unique_clicks':
      case 'inline_link_clicks':
      case 'inline_post_engagement':
        return ads.reduce((sum, ad) => sum + (ad[columnKey as keyof AdData] as number || 0), 0)

      // Moyennes pondérées
      case 'ctr':
        const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0)
        const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
        return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      case 'cpc':
        const totalSpend = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
        const totalClicksForCpc = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0)
        return totalClicksForCpc > 0 ? totalSpend / totalClicksForCpc : 0

      case 'cpm':
        const totalSpendForCpm = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
        const totalImpressionsForCpm = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
        return totalImpressionsForCpm > 0 ? (totalSpendForCpm / totalImpressionsForCpm) * 1000 : 0

      case 'frequency':
        const totalImpressionsForFreq = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
        const totalReachForFreq = ads.reduce((sum, ad) => sum + (ad.reach || 0), 0)
        return totalReachForFreq > 0 ? totalImpressionsForFreq / totalReachForFreq : 0

      case 'website_ctr':
        const totalInlineClicks = ads.reduce((sum, ad) => sum + (ad.inline_link_clicks || 0), 0)
        const totalImpressionsForWebCtr = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
        return totalImpressionsForWebCtr > 0 ? (totalInlineClicks / totalImpressionsForWebCtr) * 100 : 0

      case 'cost_per_inline_link_click':
        const totalSpendForInlineClick = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
        const totalInlineClicksForCost = ads.reduce((sum, ad) => sum + (ad.inline_link_clicks || 0), 0)
        return totalInlineClicksForCost > 0 ? totalSpendForInlineClick / totalInlineClicksForCost : 0

      case 'cost_per_unique_click':
        const totalSpendForUniqueClick = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
        const totalUniqueClicks = ads.reduce((sum, ad) => sum + (ad.unique_clicks || 0), 0)
        return totalUniqueClicks > 0 ? totalSpendForUniqueClick / totalUniqueClicks : 0

      // Actions - somme des valeurs depuis JSON
      default:
        if (columnKey.startsWith('actions_')) {
          const actionType = columnKey.replace('actions_', '')
          return ads.reduce((sum, ad) => {
            try {
              const actions = ad.actions ? JSON.parse(ad.actions) : []
              const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
              return sum + (action?.value || 0)
            } catch {
              return sum
            }
          }, 0)
        }

        if (columnKey.startsWith('action_values_')) {
          const actionType = columnKey.replace('action_values_', '')
          return ads.reduce((sum, ad) => {
            try {
              const actionValues = ad.action_values ? JSON.parse(ad.action_values) : []
              const actionValue = actionValues.find((a: { action_type: string; value: string }) => a.action_type === actionType)
              return sum + parseFloat(actionValue?.value || '0')
            } catch {
              return sum
            }
          }, 0)
        }

        if (columnKey.startsWith('unique_actions_')) {
          const actionType = columnKey.replace('unique_actions_', '')
          return ads.reduce((sum, ad) => {
            try {
              const uniqueActions = ad.unique_actions ? JSON.parse(ad.unique_actions) : []
              const uniqueAction = uniqueActions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
              return sum + (uniqueAction?.value || 0)
            } catch {
              return sum
            }
          }, 0)
        }

        // MAITRE: Calculs ROAS
        if (columnKey.startsWith('roas_')) {
          const actionType = columnKey.replace('roas_', '')
          const totalSpendForRoas = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
          const totalRevenue = ads.reduce((sum, ad) => {
            try {
              const actionValues = ad.action_values ? JSON.parse(ad.action_values) : []
              const actionValue = actionValues.find((a: { action_type: string; value: string }) => a.action_type === actionType)
              return sum + parseFloat(actionValue?.value || '0')
            } catch {
              return sum
            }
          }, 0)
          return totalSpendForRoas > 0 ? totalRevenue / totalSpendForRoas : 0
        }

        // MAITRE: Calculs coûts par action
        if (columnKey.startsWith('cost_per_')) {
          const actionType = columnKey.replace('cost_per_', '')
          const totalSpendForCost = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0)
          const totalActions = ads.reduce((sum, ad) => {
            try {
              const actions = ad.actions ? JSON.parse(ad.actions) : []
              const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
              return sum + (action?.value || 0)
            } catch {
              return sum
            }
          }, 0)
          return totalActions > 0 ? totalSpendForCost / totalActions : 0
        }

        // MAITRE: Taux de conversion
        if (columnKey.startsWith('conversion_rate_')) {
          const actionType = columnKey.replace('conversion_rate_', '')
          const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0)
          const totalConversions = ads.reduce((sum, ad) => {
            try {
              const actions = ad.actions ? JSON.parse(ad.actions) : []
              const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
              return sum + (action?.value || 0)
            } catch {
              return sum
            }
          }, 0)
          return totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
        }

        return 0
    }
  }

  const formatTotalValue = (columnKey: string, value: number) => {
    // Colonnes de pourcentage
    if (columnKey.includes('ctr') || columnKey.includes('conversion_rate') || columnKey === 'roi_total') {
      return `${value.toFixed(2)}%`
    }
    
    // Colonnes de valeurs monétaires
    if (columnKey.includes('spend') || columnKey.includes('cost_') || columnKey.includes('cpc') || 
        columnKey.includes('cpm') || columnKey.includes('action_values_')) {
      return formatCurrency(value)
    }

    // ROAS 
    if (columnKey.startsWith('roas_')) {
      return `${value.toFixed(2)}x`
    }

    // Autres métriques (nombres entiers)
    return formatNumber(Math.round(value))
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
            onClientChange={updateSelectedClient}
            placeholder="Sélectionner un compte client..."
          />

          {/* Calendrier avancé */}
          <AdvancedCalendar
            dateRange={dateRange}
            comparisonRange={comparisonRange}
            onDateRangeChange={updateDateRange}
            onComparisonRangeChange={updateComparisonRange}
            comparisonMode={comparisonMode}
            onComparisonModeChange={updateComparisonMode}
          />

          {/* Sélecteur de colonnes */}
          <ColumnSelector
            columns={columns}
            selectedTemplate={selectedTemplate}
            onColumnsChange={(newColumns) => {
              setColumns(newColumns)
              updateCustomColumnsConfig(newColumns)
            }}
            onTemplateChange={(template) => {
              setSelectedTemplate(template)
              if (template) {
                updateSelectedColumnTemplate({
                  id: template.id,
                  template_name: template.template_name
                })
              } else {
                updateSelectedColumnTemplate(null)
              }
            }}
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
                  {ads.filter(a => a.sync_status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ads.length > 0 
                    ? ((ads.filter(a => a.sync_status === 'active').length / ads.length) * 100).toFixed(0)
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
                      {columns.filter(col => col.visible).map((column) => (
                        <TableHead key={column.key} style={{ width: column.width }}>
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => {
                      const performance = getPerformanceLevel(ad.ctr || 0, ad.cpc || 0)
                      return (
                        <TableRow key={ad.ad_id}>
                          {columns.filter(col => col.visible).map((column) => (
                            <TableCell key={column.key} style={{ width: column.width }}>
                              {/* Colonnes de base */}
                              {column.key === 'ad_name' && (
                                <span className="font-medium max-w-[200px] truncate block">
                                  {ad.ad_name || 'N/A'}
                                </span>
                              )}
                              {column.key === 'adset_name' && (
                                <span className="max-w-[150px] truncate block">
                                  {ad.adset_name || 'N/A'}
                                </span>
                              )}
                              {column.key === 'campaign_name' && (
                                <span className="max-w-[150px] truncate block">
                                  {ad.campaign_name || 'N/A'}
                                </span>
                              )}
                              {column.key === 'adset_id' && (
                                <span className="max-w-[150px] truncate block">
                                  {ad.adset_id || 'N/A'}
                                </span>
                              )}
                              {column.key === 'campaign_id' && (
                                <span className="max-w-[150px] truncate block">
                                  {ad.campaign_id || 'N/A'}
                                </span>
                              )}
                              {column.key === 'account_id' && (
                                <span className="text-xs text-muted-foreground">
                                  {ad.account_id || 'N/A'}
                                </span>
                              )}
                              {column.key === 'sync_status' && (
                                <span className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                  ad.sync_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                )}>
                                  {ad.sync_status}
                                </span>
                              )}
                              {column.key === 'performance' && (
                                <Badge className={performance.color}>
                                  {performance.label}
                                </Badge>
                              )}
                              
                              {/* Métriques principales */}
                              {column.key === 'spend' && formatCurrency(ad.spend || 0)}
                              {column.key === 'impressions' && formatNumber(ad.impressions || 0)}
                              {column.key === 'clicks' && formatNumber(ad.clicks || 0)}
                              {column.key === 'ctr' && `${(ad.ctr || 0).toFixed(2)}%`}
                              {column.key === 'cpc' && formatCurrency(ad.cpc || 0)}
                              
                              {/* Métriques supplémentaires */}
                              {column.key === 'cpm' && formatCurrency(ad.cpm || 0)}
                              {column.key === 'reach' && formatNumber(ad.reach || 0)}
                              {column.key === 'frequency' && (ad.frequency || 0).toFixed(2)}
                              {column.key === 'unique_clicks' && formatNumber(ad.unique_clicks || 0)}
                              {column.key === 'inline_link_clicks' && formatNumber(ad.inline_link_clicks || 0)}
                              {column.key === 'website_ctr' && `${(ad.website_ctr || 0).toFixed(2)}%`}
                              {column.key === 'cost_per_inline_link_click' && formatCurrency(ad.cost_per_inline_link_click || 0)}
                              {column.key === 'cost_per_unique_click' && formatCurrency(ad.cost_per_unique_click || 0)}
                              {column.key === 'inline_post_engagement' && formatNumber(ad.inline_post_engagement || 0)}
                              
                              {/* Actions - extraites du JSON actions */}
                              {column.key.startsWith('actions_') && (
                                <span className="text-sm">
                                  {(() => {
                                    try {
                                      const actions = ad.actions ? JSON.parse(ad.actions) : []
                                      const actionType = column.key.replace('actions_', '')
                                      const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
                                      return formatNumber(action?.value || 0)
                                    } catch {
                                      return '0'
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* Valeurs des actions */}
                              {column.key.startsWith('action_values_') && (
                                <span className="text-sm">
                                  {(() => {
                                    try {
                                      const actionValues = ad.action_values ? JSON.parse(ad.action_values) : []
                                      const actionType = column.key.replace('action_values_', '')
                                      const actionValue = actionValues.find((a: { action_type: string; value: string }) => a.action_type === actionType)
                                      return formatCurrency(parseFloat(actionValue?.value || '0'))
                                    } catch {
                                      return formatCurrency(0)
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* Actions uniques */}
                              {column.key.startsWith('unique_actions_') && (
                                <span className="text-sm">
                                  {(() => {
                                    try {
                                      const uniqueActions = ad.unique_actions ? JSON.parse(ad.unique_actions) : []
                                      const actionType = column.key.replace('unique_actions_', '')
                                      const uniqueAction = uniqueActions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
                                      return formatNumber(uniqueAction?.value || 0)
                                    } catch {
                                      return '0'
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* MAITRE: Calculs ROAS */}
                              {column.key.startsWith('roas_') && (
                                <span className="text-sm font-semibold text-green-600">
                                  {(() => {
                                    const actionType = column.key.replace('roas_', '')
                                    const spend = ad.spend || 0
                                    try {
                                      const actionValues = ad.action_values ? JSON.parse(ad.action_values) : []
                                      const actionValue = actionValues.find((a: { action_type: string; value: string }) => a.action_type === actionType)
                                      const revenue = parseFloat(actionValue?.value || '0')
                                      const roas = spend > 0 ? revenue / spend : 0
                                      return `${roas.toFixed(2)}x`
                                    } catch {
                                      return '0.00x'
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* MAITRE: Calculs coûts par action */}
                              {column.key.startsWith('cost_per_') && (
                                <span className="text-sm">
                                  {(() => {
                                    const actionType = column.key.replace('cost_per_', '')
                                    const spend = ad.spend || 0
                                    try {
                                      const actions = ad.actions ? JSON.parse(ad.actions) : []
                                      const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
                                      const actionCount = action?.value || 0
                                      const cost = actionCount > 0 ? spend / actionCount : 0
                                      return formatCurrency(cost)
                                    } catch {
                                      return formatCurrency(0)
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* MAITRE: Taux de conversion */}
                              {column.key.startsWith('conversion_rate_') && (
                                <span className="text-sm">
                                  {(() => {
                                    const actionType = column.key.replace('conversion_rate_', '')
                                    const clicks = ad.clicks || 0
                                    try {
                                      const actions = ad.actions ? JSON.parse(ad.actions) : []
                                      const action = actions.find((a: { action_type: string; value: number }) => a.action_type === actionType)
                                      const conversions = action?.value || 0
                                      const rate = clicks > 0 ? (conversions / clicks) * 100 : 0
                                      return `${rate.toFixed(2)}%`
                                    } catch {
                                      return '0.00%'
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* ROI Total */}
                              {column.key === 'roi_total' && (
                                <span className="text-sm font-semibold text-blue-600">
                                  {(() => {
                                    const spend = ad.spend || 0
                                    try {
                                      const actionValues = ad.action_values ? JSON.parse(ad.action_values) : []
                                      const totalRevenue = actionValues.reduce((sum: number, av: { value: string }) => 
                                        sum + parseFloat(av.value || '0'), 0)
                                      const roi = spend > 0 ? ((totalRevenue - spend) / spend) * 100 : 0
                                      return `${roi.toFixed(1)}%`
                                    } catch {
                                      return '0.0%'
                                    }
                                  })()}
                                </span>
                              )}
                              
                              {/* Autres métriques */}
                              {column.key === 'data_quality_score' && (
                                <span className="text-sm text-muted-foreground">
                                  {ad.data_quality_score || 'N/A'}
                                </span>
                              )}
                              {column.key === 'date_start' && (
                                <span className="text-xs text-muted-foreground">
                                  {ad.date_start || 'N/A'}
                                </span>
                              )}
                              {column.key === 'date_stop' && (
                                <span className="text-xs text-muted-foreground">
                                  {ad.date_stop || 'N/A'}
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                    
                    {/* MAITRE: Ligne de totaux/moyennes */}
                    {ads.length > 0 && (
                      <TableRow className="bg-gray-50 font-medium border-t-2 border-gray-200">
                        {columns.filter(col => col.visible).map((column) => (
                          <TableCell key={`total-${column.key}`} style={{ width: column.width }} className="font-semibold">
                            {column.key === 'ad_name' && (
                              <span className="text-sm font-bold text-gray-700">
                                TOTAL / MOYEN ({ads.length} ads)
                              </span>
                            )}
                            {column.key !== 'ad_name' && 
                             column.key !== 'adset_name' && 
                             column.key !== 'campaign_name' &&
                             column.key !== 'adset_id' && 
                             column.key !== 'campaign_id' && 
                             column.key !== 'account_id' &&
                             column.key !== 'sync_status' && 
                             column.key !== 'performance' &&
                             column.key !== 'data_quality_score' &&
                             column.key !== 'date_start' &&
                             column.key !== 'date_stop' && (
                              <span className="text-sm font-semibold text-gray-800">
                                {formatTotalValue(column.key, calculateColumnTotal(column.key, ads))}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
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