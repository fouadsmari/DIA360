'use client'

import React, { useState, useEffect } from 'react'
import { ChevronsUpDown, Plus, Save, Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  width?: number
}

export interface ColumnTemplate {
  id?: number
  template_name: string
  is_default: boolean
  is_shared: boolean
  description?: string
  visible_columns: string[]
  column_order: string[]
  column_widths?: Record<string, number>
}

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  selectedTemplate?: ColumnTemplate
  onColumnsChange: (columns: ColumnConfig[]) => void
  onTemplateChange: (template: ColumnTemplate) => void
}

const defaultColumns: ColumnConfig[] = [
  // Colonnes de base (visibles par défaut)
  { key: 'ad_name', label: 'Nom Publicité', visible: true },
  { key: 'adset_name', label: 'Nom AdSet', visible: false },
  { key: 'campaign_name', label: 'Nom Campagne', visible: false },
  { key: 'adset_id', label: 'ID AdSet', visible: true },
  { key: 'campaign_id', label: 'ID Campagne', visible: true },
  { key: 'account_id', label: 'ID Compte', visible: false },
  { key: 'sync_status', label: 'Statut', visible: true },
  { key: 'performance', label: 'Performance', visible: true },
  
  // Métriques principales (visibles par défaut)
  { key: 'spend', label: 'Dépenses', visible: true },
  { key: 'impressions', label: 'Impressions', visible: true },
  { key: 'clicks', label: 'Clics', visible: true },
  { key: 'ctr', label: 'CTR (%)', visible: true },
  { key: 'cpc', label: 'CPC', visible: true },
  
  // Métriques supplémentaires
  { key: 'cpm', label: 'CPM', visible: false },
  { key: 'reach', label: 'Portée', visible: false },
  { key: 'frequency', label: 'Fréquence', visible: false },
  { key: 'unique_clicks', label: 'Clics Uniques', visible: false },
  { key: 'inline_link_clicks', label: 'Clics sur Liens', visible: false },
  { key: 'website_ctr', label: 'CTR Site Web (%)', visible: false },
  { key: 'cost_per_inline_link_click', label: 'Coût/Clic Lien', visible: false },
  { key: 'cost_per_unique_click', label: 'Coût/Clic Unique', visible: false },
  { key: 'inline_post_engagement', label: 'Engagement Publications', visible: false },
  
  // Actions et conversions
  { key: 'actions_like', label: 'Actions: J\'aime', visible: false },
  { key: 'actions_comment', label: 'Actions: Commentaires', visible: false },
  { key: 'actions_share', label: 'Actions: Partages', visible: false },
  { key: 'actions_link_click', label: 'Actions: Clics Liens', visible: false },
  { key: 'actions_post_engagement', label: 'Actions: Engagement', visible: false },
  { key: 'actions_page_engagement', label: 'Actions: Engagement Page', visible: false },
  { key: 'actions_landing_page_view', label: 'Actions: Vues Page Dest.', visible: false },
  { key: 'actions_app_install', label: 'Actions: Install. App', visible: false },
  { key: 'actions_app_use', label: 'Actions: Utilisation App', visible: false },
  { key: 'actions_purchase', label: 'Actions: Achats', visible: false },
  { key: 'actions_add_to_cart', label: 'Actions: Ajout Panier', visible: false },
  { key: 'actions_initiate_checkout', label: 'Actions: Début Commande', visible: false },
  { key: 'actions_lead', label: 'Actions: Prospects', visible: false },
  { key: 'actions_complete_registration', label: 'Actions: Inscriptions', visible: false },
  { key: 'actions_search', label: 'Actions: Recherches', visible: false },
  { key: 'actions_view_content', label: 'Actions: Vues Contenu', visible: false },
  { key: 'actions_add_to_wishlist', label: 'Actions: Ajout Favoris', visible: false },
  { key: 'actions_subscribe', label: 'Actions: Abonnements', visible: false },
  { key: 'actions_start_trial', label: 'Actions: Essais Gratuits', visible: false },
  { key: 'actions_contact', label: 'Actions: Contacts', visible: false },
  { key: 'actions_donate', label: 'Actions: Dons', visible: false },
  { key: 'actions_find_location', label: 'Actions: Localisation', visible: false },
  { key: 'actions_schedule', label: 'Actions: Planification', visible: false },
  { key: 'actions_submit_application', label: 'Actions: Candidatures', visible: false },
  { key: 'actions_video_play', label: 'Actions: Lectures Vidéo', visible: false },
  { key: 'actions_video_view', label: 'Actions: Vues Vidéo', visible: false },
  
  // Valeurs des actions
  { key: 'action_values_purchase', label: 'Valeur: Achats', visible: false },
  { key: 'action_values_add_to_cart', label: 'Valeur: Ajout Panier', visible: false },
  { key: 'action_values_initiate_checkout', label: 'Valeur: Début Commande', visible: false },
  { key: 'action_values_lead', label: 'Valeur: Prospects', visible: false },
  { key: 'action_values_complete_registration', label: 'Valeur: Inscriptions', visible: false },
  { key: 'action_values_search', label: 'Valeur: Recherches', visible: false },
  { key: 'action_values_view_content', label: 'Valeur: Vues Contenu', visible: false },
  { key: 'action_values_subscribe', label: 'Valeur: Abonnements', visible: false },
  { key: 'action_values_donate', label: 'Valeur: Dons', visible: false },
  
  // Actions uniques  
  { key: 'unique_actions_like', label: 'Actions Uniques: J\'aime', visible: false },
  { key: 'unique_actions_comment', label: 'Actions Uniques: Commentaires', visible: false },
  { key: 'unique_actions_share', label: 'Actions Uniques: Partages', visible: false },
  { key: 'unique_actions_link_click', label: 'Actions Uniques: Clics Liens', visible: false },
  { key: 'unique_actions_post_engagement', label: 'Actions Uniques: Engagement', visible: false },
  { key: 'unique_actions_page_engagement', label: 'Actions Uniques: Engagement Page', visible: false },
  { key: 'unique_actions_purchase', label: 'Actions Uniques: Achats', visible: false },
  { key: 'unique_actions_add_to_cart', label: 'Actions Uniques: Ajout Panier', visible: false },
  { key: 'unique_actions_lead', label: 'Actions Uniques: Prospects', visible: false },
  { key: 'unique_actions_complete_registration', label: 'Actions Uniques: Inscriptions', visible: false },
  
  // Métriques qualité et optimisation
  { key: 'data_quality_score', label: 'Score Qualité Données', visible: false },
  { key: 'date_start', label: 'Date Début', visible: false },
  { key: 'date_stop', label: 'Date Fin', visible: false }
]

