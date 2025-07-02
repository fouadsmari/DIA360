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
  DialogTitle, 
  DialogTrigger 
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Search, 
  Edit, 
  UserX, 
  UserCheck, 
  Trash, 
  Plus 
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface User {
  id: number
  nom: string
  prenom: string
  email: string
  poste: string
  is_active: boolean
  created_at: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPoste, setFilterPoste] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [toggleUser, setToggleUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  // Check if user is Superadmin
  const isSuperAdmin = session?.user?.role === 'Superadmin'

  useEffect(() => {
    if (session && !isSuperAdmin) {
      console.log('Accès refusé: utilisateur non Superadmin')
      return
    }
    fetchUsers()
  }, [session, isSuperAdmin])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        console.log('Utilisateurs chargés:', data.length)
      } else {
        console.error('Erreur chargement utilisateurs:', response.status)
      }
    } catch (error) {
      console.error('Erreur fetch utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          poste: user.poste
        })
      })

      if (response.ok) {
        console.log('Utilisateur modifié:', user.email)
        await fetchUsers()
        setEditDialogOpen(false)
        setEditingUser(null)
      } else {
        console.error('Erreur modification utilisateur:', response.status)
      }
    } catch (error) {
      console.error('Erreur edit user:', error)
    }
  }

  const handleToggleUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const action = user.is_active ? 'désactivé' : 'activé'
        console.log(`Utilisateur ${action}:`, user.email)
        await fetchUsers()
        setToggleDialogOpen(false)
        setToggleUser(null)
      } else {
        console.error('Erreur toggle utilisateur:', response.status)
      }
    } catch (error) {
      console.error('Erreur toggle user:', error)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      console.log('Confirmation suppression incorrecte')
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Utilisateur supprimé:', user.email)
        await fetchUsers()
        setDeleteDialogOpen(false)
        setDeletingUser(null)
        setDeleteConfirmation('')
      } else {
        console.error('Erreur suppression utilisateur:', response.status)
      }
    } catch (error) {
      console.error('Erreur delete user:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Superadmin': return 'bg-red-100 text-red-800'
      case 'Direction': return 'bg-purple-100 text-purple-800'
      case 'Responsable': return 'bg-blue-100 text-blue-800'
      case 'PUP': return 'bg-green-100 text-green-800'
      case 'GMS': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (nom: string, prenom: string) => {
    return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase()
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterPoste === 'all' || user.poste === filterPoste
    
    return matchesSearch && matchesFilter
  })

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="text-center p-6">
          <CardContent>
            <p className="text-lg font-medium text-red-600">Accès refusé</p>
            <p className="text-sm text-muted-foreground mt-2">
              Seuls les Superadmins peuvent accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez tous les utilisateurs de la plateforme
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter utilisateur
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPoste} onValueChange={setFilterPoste}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par poste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les postes</SelectItem>
                <SelectItem value="Superadmin">Superadmin</SelectItem>
                <SelectItem value="Direction">Direction</SelectItem>
                <SelectItem value="Responsable">Responsable</SelectItem>
                <SelectItem value="PUP">PUP</SelectItem>
                <SelectItem value="GMS">GMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement des utilisateurs...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(user.nom, user.prenom)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.nom} {user.prenom}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.poste)}>
                          {user.poste}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setToggleUser(user)
                              setToggleDialogOpen(true)
                            }}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingUser(user)
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

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier utilisateur</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={editingUser.nom}
                  onChange={(e) => setEditingUser({...editingUser, nom: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={editingUser.prenom}
                  onChange={(e) => setEditingUser({...editingUser, prenom: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="poste">Poste</Label>
                <Select 
                  value={editingUser.poste} 
                  onValueChange={(value) => setEditingUser({...editingUser, poste: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superadmin">Superadmin</SelectItem>
                    <SelectItem value="Direction">Direction</SelectItem>
                    <SelectItem value="Responsable">Responsable</SelectItem>
                    <SelectItem value="PUP">PUP</SelectItem>
                    <SelectItem value="GMS">GMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => handleEditUser(editingUser)}>
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer action</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleUser && (
                `Voulez-vous vraiment ${toggleUser.is_active ? 'désactiver' : 'activer'} l'utilisateur ${toggleUser.nom} ${toggleUser.prenom} ?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => toggleUser && handleToggleUser(toggleUser)}
              className={toggleUser?.is_active ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser && (
                <>
                  Cette action est irréversible. L'utilisateur {deletingUser.nom} {deletingUser.prenom} sera définitivement supprimé.
                  <br /><br />
                  Tapez <strong>SUPPRIMER</strong> pour confirmer :
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6">
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Tapez SUPPRIMER"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingUser && handleDeleteUser(deletingUser)}
              disabled={deleteConfirmation !== 'SUPPRIMER'}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}