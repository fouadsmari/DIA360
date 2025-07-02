# Technologies Stack - DIA360

## 🚀 Stack Technique Complet

### Frontend
- **Next.js 14** - App Router (React 18.3.1)
- **TypeScript 5.8.3** - Mode strict
- **Tailwind CSS 3.4** - Styling & responsive
- **shadcn/ui** - Composants UI (Radix UI)
- **Lucide React** - Icônes
- **Zustand** - State management

### Backend
- **Next.js API Routes** - API REST
- **Prisma 5.22** - ORM pour base de données
- **NextAuth.js 4.24** - Authentification + sessions
- **bcryptjs** - Hash mots de passe
- **jsonwebtoken** - JWT tokens

### Base de Données
- **Supabase** - PostgreSQL cloud
- **Redis** - Cache (via Supabase ou externe)

### Déploiement & Hosting
- **Vercel** - Déploiement automatique
- **GitHub** - Versioning + CI/CD

### Développement & Tests
- **Jest** - Tests unitaires
- **Playwright** - Tests E2E
- **ESLint + Prettier** - Code quality
- **TypeScript** - Type checking

### Sécurité & Auth
- **NextAuth.js** - Sessions & OAuth
- **Prisma** - Protection SQL injection
- **bcryptjs** - Hash sécurisé
- **CSRF protection** - Intégré Next.js

### Monitoring & Logs
- **Winston** - Logging structuré
- **Vercel Analytics** - Performance
- **Supabase Dashboard** - Database monitoring

## 📦 Dépendances Principales

### Production
```json
{
  "@prisma/client": "^5.22.0",
  "@supabase/supabase-js": "^2.50.2",
  "next": "^14.2.30",
  "next-auth": "^4.24.11",
  "react": "^18.3.1",
  "typescript": "^5.8.3",
  "tailwindcss": "^3.4.17",
  "prisma": "^5.22.0",
  "bcryptjs": "^3.0.2",
  "zustand": "^5.0.6",
  "lucide-react": "^0.525.0"
}
```

### Développement
```json
{
  "@playwright/test": "^1.53.1",
  "@types/jest": "^30.0.0",
  "@typescript-eslint/eslint-plugin": "^8.35.0",
  "jest": "^30.0.3",
  "prettier": "^3.6.2",
  "eslint": "^9.30.0"
}
```

## 🏗️ Architecture

### Dossiers Principaux
```
DIA360/
├── app/                 # Next.js App Router
├── components/          # Composants réutilisables
├── lib/                # Utilitaires, APIs, DB
├── prisma/             # Schema base de données
├── types/              # Types TypeScript
├── public/             # Assets statiques
├── docs/               # Documentation
└── scripts/            # Scripts automatisation
```

### Configuration
- **Tailwind CSS** - Design system
- **Prisma** - ORM avec Supabase
- **NextAuth** - Auth complète
- **TypeScript** - Configuration strict
- **ESLint + Prettier** - Standards code

## 🌐 Services Cloud

### Supabase
- **PostgreSQL** - Base de données principale
- **Auth** - Authentification utilisateurs
- **Storage** - Fichiers (si nécessaire)
- **Edge Functions** - Serverless (optionnel)

### Vercel
- **Hosting** - Déploiement automatique
- **Edge Runtime** - Performance globale
- **Analytics** - Monitoring performance
- **Functions** - API Routes serverless

### GitHub
- **Versioning** - Git repository
- **Actions** - CI/CD automatique
- **Issues** - Gestion bugs/features
- **Releases** - Versioning production