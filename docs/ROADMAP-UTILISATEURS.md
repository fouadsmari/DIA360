# Roadmap Développement Utilisateurs - DIA360

## 🎯 Spécifications Fonctionnelles Complètes

### Vue d'ensemble
Développement d'un système d'authentification et de gestion utilisateurs complet pour DIA360, respectant les règles strictes du fichier MAITRE.md avec intégration base de données réelle et logging exhaustif.

**🏗️ Stack Technologique Optimisé :**
- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Next.js API Routes + NextAuth.js + bcryptjs
- **Database** : Supabase PostgreSQL + Row Level Security (RLS)
- **State** : Zustand pour gestion état global
- **Validation** : Zod schemas côté client et serveur
- **Sécurité** : NextAuth.js + JWT + Supabase Auth + CSRF protection
- **Performance** : Next.js SSR/SSG + Vercel Edge Network + Database indexing

## 🔐 Phase 1 - Système d'Authentification (Priorité Haute)

### 1.1 Page de Connexion/Inscription
```typescript
// Fonctionnalités requises:
interface AuthPage {
  login: {
    fields: ['email', 'password']
    actions: ['se_connecter', 'mot_de_passe_oublie']
    validation: 'temps_reel'
    logging: 'erreurs_detaillees'
  }
  register: {
    fields: ['nom', 'prenom', 'email', 'password', 'poste']
    poste_dropdown: ['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS']
    validation: 'complete_stricte'
    save_to_db: 'obligatoire'
  }
  reset_password: {
    method: 'email_verification'
    logging: 'process_complet'
  }
}
```

### 1.2 Champs Formulaire Inscription
- **Nom** : Texte requis, min 2 caractères
- **Prénom** : Texte requis, min 2 caractères  
- **Email** : Format email valide + unicité BD
- **Mot de passe** : Min 8 caractères, complexité
- **Poste** : Dropdown obligatoire avec options:
  - Superadmin
  - Direction
  - Responsable
  - PUP
  - GMS

### 1.3 Base de Données DIA360 - Supabase Optimisé
```sql
-- Table users avec Row Level Security (RLS)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  poste VARCHAR(50) NOT NULL CHECK (poste IN ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sécurité Supabase : Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Politique RLS : Seuls les Superadmin peuvent voir tous les utilisateurs
CREATE POLICY "Superadmin can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
    )
  );

-- Index pour performance optimale
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_poste ON users(poste);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_auth_id ON users(id); -- Pour RLS performance
```

### 1.4 Système de Logging Exhaustif - Optimisé NextAuth.js
```typescript
// Intégration avec NextAuth.js callbacks + Winston logging
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth.log' })
  ]
})

// Callbacks NextAuth.js pour logging automatique
export const authOptions: NextAuthOptions = {
  callbacks: {
    async signIn({ user, account, profile }) {
      logger.info('🔑 LOGIN_ATTEMPT', { 
        email: user.email, 
        timestamp: new Date(),
        ip: profile?.ip 
      })
      return true
    },
    async jwt({ token, user, trigger }) {
      if (trigger === 'signIn') {
        logger.info('✅ LOGIN_SUCCESS', { 
          userId: user.id, 
          email: user.email,
          poste: user.poste 
        })
      }
      return token
    }
  }
}

// Console logs pour debugging end-to-end
const authLogger = {
  login: {
    attempt: (email) => console.log(`🔑 LOGIN_ATTEMPT: ${email} at ${new Date()}`),
    success: (user) => console.log(`✅ LOGIN_SUCCESS: User ${user.id} - ${user.nom} ${user.prenom}`),
    failed_credentials: (email) => console.error(`❌ LOGIN_FAILED: Invalid credentials for ${email}`),
    failed_inactive: (email) => console.error(`❌ LOGIN_FAILED: Account inactive for ${email}`),
    failed_db: (error) => console.error(`❌ LOGIN_ERROR: Database error - ${error.message}`)
  },
  register: {
    attempt: (email) => console.log(`📝 REGISTER_ATTEMPT: ${email}`),
    success: (user) => console.log(`✅ REGISTER_SUCCESS: New user ${user.id} created`),
    failed_email_exists: (email) => console.error(`❌ REGISTER_FAILED: Email ${email} already exists`),
    failed_validation: (errors) => console.error(`❌ REGISTER_FAILED: Validation errors - ${JSON.stringify(errors)}`),
    failed_db: (error) => console.error(`❌ REGISTER_ERROR: Database error - ${error.message}`)
  },
  reset_password: {
    request: (email) => console.log(`🔄 RESET_REQUEST: Password reset for ${email}`),
    success: (email) => console.log(`✅ RESET_SUCCESS: Password reset completed for ${email}`),
    failed_user_not_found: (email) => console.error(`❌ RESET_FAILED: User not found ${email}`),
    failed_email: (error) => console.error(`❌ RESET_ERROR: Email sending failed - ${error.message}`)
  }
}
```

