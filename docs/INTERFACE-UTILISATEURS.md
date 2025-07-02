# Interface Utilisateurs - DIA360

## 🎨 Spécifications Interface Complètes

### Vue d'ensemble
Documentation complète pour l'implémentation de l'interface utilisateur selon les spécifications exactes demandées, utilisant la stack Next.js 14 + shadcn/ui + Tailwind CSS.

## 🔐 Interface Authentification

### 1. Page Login/Inscription
```typescript
// Composant principal auth avec onglets
interface AuthPageInterface {
  layout: {
    container: 'Centré, responsive, fond gradient'
    card: 'shadcn/ui Card avec shadow'
    tabs: 'shadcn/ui Tabs (Login/Inscription)'
    logo: 'DIA360 en haut avec icône'
  }
  
  login_tab: {
    fields: [
      'Email (shadcn/ui Input avec validation)',
      'Mot de passe (shadcn/ui Input type password)'
    ]
    buttons: [
      'Se connecter (shadcn/ui Button primary)',
      'Mot de passe oublié (Link discret)'
    ]
    validation: 'Temps réel avec messages erreur sous champs'
  }
  
  register_tab: {
    fields: [
      'Nom (shadcn/ui Input requis)',
      'Prénom (shadcn/ui Input requis)',
      'Email (shadcn/ui Input avec validation format)',
      'Mot de passe (shadcn/ui Input avec indicateur force)',
      'Poste (shadcn/ui Select avec options dropdown)'
    ]
    poste_options: ['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS']
    button: 'Créer compte (shadcn/ui Button)'
    validation: 'Validation temps réel tous champs'
  }
}
```

### 2. Interface Reset Password
```typescript
interface ResetPasswordInterface {
  modal: {
    trigger: 'Lien "Mot de passe oublié" sur page login'
    component: 'shadcn/ui Dialog'
    content: [
      'Titre: Réinitialiser mot de passe',
      'Email input (shadcn/ui Input)',
      'Bouton Envoyer (shadcn/ui Button)',
      'Message confirmation envoi email'
    ]
  }
  
  reset_form: {
    page: '/auth/reset-password/[token]'
    fields: [
      'Nouveau mot de passe (shadcn/ui Input)',
      'Confirmer mot de passe (shadcn/ui Input)',
      'Indicateur force mot de passe'
    ]
    validation: 'Matching passwords + complexité'
    button: 'Confirmer nouveau mot de passe'
  }
}
```

### 3. États et Feedback
```typescript
interface AuthStatesInterface {
  loading: {
    button: 'shadcn/ui Button avec loading spinner'
    overlay: 'Disable form pendant traitement'
  }
  
  errors: {
    display: 'shadcn/ui Alert destructive'
    messages: [
      'Email ou mot de passe incorrect',
      'Compte désactivé',
      'Email déjà utilisé',
      'Erreur de connexion serveur'
    ]
    position: 'Sous le formulaire, bien visible'
  }
  
  success: {
    login: 'Redirection automatique vers /dashboard'
    register: 'shadcn/ui Alert success + redirection'
    reset: 'Message confirmation email envoyé'
  }
}
```

## 🏠 Interface Dashboard Principal

### 1. Layout avec Sidebar
```typescript
interface DashboardLayoutInterface {
  structure: {
    header: 'Fixe en haut, bg-white shadow'
    sidebar: 'Gauche, rétractable, bg-gray-50'
    main: 'Zone contenu principal, padding responsive'
    overlay: 'Mobile: overlay dark quand sidebar ouvert'
  }
  
  sidebar: {
    width: {
      expanded: '256px (w-64)'
      collapsed: '64px (w-16)'
    }
    
    header: {
      logo: 'DIA360 avec icône (masqué si collapsed)'
      toggle: 'Bouton hamburger (Lucide Menu/X)'
    }
    
    navigation: {
      home: {
        icon: 'Lucide Home'
        label: 'Accueil'
        route: '/dashboard'
        active_style: 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
      }
      
      settings: {
        icon: 'Lucide Settings'
        label: 'Paramètres'
        expandable: true
        submenu: [
          {
            icon: 'Lucide Users'
            label: 'Utilisateurs'
            route: '/dashboard/settings/users'
          }
        ]
      }
    }
    
    responsive: {
      mobile: 'Overlay full-screen'
      tablet: 'Sidebar fixe'
      desktop: 'Sidebar rétractable'
    }
  }
}
```

