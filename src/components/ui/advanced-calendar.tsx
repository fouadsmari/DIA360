"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isFuture, isToday, isSameDay } from "date-fns"
import { Calendar as CalendarIcon, ArrowLeftRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export interface AdvancedCalendarProps {
  dateRange: DateRange
  comparisonRange?: DateRange
  onDateRangeChange: (range: DateRange) => void
  onComparisonRangeChange?: (range: DateRange | undefined) => void
  comparisonMode?: boolean
  onComparisonModeChange?: (enabled: boolean) => void
  className?: string
}

const PRESET_RANGES = [
  {
    label: "Aujourd'hui",
    key: "today",
    getRange: () => {
      const today = new Date()
      return { from: today, to: today }
    }
  },
  {
    label: "Hier",
    key: "yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    }
  },
  {
    label: "7 derniers jours",
    key: "last7days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date()
    })
  },
  {
    label: "Cette semaine",
    key: "thisWeek",
    getRange: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 })
    })
  },
  {
    label: "Semaine dernière",
    key: "lastWeek",
    getRange: () => {
      const lastWeek = subDays(new Date(), 7)
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 })
      }
    }
  },
  {
    label: "30 derniers jours",
    key: "last30days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date()
    })
  },
  {
    label: "Ce mois",
    key: "thisMonth",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    label: "Mois dernier",
    key: "lastMonth",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      }
    }
  },
  {
    label: "Mois d'avant",
    key: "twoMonthsAgo",
    getRange: () => {
      const twoMonthsAgo = subMonths(new Date(), 2)
      return {
        from: startOfMonth(twoMonthsAgo),
        to: endOfMonth(twoMonthsAgo)
      }
    }
  }
]

export function AdvancedCalendar({
  dateRange,
  comparisonRange,
  onDateRangeChange,
  onComparisonRangeChange,
  comparisonMode = false,
  onComparisonModeChange,
  className
}: AdvancedCalendarProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'primary' | 'comparison'>('primary')
  const [customMode, setCustomMode] = useState(false)

  const handlePresetSelect = useCallback((preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getRange()
    
    if (activeTab === 'primary') {
      onDateRangeChange(range)
    } else if (activeTab === 'comparison' && onComparisonRangeChange) {
      onComparisonRangeChange(range)
    }
    
    setCustomMode(false)
  }, [activeTab, onDateRangeChange, onComparisonRangeChange])

  const handleComparisonToggle = useCallback((enabled: boolean) => {
    if (onComparisonModeChange) {
      onComparisonModeChange(enabled)
      if (!enabled && onComparisonRangeChange) {
        onComparisonRangeChange(undefined)
      }
    }
  }, [onComparisonModeChange, onComparisonRangeChange])

  const formatDateRangeDisplay = useCallback((range: DateRange) => {
    if (!range.from) return "Sélectionner une période"
    
    if (range.to && range.from.getTime() !== range.to.getTime()) {
      return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`
    }
    
    return format(range.from, "dd/MM/yyyy")
  }, [])

  const getDisplayText = useCallback(() => {
    const primaryText = formatDateRangeDisplay(dateRange)
    
    if (comparisonMode && comparisonRange && comparisonRange.from) {
      const comparisonText = formatDateRangeDisplay(comparisonRange)
      return (
        <div className="flex flex-col">
          <span className="text-blue-600">{primaryText}</span>
          <span className="text-orange-600 text-sm flex items-center gap-1">
            <ArrowLeftRight className="h-3 w-3" />
            vs {comparisonText}
          </span>
        </div>
      )
    }
    
    return primaryText
  }, [dateRange, comparisonRange, comparisonMode, formatDateRangeDisplay])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant="outline"
            className={cn(
              "w-[350px] justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets Sidebar */}
            <div className="w-64 border-r">
              <div className="p-4 space-y-3">
                {/* Comparison Mode Toggle */}
                {onComparisonModeChange && (
                  <div className="flex items-center space-x-2 pb-3 border-b">
                    <Checkbox
                      id="comparison-mode"
                      checked={comparisonMode}
                      onCheckedChange={handleComparisonToggle}
                    />
                    <label
                      htmlFor="comparison-mode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mode comparaison
                    </label>
                  </div>
                )}

                {/* Period Selection Tabs */}
                {comparisonMode && (
                  <div className="flex gap-1 p-1 bg-muted rounded-md">
                    <Button
                      variant={activeTab === 'primary' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setActiveTab('primary')}
                    >
                      Période 1
                    </Button>
                    <Button
                      variant={activeTab === 'comparison' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setActiveTab('comparison')}
                    >
                      Période 2
                    </Button>
                  </div>
                )}

                {/* Preset Ranges */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium mb-2">Périodes prédéfinies</h4>
                  {PRESET_RANGES.map((preset) => (
                    <Button
                      key={preset.key}
                      variant="ghost"
                      className="w-full justify-start text-sm h-8"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <Separator />

                {/* Custom Range Toggle */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-8"
                  onClick={() => setCustomMode(true)}
                >
                  Période personnalisée
                </Button>
              </div>
            </div>

            {/* Calendar */}
            {customMode && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium">
                    {comparisonMode 
                      ? `Sélectionner ${activeTab === 'primary' ? 'la première' : 'la seconde'} période`
                      : 'Sélectionner une période'
                    }
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomMode(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={activeTab === 'primary' ? dateRange.from : comparisonRange?.from}
                  selected={activeTab === 'primary' 
                    ? { from: dateRange.from, to: dateRange.to }
                    : { from: comparisonRange?.from, to: comparisonRange?.to }
                  }
                  onSelect={(range) => {
                    const newRange = range ? { from: range.from, to: range.to } : { from: undefined, to: undefined }
                    
                    if (activeTab === 'primary') {
                      onDateRangeChange(newRange)
                    } else if (onComparisonRangeChange) {
                      onComparisonRangeChange(newRange)
                    }
                  }}
                  numberOfMonths={2}
                  disabled={(date) => isFuture(date)}
                  modifiers={{
                    today: isToday,
                    selected: (date) => {
                      const currentRange = activeTab === 'primary' 
                        ? { from: dateRange.from, to: dateRange.to }
                        : { from: comparisonRange?.from, to: comparisonRange?.to }
                      
                      if (!currentRange.from) return false
                      
                      if (currentRange.to) {
                        return date >= currentRange.from && date <= currentRange.to
                      }
                      
                      return isSameDay(date, currentRange.from)
                    }
                  }}
                  modifiersStyles={{
                    selected: {
                      backgroundColor: activeTab === 'primary' ? '#3b82f6' : '#f97316',
                      color: 'white'
                    },
                    today: {
                      fontWeight: 'bold',
                      textDecoration: 'underline'
                    }
                  }}
                />
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(false)
                      setCustomMode(false)
                    }}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Comparison Range Display */}
      {comparisonMode && comparisonRange && comparisonRange.from && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeftRight className="h-4 w-4" />
          <span>
            Comparé avec: {formatDateRangeDisplay(comparisonRange)}
          </span>
          {onComparisonRangeChange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComparisonRangeChange(undefined)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}