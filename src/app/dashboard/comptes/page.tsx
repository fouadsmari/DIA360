'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MultiSelect } from '@/components/ui/multi-select'
import { 
  Building,
  Search, 
  Edit, 
  Trash, 
  Plus,
  Facebook,
  Chrome,
  Instagram,
  Linkedin
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Compte {
  id: number
  entreprise: string
  adresse: string
  id_facebook_ads?: string
  id_google_ads?: string
  id_pages_facebook?: string[]
  id_page_instagram?: string[]
  id_compte_tiktok?: string
  id_compte_linkedin?: string
  budget?: number
  objectif_facebook_ads: string[]
  objectif_google_ads: string[]
  created_at: string
  created_by: number
  users_clients?: { id: number; nom: string; prenom: string; email: string }[]
  users_pub_gms?: { id: number; nom: string; prenom: string; email: string; poste: string }[]
  gestionnaires?: { id: number; nom: string; prenom: string; email: string; poste: string }[]
}

interface User {
  id: number
  nom: string
  prenom: string
  email: string
  poste: string
}

const OBJECTIFS_FACEBOOK = [
  'Trafic', 
  'Notoriété', 
  'E-commerce', 
  'Prospects', 
  'Visites en magasin', 
  'Appels', 
  'Infolettres', 
  'Messages', 
  'Contact'
]

const OBJECTIFS_GOOGLE = [
  'Trafic', 
  'Notoriété', 
  'E-commerce', 
  'Prospects', 
  'Visites en magasin', 
  'Appels', 
  'Infolettres', 
  'Contact'
]

export default function ComptesPage() {
  const { data: session } = useSession()
  const [comptes, setComptes] = useState<Compte[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCompte, setEditingCompte] = useState<Compte | null>(null)
  const [deletingCompte, setDeletingCompte] = useState<Compte | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  
  const [newCompte, setNewCompte] = useState({
    entreprise: '',
    adresse: '',
    id_facebook_ads: '',
    id_google_ads: '',
    id_pages_facebook: [] as string[],
    id_page_instagram: [] as string[],
    id_compte_tiktok: '',
    id_compte_linkedin: '',
    budget: '',
    objectif_facebook_ads: OBJECTIFS_FACEBOOK,
    objectif_google_ads: OBJECTIFS_GOOGLE,
    users_clients: [] as number[],
    users_pub_gms: [] as number[],
    gestionnaires: [] as number[]
  })

  useEffect(() => {
    fetchComptes()
    fetchUsers()
  }, [])

  const fetchComptes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/comptes')
      if (response.ok) {
        const data = await response.json()
        setComptes(data)
        console.log('Comptes chargés:', data.length)
      } else {
        console.error('Erreur chargement comptes:', response.status)
      }
    } catch (error) {
      console.error('Erreur fetch comptes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        console.log('Utilisateurs chargés pour sélection:', data.length)
      }
    } catch (error) {
      console.error('Erreur fetch users:', error)
    }
  }

  const handleAddCompte = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCompte.entreprise || !newCompte.adresse) {
      console.log('Entreprise et adresse sont obligatoires')
      return
    }

    console.log('Ajout nouveau compte:', newCompte.entreprise)

    try {
      const response = await fetch('/api/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCompte,
          budget: newCompte.budget ? parseFloat(newCompte.budget) : null
        })
      })

      if (response.ok) {
        console.log('Compte créé avec succès')
        await fetchComptes()
        setAddDialogOpen(false)
        // Reset form
        setNewCompte({
          entreprise: '',
          adresse: '',
          id_facebook_ads: '',
          id_google_ads: '',
          id_pages_facebook: [],
          id_page_instagram: [],
          id_compte_tiktok: '',
          id_compte_linkedin: '',
          budget: '',
          objectif_facebook_ads: OBJECTIFS_FACEBOOK,
          objectif_google_ads: OBJECTIFS_GOOGLE,
          users_clients: [],
          users_pub_gms: [],
          gestionnaires: []
        })
      } else {
        const data = await response.json()
        console.error('Erreur création compte:', data.error)
      }
    } catch (error) {
      console.error('Erreur add compte:', error)
    }
  }

  const handleEditCompte = async (compte: Compte) => {
    try {
      const response = await fetch(`/api/comptes/${compte.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise: compte.entreprise,
          adresse: compte.adresse,
          id_facebook_ads: compte.id_facebook_ads,
          id_google_ads: compte.id_google_ads,
          id_pages_facebook: compte.id_pages_facebook,
          id_page_instagram: compte.id_page_instagram,
          id_compte_tiktok: compte.id_compte_tiktok,
          id_compte_linkedin: compte.id_compte_linkedin,
          budget: compte.budget,
          objectif_facebook_ads: compte.objectif_facebook_ads,
          objectif_google_ads: compte.objectif_google_ads,
          users_clients: compte.users_clients?.map(u => u.id) || [],
          users_pub_gms: compte.users_pub_gms?.map(u => u.id) || [],
          gestionnaires: compte.gestionnaires?.map(u => u.id) || []
        })
      })

      if (response.ok) {
        console.log('Compte modifié:', compte.entreprise)
        await fetchComptes()
        setEditDialogOpen(false)
        setEditingCompte(null)
      } else {
        console.error('Erreur modification compte:', response.status)
      }
    } catch (error) {
      console.error('Erreur edit compte:', error)
    }
  }

  const handleDeleteCompte = async (compte: Compte) => {
    try {
      const response = await fetch(`/api/comptes/${compte.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Compte supprimé:', compte.entreprise)
        await fetchComptes()
        setDeleteDialogOpen(false)
        setDeletingCompte(null)
      } else {
        console.error('Erreur suppression compte:', response.status)
      }
    } catch (error) {
      console.error('Erreur delete compte:', error)
    }
  }

  const filteredComptes = comptes.filter(compte => 
    compte.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
    compte.adresse.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filtrer les utilisateurs par type
  const clientUsers = users.filter(u => u.poste === 'Client')
  const pubGmsUsers = users.filter(u => u.poste === 'PUP' || u.poste === 'GMS')
  const gestionnaireUsers = users.filter(u => 
    ['Direction', 'Responsable', 'PUP', 'GMS'].includes(u.poste)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des comptes</h1>
          <p className="text-muted-foreground">
            Gérez les comptes clients et leurs paramètres publicitaires
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter compte
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Comptes ({filteredComptes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Réseaux sociaux</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement des comptes...
                    </TableCell>
                  </TableRow>
                ) : filteredComptes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Aucun compte trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComptes.map((compte) => (
                    <TableRow key={compte.id}>
                      <TableCell>
                        <div className="font-medium">{compte.entreprise}</div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {compte.adresse}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {compte.id_facebook_ads && (
                            <Facebook className="h-4 w-4 text-blue-600" />
                          )}
                          {compte.id_google_ads && (
                            <Chrome className="h-4 w-4 text-red-600" />
                          )}
                          {compte.id_page_instagram?.length > 0 && (
                            <Instagram className="h-4 w-4 text-pink-600" />
                          )}
                          {compte.id_compte_linkedin && (
                            <Linkedin className="h-4 w-4 text-blue-700" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {compte.budget ? `${compte.budget.toLocaleString()} €` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(compte.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCompte(compte)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingCompte(compte)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Compte Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un compte</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCompte} className="space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entreprise">Entreprise *</Label>
                  <Input
                    id="entreprise"
                    value={newCompte.entreprise}
                    onChange={(e) => setNewCompte({...newCompte, entreprise: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={newCompte.budget}
                    onChange={(e) => setNewCompte({...newCompte, budget: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adresse">Adresse *</Label>
                <Textarea
                  id="adresse"
                  value={newCompte.adresse}
                  onChange={(e) => setNewCompte({...newCompte, adresse: e.target.value})}
                  required
                  rows={2}
                />
              </div>
            </div>

            {/* IDs réseaux sociaux */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Identifiants réseaux sociaux</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id_facebook_ads">ID Facebook Ads</Label>
                  <Input
                    id="id_facebook_ads"
                    value={newCompte.id_facebook_ads}
                    onChange={(e) => setNewCompte({...newCompte, id_facebook_ads: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="id_google_ads">ID Google Ads</Label>
                  <Input
                    id="id_google_ads"
                    value={newCompte.id_google_ads}
                    onChange={(e) => setNewCompte({...newCompte, id_google_ads: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="id_compte_tiktok">ID Compte TikTok</Label>
                  <Input
                    id="id_compte_tiktok"
                    value={newCompte.id_compte_tiktok}
                    onChange={(e) => setNewCompte({...newCompte, id_compte_tiktok: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="id_compte_linkedin">ID Compte LinkedIn</Label>
                  <Input
                    id="id_compte_linkedin"
                    value={newCompte.id_compte_linkedin}
                    onChange={(e) => setNewCompte({...newCompte, id_compte_linkedin: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Objectifs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Objectifs publicitaires</h3>
              <div>
                <Label>Objectifs Facebook Ads</Label>
                <MultiSelect
                  options={OBJECTIFS_FACEBOOK.map(obj => ({ value: obj, label: obj }))}
                  value={newCompte.objectif_facebook_ads}
                  onChange={(values) => setNewCompte({...newCompte, objectif_facebook_ads: values})}
                  placeholder="Sélectionner les objectifs Facebook"
                />
              </div>
              <div>
                <Label>Objectifs Google Ads</Label>
                <MultiSelect
                  options={OBJECTIFS_GOOGLE.map(obj => ({ value: obj, label: obj }))}
                  value={newCompte.objectif_google_ads}
                  onChange={(values) => setNewCompte({...newCompte, objectif_google_ads: values})}
                  placeholder="Sélectionner les objectifs Google"
                />
              </div>
            </div>

            {/* Assignation utilisateurs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Assignation utilisateurs</h3>
              <div>
                <Label>Utilisateurs clients</Label>
                <MultiSelect
                  options={clientUsers.map(u => ({ 
                    value: u.id.toString(), 
                    label: `${u.nom} ${u.prenom} (${u.email})` 
                  }))}
                  value={newCompte.users_clients.map(id => id.toString())}
                  onChange={(values) => setNewCompte({...newCompte, users_clients: values.map(v => parseInt(v))})}
                  placeholder="Sélectionner les clients"
                />
              </div>
              <div>
                <Label>Utilisateurs PUP/GMS</Label>
                <MultiSelect
                  options={pubGmsUsers.map(u => ({ 
                    value: u.id.toString(), 
                    label: `${u.nom} ${u.prenom} (${u.poste})` 
                  }))}
                  value={newCompte.users_pub_gms.map(id => id.toString())}
                  onChange={(values) => setNewCompte({...newCompte, users_pub_gms: values.map(v => parseInt(v))})}
                  placeholder="Sélectionner les PUP/GMS"
                />
              </div>
              <div>
                <Label>Gestionnaires du compte</Label>
                <MultiSelect
                  options={gestionnaireUsers.map(u => ({ 
                    value: u.id.toString(), 
                    label: `${u.nom} ${u.prenom} (${u.poste})` 
                  }))}
                  value={newCompte.gestionnaires.map(id => id.toString())}
                  onChange={(values) => setNewCompte({...newCompte, gestionnaires: values.map(v => parseInt(v))})}
                  placeholder="Sélectionner les gestionnaires"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                Créer le compte
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCompte && (
                <>
                  Êtes-vous sûr de vouloir supprimer le compte <strong>{deletingCompte.entreprise}</strong> ?
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingCompte && handleDeleteCompte(deletingCompte)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}