### 2. Header Interface
```typescript
interface HeaderInterface {
  layout: {
    height: '64px (h-16)'
    background: 'bg-white border-b'
    content: 'Flex justify-between items-center px-6'
  }
  
  left_section: {
    sidebar_toggle: 'Bouton hamburger mobile (shadcn/ui Button ghost)'
    breadcrumb: 'shadcn/ui Breadcrumb navigation'
  }
  
  right_section: {
    user_info: {
      display: 'Nom Prénom utilisateur connecté'
      avatar: 'shadcn/ui Avatar avec initiales'
      dropdown: 'shadcn/ui DropdownMenu'
    }
    
    user_menu: {
      trigger: 'Avatar + nom + Lucide ChevronDown'
      items: [
        {
          icon: 'Lucide User'
          label: 'Profil'
          route: '/dashboard/profile'
        },
        {
          icon: 'Lucide LogOut'
          label: 'Déconnexion'
          action: 'signOut()'
          color: 'text-red-600'
        }
      ]
    }
  }
}
```

### 3. Page d'Accueil Dashboard
```typescript
interface DashboardHomeInterface {
  layout: {
    title: 'h1: Tableau de bord'
    subtitle: 'Bienvenue, [Nom Prénom]'
    grid: 'Grid responsive cards metrics'
  }
  
  metrics_cards: [
    {
      title: 'Total Utilisateurs'
      value: 'Nombre depuis DB'
      icon: 'Lucide Users'
      color: 'blue'
      component: 'shadcn/ui Card'
    },
    {
      title: 'Utilisateurs Actifs'
      value: 'is_active = true'
      icon: 'Lucide UserCheck'
      color: 'green'
    },
    {
      title: 'Nouveaux ce mois'
      value: 'created_at last 30 days'
      icon: 'Lucide UserPlus'
      color: 'purple'
    },
    {
      title: 'Admins'
      value: 'poste = Superadmin'
      icon: 'Lucide Shield'
      color: 'orange'
    }
  ]
  
  recent_activity: {
    title: 'Activité récente'
    component: 'shadcn/ui Card avec ScrollArea'
    items: 'Dernières connexions/inscriptions'
    format: 'Avatar + nom + action + timestamp'
  }
}
```

## 👤 Interface Profil Utilisateur

### 1. Page Profil
```typescript
interface ProfilePageInterface {
  layout: {
    title: 'Mon Profil'
    container: 'Max-width centré avec padding'
    sections: 'Cards séparées par fonctionnalité'
  }
  
  info_section: {
    title: 'Informations personnelles'
    component: 'shadcn/ui Card'
    fields: [
      {
        label: 'Nom'
        value: 'user.nom (readonly)'
        style: 'shadcn/ui Input disabled'
      },
      {
        label: 'Prénom'
        value: 'user.prenom (readonly)'
        style: 'shadcn/ui Input disabled'
      },
      {
        label: 'Email'
        value: 'user.email (readonly)'
        style: 'shadcn/ui Input disabled'
      },
      {
        label: 'Poste'
        value: 'user.poste (readonly)'
        style: 'shadcn/ui Badge variant selon poste'
      }
    ]
  }
  
  password_section: {
    title: 'Modifier mot de passe'
    component: 'shadcn/ui Card séparée'
    form: [
      {
        label: 'Mot de passe actuel'
        type: 'password'
        required: true
        component: 'shadcn/ui Input'
      },
      {
        label: 'Nouveau mot de passe'
        type: 'password'
        required: true
        component: 'shadcn/ui Input'
        validation: 'Indicateur force temps réel'
      },
      {
        label: 'Confirmer nouveau mot de passe'
        type: 'password'
        required: true
        component: 'shadcn/ui Input'
        validation: 'Matching avec nouveau'
      }
    ]
    
    actions: [
      {
        label: 'Annuler'
        variant: 'outline'
        action: 'Reset form'
      },
      {
        label: 'Modifier le mot de passe'
        variant: 'default'
        action: 'Submit form'
      }
    ]
  }
}
```

## ⚙️ Interface Administration Utilisateurs

### 1. Menu Paramètres Dropdown
```typescript
interface SettingsMenuInterface {
  trigger: {
    icon: 'Lucide Settings'
    label: 'Paramètres'
    component: 'Sidebar nav item avec Lucide ChevronDown'
  }
  
  dropdown_behavior: {
    expand: 'Submenu s\'ouvre sous l\'item principal'
    collapse: 'Clic sur Paramètres toggle le submenu'
    animation: 'Transition smooth expand/collapse'
  }
  
  submenu_items: [
    {
      icon: 'Lucide Users'
      label: 'Utilisateurs'
      route: '/dashboard/settings/users'
      permission: 'Superadmin seulement'
    }
  ]
  
  visual_states: {
    item_hover: 'bg-gray-100 text-gray-900'
    item_active: 'bg-blue-100 text-blue-700'
    submenu_indent: 'pl-12 (indentation gauche)'
  }
}
```

