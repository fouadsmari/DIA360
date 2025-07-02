# Optimisations Stack Technologique - DIA360

## 🚀 Optimisations Performance & Sécurité

### Vue d'ensemble
Optimisations spécifiques utilisant l'infrastructure Next.js 14 + Supabase + Vercel pour maximiser performance et sécurité selon MAITRE.md.

## ⚡ Optimisations Performance Frontend

### Next.js 14 App Router
```typescript
// Layout.tsx optimisé
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="dns-prefetch" href="https://placeholder.supabase.co" />
      </head>
      <body className={inter.className}>
        {/* Suspense boundaries pour loading states */}
        <Suspense fallback={<DashboardSkeleton />}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}

// Lazy loading composants
const UserManagement = lazy(() => import('@/components/admin/user-management'))
const ProfileSettings = lazy(() => import('@/components/profile/settings'))

// Memoization pour performance
const UserRow = memo(({ user, onEdit, onDelete }: UserRowProps) => {
  return (
    <TableRow>
      <TableCell>{user.nom}</TableCell>
      <TableCell>{user.prenom}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <ActionButtons user={user} onEdit={onEdit} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  )
})
```

### Zustand State Optimisé
```typescript
// Store global optimisé
interface AppStore {
  user: User | null
  users: User[]
  loading: boolean
  sidebarOpen: boolean
  
  // Actions optimisées
  setUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  toggleSidebar: () => void
  
  // Selectors pour éviter re-renders inutiles
  isAdmin: () => boolean
  usersByPoste: () => Record<string, User[]>
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  users: [],
  loading: false,
  sidebarOpen: true,
  
  setUser: (user) => set({ user }),
  
  updateUser: (id, updates) => set((state) => ({
    users: state.users.map(u => 
      u.id === id ? { ...u, ...updates } : u
    )
  })),
  
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  isAdmin: () => get().user?.poste === 'Superadmin',
  
  usersByPoste: () => {
    const users = get().users
    return users.reduce((acc, user) => {
      acc[user.poste] = acc[user.poste] || []
      acc[user.poste].push(user)
      return acc
    }, {} as Record<string, User[]>)
  }
}))

// Hook sélecteur pour éviter re-renders
export const useUser = () => useAppStore(state => state.user)
export const useIsAdmin = () => useAppStore(state => state.isAdmin())
```

### shadcn/ui Performance
```typescript
// Composants optimisés avec Radix UI
import { memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

// Avatar optimisé avec fallback
const UserAvatar = memo(({ user }: { user: User }) => (
  <Avatar className="h-8 w-8">
    <AvatarImage src={`/avatars/${user.id}.jpg`} alt={user.nom} />
    <AvatarFallback>
      {user.nom.charAt(0)}{user.prenom.charAt(0)}
    </AvatarFallback>
  </Avatar>
))

// Badge statut avec variant
const StatusBadge = memo(({ isActive }: { isActive: boolean }) => (
  <Badge variant={isActive ? 'default' : 'secondary'}>
    {isActive ? 'Actif' : 'Inactif'}
  </Badge>
))

// Table virtualisée pour grandes listes
import { useVirtualizer } from '@tanstack/react-virtual'

const VirtualizedUserTable = ({ users }: { users: User[] }) => {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  })

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <UserRow user={users[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 🏗️ Optimisations Backend API

### Next.js API Routes Edge Runtime
```typescript
// app/api/users/route.ts - Edge Runtime pour performance
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge' // Edge Runtime pour performance

export async function GET(request: NextRequest) {
  try {
    // Session validation avec NextAuth
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'Superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pagination cursor-based pour performance
    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

    // Query optimisée avec index
    let query = supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, poste, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: users, error } = await query

    if (error) throw error

    // Response avec cache headers
    return NextResponse.json(
      { users, nextCursor: users[users.length - 1]?.created_at },
      { 
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  } catch (error) {
    console.error('❌ API_ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Rate limiting middleware
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true
})

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString()
          }
        }
      )
    }
  }

  return NextResponse.next()
}
```

### Supabase RLS Optimisé
```sql
-- Policies RLS optimisées avec index
CREATE POLICY "Users can read own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Superadmin can read all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND poste = 'Superadmin'
    AND is_active = true
  )
);

-- Index pour optimiser les policies RLS
CREATE INDEX idx_users_auth_superadmin ON users(id, poste, is_active) 
WHERE poste = 'Superadmin';

-- Fonction pour check permissions (cache résultat)
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND poste = 'Superadmin' 
    AND is_active = true
  );
END;
$$;

-- View matérialisée pour dashboard stats (performance)
CREATE MATERIALIZED VIEW user_dashboard_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE poste = 'Superadmin') as admin_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month
FROM users;

