'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ClientOption } from '@/components/ui/client-selector'
import { DateRange } from '@/components/ui/advanced-calendar'

interface FacebookAdsState {
  // Sélections utilisateur
  selectedClient: ClientOption | null
  dateRange: DateRange
  comparisonRange: DateRange | undefined
  comparisonMode: boolean
  
  // État des données
  lastReportData: unknown
  lastUpdateTime: string | null
}

interface FacebookAdsContextType {
  state: FacebookAdsState
  updateSelectedClient: (client: ClientOption | null) => void
  updateDateRange: (range: DateRange) => void
  updateComparisonRange: (range: DateRange | undefined) => void
  updateComparisonMode: (mode: boolean) => void
  updateReportData: (data: unknown) => void
  clearState: () => void
}

const defaultState: FacebookAdsState = {
  selectedClient: null,
  dateRange: { from: undefined, to: undefined },
  comparisonRange: undefined,
  comparisonMode: false,
  lastReportData: null,
  lastUpdateTime: null
}

const FacebookAdsContext = createContext<FacebookAdsContextType | undefined>(undefined)

export function FacebookAdsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FacebookAdsState>(defaultState)

  // MAITRE: Charger l'état depuis localStorage au démarrage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('facebook-ads-state')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        setState(prev => ({
          ...prev,
          ...parsedState,
          // Convertir les dates string en objets Date
          dateRange: {
            from: parsedState.dateRange?.from ? new Date(parsedState.dateRange.from) : undefined,
            to: parsedState.dateRange?.to ? new Date(parsedState.dateRange.to) : undefined
          },
          comparisonRange: parsedState.comparisonRange ? {
            from: parsedState.comparisonRange.from ? new Date(parsedState.comparisonRange.from) : undefined,
            to: parsedState.comparisonRange.to ? new Date(parsedState.comparisonRange.to) : undefined
          } : undefined
        }))
      }
    } catch (error) {
      console.error('Erreur chargement état Facebook Ads:', error)
    }
  }, [])

  // MAITRE: Sauvegarder l'état dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem('facebook-ads-state', JSON.stringify(state))
    } catch (error) {
      console.error('Erreur sauvegarde état Facebook Ads:', error)
    }
  }, [state])

  const updateSelectedClient = (client: ClientOption | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedClient: client,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateDateRange = (range: DateRange) => {
    setState(prev => ({ 
      ...prev, 
      dateRange: range,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateComparisonRange = (range: DateRange | undefined) => {
    setState(prev => ({ 
      ...prev, 
      comparisonRange: range,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateComparisonMode = (mode: boolean) => {
    setState(prev => ({ 
      ...prev, 
      comparisonMode: mode,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateReportData = (data: unknown) => {
    setState(prev => ({ 
      ...prev, 
      lastReportData: data,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const clearState = () => {
    setState(defaultState)
    localStorage.removeItem('facebook-ads-state')
  }

  return (
    <FacebookAdsContext.Provider value={{
      state,
      updateSelectedClient,
      updateDateRange,
      updateComparisonRange,
      updateComparisonMode,
      updateReportData,
      clearState
    }}>
      {children}
    </FacebookAdsContext.Provider>
  )
}

export function useFacebookAds() {
  const context = useContext(FacebookAdsContext)
  if (context === undefined) {
    throw new Error('useFacebookAds must be used within a FacebookAdsProvider')
  }
  return context
}