### 2. Page Gestion Utilisateurs
```typescript
interface UsersManagementInterface {
  layout: {
    title: 'Gestion des utilisateurs'
    actions: 'Bouton "Ajouter utilisateur" (shadcn/ui Button)'
    search: 'shadcn/ui Input avec Lucide Search icon'
    filters: 'shadcn/ui Select pour filtrer par poste'
  }
  
  table: {
    component: 'shadcn/ui Table responsive'
    columns: [
      {
        header: 'Utilisateur'
        content: 'Avatar + Nom Prénom'
        sortable: true
      },
      {
        header: 'Email'
        content: 'user.email'
        sortable: true
      },
      {
        header: 'Poste'
        content: 'shadcn/ui Badge avec couleur par poste'
        filterable: true
      },
      {
        header: 'Statut'
        content: 'shadcn/ui Badge Actif/Inactif'
        filterable: true
      },
      {
        header: 'Date création'
        content: 'format: DD/MM/YYYY'
        sortable: true
      },
      {
        header: 'Actions'
        content: 'Boutons action (voir détail ci-dessous)'
        width: 'w-32'
      }
    ]
    
    pagination: {
      component: 'shadcn/ui Pagination'
      per_page: '20 utilisateurs'
      info: 'Affichage X-Y sur Z total'
    }
  }
  
  row_actions: {
    layout: 'Flex gap-2 justify-end'
    buttons: [
      {
        icon: 'Lucide Edit'
        tooltip: 'Modifier'
        variant: 'ghost'
        size: 'sm'
        action: 'Ouvrir modal édition'
      },
      {
        icon: 'Lucide UserX ou UserCheck'
        tooltip: 'Désactiver/Activer'
        variant: 'ghost'
        size: 'sm'
        action: 'Toggle is_active avec confirmation'
        color: 'Dynamique selon statut'
      },
      {
        icon: 'Lucide Trash'
        tooltip: 'Supprimer'
        variant: 'ghost'
        size: 'sm'
        action: 'Suppression avec double confirmation'
        color: 'text-red-600'
      }
    ]
  }
}
```

### 3. Modales et Actions
```typescript
interface UserActionsInterface {
  edit_modal: {
    trigger: 'Clic bouton Edit'
    component: 'shadcn/ui Dialog'
    title: 'Modifier utilisateur'
    
    form: [
      {
        label: 'Nom'
        component: 'shadcn/ui Input'
        value: 'user.nom'
        editable: true
      },
      {
        label: 'Prénom'
        component: 'shadcn/ui Input'
        value: 'user.prenom'
        editable: true
      },
      {
        label: 'Email'
        component: 'shadcn/ui Input'
        value: 'user.email'
        editable: true
        validation: 'Format email + unicité'
      },
      {
        label: 'Poste'
        component: 'shadcn/ui Select'
        options: ['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS']
        value: 'user.poste'
      }
    ]
    
    actions: [
      {
        label: 'Annuler'
        variant: 'outline'
        action: 'Fermer modal sans sauver'
      },
      {
        label: 'Sauvegarder'
        variant: 'default'
        action: 'Submit + refresh table'
      }
    ]
  }
  
  toggle_status_confirmation: {
    component: 'shadcn/ui AlertDialog'
    title: 'Confirmer action'
    message: 'Voulez-vous vraiment [activer/désactiver] cet utilisateur ?'
    actions: [
      {
        label: 'Annuler'
        variant: 'outline'
      },
      {
        label: 'Confirmer'
        variant: 'destructive si désactivation'
        action: 'API call + refresh table'
      }
    ]
  }
  
  delete_confirmation: {
    component: 'shadcn/ui AlertDialog'
    title: 'Supprimer utilisateur'
    message: 'Cette action est irréversible. Tapez "SUPPRIMER" pour confirmer.'
    input: 'shadcn/ui Input pour confirmation'
    validation: 'Bouton activé seulement si "SUPPRIMER" tapé'
    actions: [
      {
        label: 'Annuler'
        variant: 'outline'
      },
      {
        label: 'Supprimer définitivement'
        variant: 'destructive'
        disabled: 'Jusqu\'à validation input'
        action: 'API DELETE + refresh table'
      }
    ]
  }
}
```

## 🎨 Design System & Composants

### 1. Palette Couleurs
```typescript
interface ColorPaletteInterface {
  primary: {
    blue: 'Blue-600 (boutons principaux)'
    light_blue: 'Blue-100 (états actifs)'
  }
  
  status: {
    success: 'Green-600 (actif, succès)'
    warning: 'Orange-600 (attention)'
    danger: 'Red-600 (suppression, erreur)'
    info: 'Blue-500 (information)'
  }
  
  neutral: {
    background: 'Gray-50 (sidebar, backgrounds)'
    border: 'Gray-200 (bordures)'
    text: 'Gray-900 (texte principal)'
    muted: 'Gray-500 (texte secondaire)'
  }
  
  poste_colors: {
    Superadmin: 'Red-100 bg, Red-700 text'
    Direction: 'Purple-100 bg, Purple-700 text'
    Responsable: 'Blue-100 bg, Blue-700 text'
    PUP: 'Green-100 bg, Green-700 text'
    GMS: 'Orange-100 bg, Orange-700 text'
  }
}
```