## 🏠 Phase 2 - Interface Utilisateur Connecté (Priorité Moyenne)

### 2.1 Page d'Accueil avec Navigation - Optimisé shadcn/ui + Zustand
```typescript
// State management avec Zustand pour performance
interface DashboardStore {
  user: User | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setUser: (user: User) => void
}

// Composants shadcn/ui optimisés
interface DashboardLayout {
  components: {
    sidebar: 'Sheet + ScrollArea (shadcn/ui)'
    navigation: 'NavigationMenu (shadcn/ui)'
    header: 'DropdownMenu + Avatar (shadcn/ui)'
    icons: 'Lucide React'
  }
  performance: {
    lazy_loading: 'React.lazy() pour composants'
    memoization: 'React.memo() pour sidebar items'
    virtualization: 'Pour grandes listes utilisateurs'
  }
  sidebar: {
    collapsible: true
    default_state: 'ouvert'
    responsive: 'Mobile-first design'
    items: [
      { icon: 'Home', label: 'Accueil', route: '/dashboard' },
      { icon: 'Settings', label: 'Paramètres', submenu: ['Utilisateurs'] }
    ]
  }
  header: {
    user_info: {
      display: 'nom_prenom_utilisateur'
      position: 'droite'
      avatar: 'User initials avec shadcn/ui Avatar'
      menu: ['Profil', 'Déconnexion']
    }
  }
}
```

### 2.2 Header Utilisateur
- **Affichage** : "Nom Prénom" en haut à droite
- **Menu déroulant** avec options :
  - **Profil** : Accès modification compte
  - **Déconnexion** : Logout sécurisé

### 2.3 Sidebar Navigation
- **État par défaut** : Ouvert
- **Fonctionnalité** : Réductible/Extensible
- **Menu principal** :
  - 🏠 **Accueil** (page par défaut)
  - ⚙️ **Paramètres** (dropdown)

## 👤 Phase 3 - Gestion Profil Utilisateur (Priorité Moyenne)

### 3.1 Page Profil
```typescript
interface ProfilePage {
  display_info: {
    nom: 'readonly_from_db'
    prenom: 'readonly_from_db'  
    email: 'readonly_from_db'
    poste: 'readonly_from_db'
  }
  editable_fields: {
    password: {
      current_password: 'required'
      new_password: 'min_8_chars'
      confirm_password: 'match_validation'
    }
  }
  actions: ['save_changes', 'cancel']
  logging: 'profile_modifications'
}
```

### 3.2 Modification Mot de Passe
- **Mot de passe actuel** : Vérification obligatoire
- **Nouveau mot de passe** : Validation complexité
- **Confirmation** : Matching validation
- **Logging** : Toutes modifications tracées

## ⚙️ Phase 4 - Administration Utilisateurs (Priorité Moyenne)

### 4.1 Menu Paramètres
```typescript
interface SettingsMenu {
  dropdown_items: [
    {
      label: 'Utilisateurs'
      route: '/admin/users'
      permission: 'admin_access'
    }
  ]
}
```

### 4.2 Page Gestion Utilisateurs
```typescript
interface UsersManagement {
  table_columns: [
    'nom',
    'prenom', 
    'email',
    'poste',
    'statut',
    'gestion'
  ]
  actions_per_row: [
    {
      icon: 'Edit'
      action: 'edit_user'
      modal: 'user_edit_form'
    },
    {
      icon: 'UserX'
      action: 'toggle_active_status'
      confirmation: 'required'
    },
    {
      icon: 'Trash'
      action: 'delete_user'
      confirmation: 'double_confirmation'
    }
  ]
  permissions: 'admin_only'
  logging: 'all_admin_actions'
}
```

