'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
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
import { CalendarIcon, Facebook, DollarSign, Eye, MousePointer } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface AccountData {
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
}

export default function FacebookAccountPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<AccountData | null>(null)
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>('idle')
  const [syncProgress] = useState(0)

  const checkAndSyncData = async () => {
    if (!session?.user?.id || !dateRange.from || !dateRange.to) return

    setSyncStatus('syncing')
    
    try {
      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd'),
          level: 'account'
        })
      })

      if (response.ok) {
        setSyncStatus('completed')
        loadAccountData()
      } else {
        setSyncStatus('failed')
      }
    } catch (error) {
      console.error('Erreur sync Facebook:', error)
      setSyncStatus('failed')
    }
  }

  const loadAccountData = async () => {
    if (!dateRange.from || !dateRange.to) return

    try {
      const response = await fetch(
        `/api/facebook/data/account?from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`
      )
      
      if (response.ok) {
        const accountData = await response.json()
        setData(accountData)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      checkAndSyncData()
    }
  }, [dateRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-CA').format(value)
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
          <h1 className="text-3xl font-bold tracking-tight">Facebook Ads - Account</h1>
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
              onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
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
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{syncProgress}% complété</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.total_spend || 0)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.total_impressions || 0)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clics</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.total_clicks || 0)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR Moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(data.avg_ctr || 0).toFixed(2)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Résumé par jour</CardTitle>
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
                    {data.daily_data?.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{format(new Date(day.date), 'dd/MM/yyyy')}</TableCell>
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
    </div>
  )
}