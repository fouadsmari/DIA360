"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown, Building2, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface ClientOption {
  compteId: number
  entreprise: string
  facebookAccountId: string
  budget: number
  hasAccess: boolean
}

interface ClientSelectorProps {
  selectedClient: ClientOption | null
  onClientChange: (client: ClientOption | null) => void
  className?: string
  placeholder?: string
}

export function ClientSelector({
  selectedClient,
  onClientChange,
  className,
  placeholder = "Sélectionner un compte client..."
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/comptes/facebook-enabled')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des comptes clients')
      }
      
      const data = await response.json()
      setClients(data)
      
    } catch (err) {
      console.error('Erreur chargement clients:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const formatBudget = useCallback((budget: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(budget)
  }, [])

  const handleClientSelect = useCallback((client: ClientOption) => {
    onClientChange(client)
    setOpen(false)
  }, [onClientChange])

  if (loading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-[280px] justify-between", className)}
      >
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Chargement...
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  if (error) {
    return (
      <Button
        variant="outline"
        onClick={loadClients}
        className={cn("w-[280px] justify-between text-red-600", className)}
      >
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Erreur - Cliquer pour réessayer
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[280px] justify-between", className)}
        >
          {selectedClient ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="truncate">{selectedClient.entreprise}</span>
              {selectedClient.budget > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatBudget(selectedClient.budget)}
                </Badge>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un compte client..." />
          <CommandEmpty>
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Aucun compte client trouvé
              <p className="text-xs mt-1">
                Vérifiez que des comptes ont un ID Facebook Ads configuré
              </p>
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {clients.map((client) => (
              <CommandItem
                key={client.compteId}
                value={`${client.entreprise} ${client.facebookAccountId}`}
                onSelect={() => handleClientSelect(client)}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedClient?.compteId === client.compteId
                        ? "opacity-100 text-blue-600"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium truncate">
                        {client.entreprise}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        ID FB: {client.facebookAccountId}
                      </span>
                      {client.budget > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <DollarSign className="h-3 w-3" />
                          {formatBudget(client.budget)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
        
        {clients.length > 0 && (
          <div className="border-t p-2">
            <p className="text-xs text-muted-foreground text-center">
              {clients.length} compte{clients.length > 1 ? 's' : ''} avec Facebook Ads configuré{clients.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}