### 4.3 Actions Administration
- **Éditer** : Modal modification infos utilisateur
- **Désactiver/Activer** : Toggle statut `is_active`
- **Supprimer** : Suppression définitive (double confirmation)
- **Logging** : Traçabilité complète actions admin

## 🗄️ Phase 5 - Intégration Base de Données (Priorité Haute)

### 5.1 Schema Complet Supabase - Performance + Sécurité Optimisées
```sql
-- Table auth_logs avec partitioning pour performance
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partitions mensuelles pour performance
CREATE TABLE auth_logs_y2024m01 PARTITION OF auth_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Index composites pour requêtes fréquentes
CREATE INDEX idx_auth_logs_user_action ON auth_logs(user_id, action, created_at);
CREATE INDEX idx_auth_logs_status_date ON auth_logs(status, created_at);

-- RLS pour auth_logs
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON auth_logs
  FOR SELECT USING (user_id = auth.uid());

-- Fonction optimisée avec moins d'overhead
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Logging asynchrone pour performance
  PERFORM pg_notify('user_changes', json_build_object(
    'user_id', NEW.id,
    'action', TG_OP,
    'timestamp', NOW()
  )::text);
  
  INSERT INTO auth_logs (user_id, action, status, details)
  VALUES (NEW.id, TG_OP, 'success', 
    json_build_object('nom', NEW.nom, 'email', NEW.email, 'poste', NEW.poste)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger optimisé
CREATE TRIGGER user_audit_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION log_user_changes();

-- Cache materialized view pour dashboard metrics
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  poste,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  MAX(created_at) as last_registration
FROM users 
GROUP BY poste;

-- Refresh automatique du cache
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_user_stats();
```

### 5.2 APIs Optimisées Next.js 14 + Supabase
```typescript
// API Routes avec Next.js 14 App Router + Edge Runtime
const apiEndpoints = {
  auth: {
    'GET/POST /api/auth/[...nextauth]': 'NextAuth.js handler (déjà configuré)',
    'POST /api/auth/register': {
      handler: 'Edge Runtime pour performance',
      validation: 'Zod schema validation',
      security: 'Rate limiting + CSRF protection',
      database: 'Supabase client avec RLS'
    },
    'POST /api/auth/reset-password': {
      method: 'Supabase Auth avec email templates',
      security: 'Token expiration + rate limiting'
    }
  },
  users: {
    'GET /api/users': {
      permission: 'Superadmin seuls (RLS automatique)',
      pagination: 'Cursor-based pour performance',
      caching: 'Next.js revalidation + SWR client-side',
      optimization: 'SELECT spécifique (pas SELECT *)'
    },
    'PUT /api/users/[id]': {
      validation: 'Zod + ownership check',
      audit: 'Auto-logging via triggers Supabase'
    },
    'DELETE /api/users/[id]': {
      soft_delete: 'is_active = false (recommandé)',
      hard_delete: 'CASCADE check + confirmation'
    }
  },
  profile: {
    'GET /api/profile': {
      caching: 'Edge cache + client SWR',
      security: 'JWT token validation automatique'
    }
  }
}

// Middleware Next.js pour sécurité globale
export const middleware = async (request: NextRequest) => {
  // Rate limiting
  const rateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s")
  })
  
  // CSRF protection pour API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const csrfToken = request.headers.get('x-csrf-token')
    if (!csrfToken) return new Response('CSRF token missing', { status: 403 })
  }
  
  return NextResponse.next()
}
```

## 🔧 Phase 6 - Sécurité et Validation (Priorité Haute)

### 6.1 Validation Optimisée Zod + TypeScript
```typescript
// Schemas Zod réutilisables avec messages d'erreur français
export const UserSchema = z.object({
  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom contient des caractères invalides'),
  
  prenom: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom contient des caractères invalides'),
  
  email: z.string()
    .email('Format d\'email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Le mot de passe doit contenir: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial'),
  
  poste: z.enum(['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS'], {
    errorMap: () => ({ message: 'Poste invalide' })
  })
})

// Types TypeScript générés automatiquement
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof UserSchema>
export type UpdateUser = Partial<z.infer<typeof UserSchema>>

// Hook personnalisé pour validation en temps réel
export const useFormValidation = (schema: z.ZodSchema) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validate = useCallback((data: any) => {
    try {
      schema.parse(data)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors
        setErrors(
          Object.entries(fieldErrors).reduce((acc, [key, messages]) => ({
            ...acc,
            [key]: messages?.[0] || 'Erreur de validation'
          }), {})
        )
      }
      return false
    }
  }, [schema])
  
  return { errors, validate }
}
```

