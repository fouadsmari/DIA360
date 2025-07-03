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
  
  // État des données (MAITRE: Persister les données entre pages)
  adsData: unknown[]
  campaignsData: unknown[]
  adsetsData: unknown[]
  accountData: unknown
  lastReportData: unknown
  lastUpdateTime: string | null
  dataVersion?: string // Version pour migration automatique des données
  
  // État UI persisté
  lastError: string | null
  lastLoadingState: boolean
  
  // MAITRE: Configuration colonnes persistée
  selectedColumnTemplate: { id?: number; template_name: string } | null
  customColumnsConfig: unknown[]
}

interface FacebookAdsContextType {
  state: FacebookAdsState
  updateSelectedClient: (client: ClientOption | null) => void
  updateDateRange: (range: DateRange) => void
  updateComparisonRange: (range: DateRange | undefined) => void
  updateComparisonMode: (mode: boolean) => void
  updateReportData: (data: unknown) => void
  // MAITRE: Nouvelles fonctions pour persistance données
  updateAdsData: (data: unknown[]) => void
  updateCampaignsData: (data: unknown[]) => void
  updateAdsetsData: (data: unknown[]) => void
  updateAccountData: (data: unknown) => void
  updateErrorState: (error: string | null) => void
  updateLoadingState: (loading: boolean) => void
  // MAITRE: Persistance configuration colonnes
  updateSelectedColumnTemplate: (template: { id?: number; template_name: string } | null) => void
  updateCustomColumnsConfig: (config: unknown[]) => void
  clearState: () => void
  resetAllData: () => void
}

const defaultState: FacebookAdsState = {
  selectedClient: null,
  dateRange: { from: undefined, to: undefined },
  comparisonRange: undefined,
  comparisonMode: false,
  
  // MAITRE: Données persistées
  adsData: [],
  dataVersion: '2025-07-03-daily-v2', // Version pour gérer migration données + breakdowns
  campaignsData: [],
  adsetsData: [],
  accountData: null,
  lastReportData: null,
  lastUpdateTime: null,
  
  // État UI
  lastError: null,
  lastLoadingState: false,
  
  // MAITRE: Configuration colonnes
  selectedColumnTemplate: null,
  customColumnsConfig: []
}

const FacebookAdsContext = createContext<FacebookAdsContextType | undefined>(undefined)

