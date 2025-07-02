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
import { CalendarIcon, Facebook, Users, Target, Zap } from 'lucide-react'
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

export default function FacebookAdSetsPage() {
  const { data: session } = useSession()
  const [adsets, setAdsets] = useState<Array<{
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

  const loadAdSetsData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return

    try {
      const response = await fetch(
        `/api/facebook/data/adsets?from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`
      )
      
      if (response.ok) {
        const adsetsData = await response.json()
        setAdsets(adsetsData)
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
          level: 'adset'
        })
      })

      if (response.ok) {
        setSyncStatus('completed')
        loadAdSetsData()
      } else {
        setSyncStatus('failed')
      }
    } catch (error) {
      console.error('Erreur sync Facebook:', error)
      setSyncStatus('failed')
    }
  }, [session?.user?.id, dateRange.from, dateRange.to, loadAdSetsData])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - AdSets</h1>
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Moyenne</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    adsets.reduce((acc, a) => acc + (a.avg_cpc || 0), 0) / adsets.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground">CPC Moyen</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance des AdSets</CardTitle>
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
                        <TableCell>{adset.ads_count}</TableCell>
                      </TableRow>
                    ))}
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