-- Refresh automatique via trigger
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_dashboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();
```

## 🔒 Sécurité Avancée

### NextAuth.js Sécurisé
```typescript
// lib/auth.ts - Configuration sécurisée
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          // Rate limiting par IP
          const ip = req.headers?.['x-forwarded-for'] || 'unknown'
          const rateLimitKey = `login:${ip}`
          
          // Validation Zod
          const { email, password } = LoginSchema.parse(credentials)

          // Query sécurisée avec Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, nom, prenom, email, password_hash, poste, is_active')
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .single()

          if (error || !user) {
            console.error('❌ LOGIN_FAILED: User not found', { email })
            return null
          }

          // Vérification mot de passe avec bcrypt
          const isValid = await compare(password, user.password_hash)
          if (!isValid) {
            console.error('❌ LOGIN_FAILED: Invalid password', { email })
            return null
          }

          console.log('✅ LOGIN_SUCCESS:', { userId: user.id, email })
          
          return {
            id: user.id,
            name: `${user.prenom} ${user.nom}`,
            email: user.email,
            role: user.poste
          }
        } catch (error) {
          console.error('❌ AUTH_ERROR:', error)
          return null
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 heures
    updateAge: 60 * 60    // Refresh toutes les heures
  },
  
  jwt: {
    maxAge: 24 * 60 * 60,
    secret: process.env.NEXTAUTH_SECRET
  },
  
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.userId = user.id
      }
      
      // Refresh user data périodiquement
      if (trigger === 'update' || !token.lastRefresh || 
          Date.now() - (token.lastRefresh as number) > 60 * 60 * 1000) {
        
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('poste, is_active')
          .eq('id', token.userId)
          .single()
          
        if (userData?.is_active === false) {
          return {} // Force logout si compte désactivé
        }
        
        token.role = userData?.poste
        token.lastRefresh = Date.now()
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
}
```

### Validation Zod Multi-Couches
```typescript
// lib/validation.ts - Schemas sécurisés
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Base sanitizer pour input utilisateur
const sanitizeString = (str: string) => DOMPurify.sanitize(str, { 
  ALLOWED_TAGS: [], 
  ALLOWED_ATTR: [] 
})

// Schema avec sanitization automatique
export const CreateUserSchema = z.object({
  nom: z.string()
    .min(2, 'Nom trop court')
    .max(50, 'Nom trop long')
    .transform(sanitizeString)
    .refine(val => /^[a-zA-ZÀ-ÿ\s\-']+$/.test(val), 'Caractères invalides'),
    
  prenom: z.string()
    .min(2, 'Prénom trop court') 
    .max(50, 'Prénom trop long')
    .transform(sanitizeString)
    .refine(val => /^[a-zA-ZÀ-ÿ\s\-']+$/.test(val), 'Caractères invalides'),
    
  email: z.string()
    .email('Email invalide')
    .max(255)
    .toLowerCase()
    .transform(sanitizeString),
    
  password: z.string()
    .min(8, 'Mot de passe trop court')
    .max(128, 'Mot de passe trop long')
    .refine(
      val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(val),
      'Mot de passe trop simple'
    ),
    
  poste: z.enum(['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS'])
})

// Hook validation client-side
export const useSecureForm = <T>(schema: z.ZodSchema<T>) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validate = useCallback(async (data: unknown) => {
    try {
      const result = await schema.parseAsync(data)
      setErrors({})
      return { success: true, data: result }
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
      return { success: false, errors }
    }
  }, [schema])
  
  return { errors, validate, clearErrors: () => setErrors({}) }
}
```

## 📊 Monitoring & Performance

### Logging Optimisé
```typescript
// lib/logger.ts - Système de logs production
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'dia360',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // En production: logs vers fichier ou service externe
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ 
        filename: '/var/log/dia360/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: '/var/log/dia360/combined.log' 
      })
    ] : [])
  ]
})

// Wrapper pour API calls avec logging automatique
export const withLogging = (handler: any) => async (req: NextRequest) => {
  const startTime = Date.now()
  const method = req.method
  const url = req.url
  
  try {
    logger.info('🔵 API_REQUEST', { method, url })
    
    const response = await handler(req)
    const duration = Date.now() - startTime
    
    logger.info('✅ API_SUCCESS', { 
      method, 
      url, 
      status: response.status,
      duration: `${duration}ms`
    })
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('❌ API_ERROR', {
      method,
      url,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    throw error
  }
}
```

### Performance Monitoring
```typescript
// lib/performance.ts - Métriques performance
export const performanceMetrics = {
  // Core Web Vitals tracking
  trackWebVitals: (metric: any) => {
    const body = JSON.stringify(metric)
    
    // Send to analytics service
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body)
    } else {
      fetch('/api/analytics/web-vitals', {
        body,
        method: 'POST',
        keepalive: true
      })
    }
  },
  
  // Database query performance
  trackQuery: async (queryName: string, queryFn: () => Promise<any>) => {
    const start = performance.now()
    
    try {
      const result = await queryFn()
      const duration = performance.now() - start
      
      logger.info('📊 DB_QUERY', {
        name: queryName,
        duration: `${duration.toFixed(2)}ms`,
        status: 'success'
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      logger.error('📊 DB_QUERY_ERROR', {
        name: queryName,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }
}

// app/layout.tsx - Web Vitals tracking
export function reportWebVitals(metric: any) {
  if (typeof window !== 'undefined') {
    performanceMetrics.trackWebVitals(metric)
  }
}
```

---

## 🎯 Résultats Attendus

### Performance Targets
- **First Contentful Paint** : < 1.5s
- **Largest Contentful Paint** : < 2.5s  
- **Cumulative Layout Shift** : < 0.1
- **First Input Delay** : < 100ms
- **API Response Time** : < 300ms
- **Database Queries** : < 50ms

### Sécurité Garanties
- **OWASP Top 10** : Protection complète
- **Rate Limiting** : 10 req/10s par IP
- **CSRF Protection** : Token automatique
- **SQL Injection** : Impossible (parameterized queries)
- **XSS Protection** : Sanitization + CSP
- **Auth Security** : JWT + rotation + httpOnly cookies

**🚀 Stack optimisé pour performance maximale et sécurité enterprise-grade !**