### 2. Responsive Design
```typescript
interface ResponsiveInterface {
  breakpoints: {
    mobile: '< 768px'
    tablet: '768px - 1024px'
    desktop: '> 1024px'
  }
  
  layout_changes: {
    mobile: {
      sidebar: 'Overlay full-screen'
      header: 'Hamburger menu visible'
      table: 'Scroll horizontal'
      cards: 'Stack vertical'
    }
    
    tablet: {
      sidebar: 'Collapsible à gauche'
      header: 'Toggle sidebar visible'
      table: 'Responsive colonnes'
      cards: 'Grid 2 colonnes'
    }
    
    desktop: {
      sidebar: 'Fixe expansible'
      header: 'Full layout'
      table: 'Toutes colonnes visibles'
      cards: 'Grid 4 colonnes'
    }
  }
}
```

### 3. États d'Interface
```typescript
interface InterfaceStatesInterface {
  loading: {
    global: 'Skeleton loaders (shadcn/ui Skeleton)'
    buttons: 'Spinner icon + disabled state'
    table: 'Loading rows avec shimmer effect'
  }
  
  empty: {
    table: 'shadcn/ui Card avec icon + message + CTA'
    search: 'Message "Aucun résultat trouvé"'
    error: 'shadcn/ui Alert avec retry button'
  }
  
  success: {
    toast: 'shadcn/ui Toast success'
    inline: 'shadcn/ui Alert success'
    confirmation: 'Check icon + message temporaire'
  }
  
  error: {
    toast: 'shadcn/ui Toast destructive'
    form: 'Messages sous champs avec icon'
    page: 'Error boundary avec retry'
  }
}
```

## 📱 Interactions Utilisateur

### 1. Navigation
```typescript
interface NavigationInterface {
  sidebar_toggle: {
    desktop: 'Hover pour preview si collapsed'
    mobile: 'Swipe ou tap overlay pour fermer'
    animation: 'Transition 300ms ease-in-out'
  }
  
  menu_states: {
    active_page: 'Highlight item actuel'
    hover: 'Background change smooth'
    submenu: 'Expand/collapse avec animation'
  }
  
  breadcrumb: {
    display: 'Home > Section > Page actuelle'
    clickable: 'Liens vers pages parentes'
    separator: 'Lucide ChevronRight'
  }
}
```

### 2. Formulaires
```typescript
interface FormsInterface {
  validation: {
    realtime: 'Validation pendant la saisie'
    visual: 'Border rouge + message erreur'
    success: 'Border verte + check icon'
  }
  
  password_strength: {
    indicator: 'Barre progress colorée'
    criteria: 'Liste requirements avec check'
    realtime: 'Update pendant saisie'
  }
  
  autocomplete: {
    email: 'Browser autocomplete activé'
    password: 'Suggest browser save'
  }
}
```

### 3. Feedback Visuel
```typescript
interface FeedbackInterface {
  hover_states: {
    buttons: 'Opacity 90% + slight scale'
    table_rows: 'Background gray-50'
    nav_items: 'Background + text color change'
  }
  
  click_feedback: {
    buttons: 'Ripple effect ou slight scale'
    instant_response: 'Visual change immediate'
  }
  
  loading_states: {
    buttons: 'Spinner replace icon'
    forms: 'Disable all inputs'
    global: 'Progress bar ou spinner'
  }
}
```

---

## 🎯 Checklist Implémentation Interface

### ✅ Authentification
- [ ] Page login/inscription avec onglets
- [ ] Formulaire inscription avec dropdown Poste
- [ ] Modal reset password
- [ ] Validation temps réel
- [ ] États loading/error/success

### ✅ Dashboard Layout
- [ ] Sidebar rétractable avec navigation
- [ ] Header avec user menu
- [ ] Page accueil avec metrics cards
- [ ] Responsive mobile/tablet/desktop

### ✅ Profil Utilisateur
- [ ] Affichage infos readonly depuis DB
- [ ] Section modification mot de passe
- [ ] Validation force mot de passe
- [ ] Feedback visuel modifications

### ✅ Administration
- [ ] Menu Paramètres avec dropdown
- [ ] Page gestion utilisateurs avec table
- [ ] Actions éditer/désactiver/supprimer
- [ ] Modales confirmation et édition
- [ ] Système de permissions (Superadmin seulement)

### ✅ Design System
- [ ] shadcn/ui composants configurés
- [ ] Palette couleurs par poste
- [ ] Responsive design complet
- [ ] États hover/focus/loading

**🎨 Interface complète prête pour implémentation avec tous les détails visuels et interactions !**