### 6.2 Protection Routes
- **Pages admin** : Vérification rôle Superadmin
- **API sensibles** : Authentification JWT
- **Actions critiques** : Double validation

## 📝 Phase 7 - Logging et Monitoring (Priorité Haute)

### 7.1 Console Logs Détaillés
```typescript
// Scenarios end-to-end à logger
const loggingScenarios = [
  'Tentative connexion avec email inexistant',
  'Tentative connexion avec mot de passe incorrect', 
  'Tentative connexion compte désactivé',
  'Succès connexion avec détails utilisateur',
  'Échec inscription email déjà utilisé',
  'Succès inscription avec données complètes',
  'Demande reset password email inexistant',
  'Succès reset password avec confirmation',
  'Modification profil utilisateur',
  'Actions admin sur autres utilisateurs',
  'Erreurs base de données avec stack trace',
  'Erreurs validation avec détails champs'
]
```

### 7.2 Monitoring Performance
- **Temps réponse** APIs < 500ms
- **Erreurs DB** : Logging complet
- **Sessions** : Gestion timeout
- **Sécurité** : Tentatives malveillantes

## ✅ Critères de Validation

### Tests End-to-End Obligatoires
1. **Inscription complète** : Tous champs → DB → Confirmation
2. **Connexion réussie** : Redirection dashboard + session
3. **Connexion échouée** : Messages erreur appropriés
4. **Reset password** : Email → Validation → Nouveau mdp
5. **Navigation** : Sidebar + Header fonctionnels
6. **Profil** : Affichage + Modification mot de passe
7. **Admin users** : CRUD complet avec confirmations
8. **Logging** : Toutes actions tracées console + DB

### Performance Requise - Optimisations Stack
- **Page load** : < 2 secondes (Next.js SSG + Vercel Edge)
- **API calls** : < 500ms (Edge Runtime + Connection pooling)
- **Database queries** : < 100ms (Index optimisés + RLS + Materialized views)
- **Session management** : NextAuth.js JWT + Redis cache
- **Bundle size** : Code splitting automatique Next.js
- **Images** : Next.js Image component avec WebP
- **Fonts** : next/font avec preload automatique
- **Client hydration** : Lazy loading + React.memo()
- **Database connections** : Supabase connection pooling
- **CDN** : Vercel Edge Network global

### Sécurité Obligatoire - Stack Sécurisé
- **Mots de passe** : bcryptjs (14 rounds) + salt automatique
- **Validation** : Zod schemas client + serveur (double validation)
- **Permissions** : Supabase RLS + NextAuth.js roles
- **Audit trail** : Triggers PostgreSQL + Winston logging
- **CSRF Protection** : NextAuth.js intégré + middleware personnalisé
- **Rate Limiting** : Upstash Redis + sliding window
- **SQL Injection** : Supabase client protégé (parameterized queries)
- **XSS Protection** : Next.js automatic escaping + CSP headers
- **JWT Security** : Rotation automatique + secure httpOnly cookies
- **HTTPS Enforced** : Vercel automatic SSL + HSTS headers
- **Secrets Management** : Vercel Environment Variables
- **Input Sanitization** : DOMPurify pour contenu utilisateur

---

## 🚀 Ordre de Développement Recommandé

1. **Database Schema** → Supabase setup complet
2. **Auth APIs** → Backend authentification
3. **Login/Register Pages** → Frontend forms
4. **Dashboard Layout** → Navigation structure  
5. **Profile Management** → User self-service
6. **Admin Users** → Administration interface
7. **Logging System** → Monitoring complet
8. **Testing E2E** → Validation finale

**🎯 Objectif : Système d'authentification et gestion utilisateurs production-ready avec données réelles et logging exhaustif selon MAITRE.md**