export function FacebookAdsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FacebookAdsState>(defaultState)

  // MAITRE: Charger l'état depuis localStorage au démarrage avec vérification version
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('facebook-ads-state')
      const currentVersion = '2025-07-03-daily-v2' // Version pour forcer refresh données monthly + breakdowns
      
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        
        // MAITRE: Vérifier si données sont de l'ancienne version (monthly)
        if (parsedState.dataVersion !== currentVersion) {
          console.log('🔄 MAITRE: Ancienne version détectée, reset automatique des données Facebook')
          // Garder les préférences utilisateur mais vider les données
          const cleanState = {
            ...defaultState,
            selectedClient: parsedState.selectedClient || null,
            dateRange: {
              from: parsedState.dateRange?.from ? new Date(parsedState.dateRange.from) : undefined,
              to: parsedState.dateRange?.to ? new Date(parsedState.dateRange.to) : undefined
            },
            comparisonRange: parsedState.comparisonRange ? {
              from: parsedState.comparisonRange.from ? new Date(parsedState.comparisonRange.from) : undefined,
              to: parsedState.comparisonRange.to ? new Date(parsedState.comparisonRange.to) : undefined
            } : undefined,
            selectedColumnTemplate: parsedState.selectedColumnTemplate || 'standard',
            customColumnsConfig: parsedState.customColumnsConfig || {},
            dataVersion: currentVersion // Marquer comme nouvelle version
          }
          setState(cleanState)
          localStorage.setItem('facebook-ads-state', JSON.stringify(cleanState))
          console.log('✅ MAITRE: Reset automatique terminé - données daily prêtes')
        } else {
          // Version actuelle, restaurer normalement
          setState(prev => ({
            ...prev,
            ...parsedState,
            dateRange: {
              from: parsedState.dateRange?.from ? new Date(parsedState.dateRange.from) : undefined,
              to: parsedState.dateRange?.to ? new Date(parsedState.dateRange.to) : undefined
            },
            comparisonRange: parsedState.comparisonRange ? {
              from: parsedState.comparisonRange.from ? new Date(parsedState.comparisonRange.from) : undefined,
              to: parsedState.comparisonRange.to ? new Date(parsedState.comparisonRange.to) : undefined
            } : undefined
          }))
          console.log('🔄 MAITRE: État Facebook Ads restauré depuis localStorage (version actuelle)')
        }
      } else {
        // Pas de données sauvées, initialiser avec version actuelle
        const initialState = { ...defaultState, dataVersion: currentVersion }
        setState(initialState)
        localStorage.setItem('facebook-ads-state', JSON.stringify(initialState))
      }
    } catch (error) {
      console.error('Erreur chargement état Facebook Ads:', error)
      // En cas d'erreur, reset complet
      const resetState = { ...defaultState, dataVersion: '2025-07-03-daily-v2' }
      setState(resetState)
      localStorage.setItem('facebook-ads-state', JSON.stringify(resetState))
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

  // MAITRE: Nouvelles fonctions de persistance
  const updateAdsData = (data: unknown[]) => {
    setState(prev => ({ 
      ...prev, 
      adsData: data,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateCampaignsData = (data: unknown[]) => {
    setState(prev => ({ 
      ...prev, 
      campaignsData: data,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateAdsetsData = (data: unknown[]) => {
    setState(prev => ({ 
      ...prev, 
      adsetsData: data,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateAccountData = (data: unknown) => {
    setState(prev => ({ 
      ...prev, 
      accountData: data,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateErrorState = (error: string | null) => {
    setState(prev => ({ 
      ...prev, 
      lastError: error,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateLoadingState = (loading: boolean) => {
    setState(prev => ({ 
      ...prev, 
      lastLoadingState: loading,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  // MAITRE: Nouvelles fonctions pour configuration colonnes
  const updateSelectedColumnTemplate = (template: { id?: number; template_name: string } | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedColumnTemplate: template,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const updateCustomColumnsConfig = (config: unknown[]) => {
    setState(prev => ({ 
      ...prev, 
      customColumnsConfig: config,
      lastUpdateTime: new Date().toISOString()
    }))
  }

  const clearState = () => {
    setState(defaultState)
    localStorage.removeItem('facebook-ads-state')
  }

  // MAITRE: Fonction pour reset complet du cache (debug)
  const resetAllData = () => {
    // Vider localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('facebook') || key.includes('ads')) {
        localStorage.removeItem(key)
        console.log('🗑️ Removed localStorage key:', key)
      }
    })
    
    // Reset état React avec données vides pour forcer rechargement depuis API
    setState({
      ...defaultState,
      adsData: [],
      campaignsData: [],
      adsetsData: [],
      accountData: null,
      lastReportData: null
    })
    
    console.log('🔄 Facebook cache reset complet - données forcées à vide')
    // Recharger la page pour forcer un nouveau chargement
    window.location.reload()
  }

  return (
    <FacebookAdsContext.Provider value={{
      state,
      updateSelectedClient,
      updateDateRange,
      updateComparisonRange,
      updateComparisonMode,
      updateReportData,
      // MAITRE: Nouvelles fonctions exposées
      updateAdsData,
      updateCampaignsData,
      updateAdsetsData,
      updateAccountData,
      updateErrorState,
      updateLoadingState,
      // MAITRE: Persistance configuration colonnes
      updateSelectedColumnTemplate,
      updateCustomColumnsConfig,
      clearState,
      resetAllData
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