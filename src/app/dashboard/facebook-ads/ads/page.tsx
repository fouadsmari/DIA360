'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon, Facebook, Image, Play, FileText } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function FacebookAdsPage() {
  const { data: session } = useSession()
  const [ads, setAds] = useState<Array<{
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
  }>>([])
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>('idle')
  const [syncProgress] = useState(0)

  const loadAdsData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return

    try {
      const response = await fetch(
        `/api/facebook/data/ads?from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`
      )
      
      if (response.ok) {
        const adsData = await response.json()
        setAds(adsData)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }, [dateRange.from, dateRange.to])

  const checkAndSyncData = useCallback(async () => {
    if (!session?.user?.id || !dateRange.from || !dateRange.to) return

    setSyncStatus('syncing')
    
    try {
      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd'),
          level: 'ad'
        })
      })

      if (response.ok) {
        setSyncStatus('completed')
        loadAdsData()
      } else {
        setSyncStatus('failed')
      }
    } catch (error) {
      console.error('Erreur sync Facebook:', error)
      setSyncStatus('failed')
    }
  }, [session?.user?.id, dateRange.from, dateRange.to, loadAdsData])

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      checkAndSyncData()
    }
  }, [dateRange.from, dateRange.to, checkAndSyncData])

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
      // eslint-disable-next-line jsx-a11y/alt-text
      case 'image': return <Image className="h-4 w-4" />
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - Ads</h1>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "PPP", { locale: fr })} -{" "}
                    {format(dateRange.to, "PPP", { locale: fr })}
                  </>
                ) : (
                  format(dateRange.from, "PPP", { locale: fr })
                )
              ) : (
                <span>Sélectionner une période</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange(range ? { from: range.from, to: range.to } : { from: undefined, to: undefined })}
              numberOfMonths={2}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      {syncStatus === 'syncing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Synchronisation en cours...</p>
              <Progress value={syncProgress} />
              <p className="text-xs text-muted-foreground">{syncProgress}% complété</p>
            </div>
          </CardContent>
        </Card>
      )}

      {ads.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ads</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ads.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ads Actives</CardTitle>
                <Badge className="bg-green-500">
                  {ads.filter(a => a.status === 'ACTIVE').length}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {((ads.filter(a => a.status === 'ACTIVE').length / ads.length) * 100).toFixed(0)}% du total
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Excellente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ads.filter(a => getPerformanceLevel(a.ctr || 0, a.cpc || 0).label === 'Excellent').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC Moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    ads.reduce((acc, a) => acc + (a.cpc || 0), 0) / ads.length
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Détaillée des Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom Ad</TableHead>
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
    </div>
  )
}