export function ColumnSelector({ 
  columns, 
  selectedTemplate,
  onColumnsChange, 
  onTemplateChange 
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ColumnTemplate[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)

  // Charger les modèles disponibles
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/facebook/column-templates?includeShared=true')
      if (response.ok) {
        const result = await response.json()
        setTemplates(result.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement modèles:', error)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  // Sauvegarder un nouveau modèle
  const saveTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Veuillez saisir un nom pour le modèle')
      return
    }

    setLoading(true)
    try {
      const visibleColumns = columns.filter(col => col.visible).map(col => col.key)
      const columnOrder = columns.map(col => col.key)
      const columnWidths = columns.reduce((acc, col) => {
        if (col.width) acc[col.key] = col.width
        return acc
      }, {} as Record<string, number>)

      const templateData: Omit<ColumnTemplate, 'id'> = {
        template_name: newTemplateName.trim(),
        is_default: isDefault,
        is_shared: isShared,
        description: newTemplateDescription?.trim() || undefined,
        visible_columns: visibleColumns,
        column_order: columnOrder,
        column_widths: columnWidths
      }

      console.log('🔄 MAITRE: Sauvegarde modèle:', templateData)

      const response = await fetch('/api/facebook/column-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ MAITRE: Modèle sauvegardé:', result)
        
        // Réinitialiser le formulaire
        setSaveDialogOpen(false)
        setNewTemplateName('')
        setNewTemplateDescription('')
        setIsShared(false)
        setIsDefault(false)
        
        // Recharger les modèles et appliquer le nouveau
        await loadTemplates()
        onTemplateChange(result.data)
        
        alert(`✅ Modèle "${newTemplateName}" sauvegardé avec succès!`)
      } else {
        const errorData = await response.json()
        console.error('❌ Erreur sauvegarde:', errorData)
        alert(`❌ Erreur sauvegarde: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde modèle:', error)
      alert('❌ Erreur lors de la sauvegarde du modèle')
    } finally {
      setLoading(false)
    }
  }

  // Supprimer un modèle
  const deleteTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/facebook/column-templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadTemplates()
        if (selectedTemplate?.id === templateId) {
          // Revenir au modèle par défaut
          const defaultTemplate = templates.find(t => t.is_default) || templates[0]
          if (defaultTemplate) {
            onTemplateChange(defaultTemplate)
          }
        }
      }
    } catch (error) {
      console.error('Erreur suppression modèle:', error)
    }
  }

  // Appliquer un modèle
  const applyTemplate = (template: ColumnTemplate) => {
    try {
      const visibleColumns = Array.isArray(template.visible_columns) 
        ? template.visible_columns 
        : JSON.parse(template.visible_columns as string)
      
      const columnOrder = Array.isArray(template.column_order)
        ? template.column_order
        : JSON.parse(template.column_order as string)

      const columnWidths = template.column_widths 
        ? (typeof template.column_widths === 'object' 
          ? template.column_widths 
          : JSON.parse(template.column_widths as string))
        : {}

      // Créer les nouvelles colonnes basées sur le modèle
      const orderedColumns = columnOrder.map((key: string) => {
        const defaultCol = defaultColumns.find(col => col.key === key)
        return defaultCol ? {
          ...defaultCol,
          visible: visibleColumns.includes(key),
          width: columnWidths[key]
        } : null
      }).filter(Boolean) as ColumnConfig[]

      // Ajouter les colonnes manquantes
      defaultColumns.forEach(defaultCol => {
        if (!orderedColumns.find(col => col.key === defaultCol.key)) {
          orderedColumns.push({
            ...defaultCol,
            visible: visibleColumns.includes(defaultCol.key),
            width: columnWidths[defaultCol.key]
          })
        }
      })

      onColumnsChange(orderedColumns)
      onTemplateChange(template)
      setOpen(false)
    } catch (error) {
      console.error('Erreur application modèle:', error)
    }
  }

  const toggleColumn = (key: string) => {
    const newColumns = columns.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    )
    onColumnsChange(newColumns)
  }

  const visibleCount = columns.filter(col => col.visible).length

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Colonnes ({visibleCount})
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <div className="p-4 space-y-4">
            {/* Sélection de modèle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modèles sauvegardés</Label>
              <Select 
                value={selectedTemplate?.id?.toString() || ''} 
                onValueChange={(value) => {
                  const template = templates.find(t => t.id?.toString() === value)
                  if (template) applyTemplate(template)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un modèle..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id?.toString() || ''}>
                      <div className="flex items-center gap-2">
                        {template.template_name}
                        {template.is_default && <Badge variant="secondary" className="text-xs">Défaut</Badge>}
                        {template.is_shared && <Badge variant="outline" className="text-xs">Partagé</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Configuration des colonnes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Colonnes visibles</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column.key}`}
                      checked={column.visible}
                      onCheckedChange={() => toggleColumn(column.key)}
                    />
                    <Label
                      htmlFor={`column-${column.key}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sauvegarder le modèle de colonnes</DialogTitle>
                    <DialogDescription>
                      Créez un modèle personnalisé avec la configuration actuelle des colonnes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Nom du modèle</Label>
                      <Input
                        id="template-name"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Mon modèle personnalisé"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description (optionnelle)</Label>
                      <Textarea
                        id="template-description"
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                        placeholder="Description du modèle..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is-default"
                          checked={isDefault}
                          onCheckedChange={(checked) => setIsDefault(checked === true)}
                        />
                        <Label htmlFor="is-default">Modèle par défaut</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is-shared"
                          checked={isShared}
                          onCheckedChange={(checked) => setIsShared(checked === true)}
                        />
                        <Label htmlFor="is-shared">Partager avec les autres utilisateurs</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSaveDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={saveTemplate}
                      disabled={!newTemplateName.trim() || loading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {selectedTemplate && selectedTemplate.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedTemplate.id && deleteTemplate(selectedTemplate.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}