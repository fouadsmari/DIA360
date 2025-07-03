# Règles & Instructions Maîtres - DIA360

## 🚨 RÈGLES ABSOLUES

### 1. Données Réelles Uniquement

- ❌ **INTERDIT** : Mock data, fake data, données simulées
- ❌ **INTERDIT ABSOLU** : Fichiers avec "simple", "temp", "test" dans le nom
- ❌ **INTERDIT ABSOLU** : Solutions temporaires ou simplifiées
- ✅ **OBLIGATOIRE** : Connexions API réelles dès le début
- ✅ **OBLIGATOIRE** : Tests avec vraies données utilisateurs
- ✅ **OBLIGATOIRE** : Validation avec volumes réels de données
- ✅ **OBLIGATOIRE** : Code production-ready uniquement

### 2. Développement Incrémental

- 🎯 **1 fonctionnalité = 1 mini-tâche**
- 🧪 **Test après chaque étape**
- 💾 **Commit après chaque succès**
- 🚫 **Pas de développement en parallèle avant validation**
- ✅ **OBLIGATOIRE** : Vérifier erreurs Vercel via API après chaque push GitHub
- ✅ **OBLIGATOIRE** : Corriger immédiatement toute erreur de build/déploiement
- 🔄 **WORKFLOW VERCEL OBLIGATOIRE** :
  1. `git push origin main`
  2. Attendre 2-3 minutes pour le déploiement
  3. Vérifier sur https://vercel.com/fouadsmari-6640s-projects/dia360/deployments
  4. Si erreur de build → Corriger immédiatement
  5. Si succès → Continuer développement

### 3. Gestion d'Erreurs Stricte

- 🔍 **Logging détaillé** pour chaque API call
- 🛡️ **Gestion exhaustive** des cas d'erreur
- 📊 **Monitoring temps réel** des performances
- 🔄 **Recovery automatique** quand possible

### 4. Validation Technique Systématique

- ✅ **OBLIGATOIRE** : Vérifier compatibilité avec DIA360 avant toute implémentation
- ✅ **OBLIGATOIRE** : Valider conformité aux bonnes pratiques communauté
- ✅ **OBLIGATOIRE** : Évaluer sécurité et performance de chaque solution
- ✅ **OBLIGATOIRE** : Proposer alternatives si demande non recommandée
- ❌ **INTERDIT** : Implémenter sans validation technique préalable

_Rôle de guide technique : Le développeur assistant protège le projet contre les mauvaises décisions, même si demandées explicitement._

### 5. Gestion Organisation & Qualité

- ✅ **OBLIGATOIRE** : Consulter CLAUDE.md avant toute action
- ✅ **OBLIGATOIRE** : Scripts permanents dans scripts/ uniquement
- ✅ **OBLIGATOIRE** : Scripts temporaires dans scripts/test-temporaires/ uniquement
- ✅ **OBLIGATOIRE** : Analyser cause racine de chaque problème
- ✅ **OBLIGATOIRE** : Corriger à la source (code/outil responsable)
- ✅ **OBLIGATOIRE** : Mettre à jour roadmap-developpement.md après chaque phase/étape complétée
- ❌ **INTERDIT** : Contourner problèmes avec solutions temporaires
- ❌ **INTERDIT** : Créer markdowns docs/ sans demande explicite

## 🚀 INFRASTRUCTURE CLOUD - VERCEL + SUPABASE

### Application DIA360
```bash
# ✅ DÉPLOIEMENT CLOUD - ARCHITECTURE VALIDÉE
🎯 SOLUTION CLOUD NATIVE PRODUCTION

# SERVICES CLOUD DIA360:
🔹 VERCEL : Hosting + API Routes + Auto-deployment
🔹 SUPABASE : PostgreSQL + Auth + Storage + Edge Functions
🔹 GITHUB : Repository + CI/CD + Actions

# AVANTAGES SOLUTIONS CLOUD:
✅ Scalabilité automatique
✅ SSL/TLS natif
✅ CDN global
✅ Monitoring intégré
✅ Backup automatique
✅ Zero-config deployment

# WORKFLOW DÉPLOIEMENT:
git push origin main → Vercel auto-deploy → Production live
```

### Base de Données Supabase
```bash
# Configuration PostgreSQL Supabase
Database: DIA360 Project
Host: aws-0-ca-central-1.pooler.supabase.com
Port: 6543
SSL: required

# URL Connexion
postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres

# 🔐 ACCÈS DIRECT BASE DE DONNÉES (Assistant Claude)
# ==========================================
# Project Name: DIA360
# Project ID: zvqvqcbsmvtrcrjeubap
# Database Password: 8nvbboTA8lNuH7xG
# Direct Connection: postgresql://postgres:8nvbboTA8lNuH7xG@db.zvqvqcbsmvtrcrjeubap.supabase.co:5432/postgres
# Pooler Connection: postgresql://postgres.zvqvqcbsmvtrcrjeubap:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres

# 🛠️ SUPABASE CLI INSTALLÉ
# ==========================================
# Installation: brew install supabase/tap/supabase
# Version: 2.30.4
# Login: supabase login --token sbp_c885edc160e47de9b4ca048ec7746f759b80a074
# Link: supabase link --project-ref zvqvqcbsmvtrcrjeubap

# Interface Web Supabase Dashboard
URL: https://supabase.com/dashboard/project/zvqvqcbsmvtrcrjeubap
Features: 
- Table Editor
- SQL Editor  
- Auth Users
- Storage
- Edge Functions
- Logs & Analytics
```

### Variables Environnement Vercel
```bash
# 🎯 CONFIGURATION VERCEL PRODUCTION
# ==========================================
# VARIABLE                | VALEUR                              | USAGE
# ----------------------- |------------------------------------ |------------------
# DATABASE_URL            | postgresql://postgres.[ID]:[PASS]  | Prisma connection
# NEXTAUTH_URL            | https://dia360.vercel.app          | Auth callbacks
# NEXTAUTH_SECRET         | [GENERATED_SECRET]                 | JWT signing
# SUPABASE_URL            | https://[PROJECT_ID].supabase.co   | Supabase API
# SUPABASE_ANON_KEY       | [PUBLIC_ANON_KEY]                  | Frontend auth
# SUPABASE_SERVICE_KEY    | [PRIVATE_SERVICE_KEY]              | Backend admin

# Toutes variables automatiquement injectées dans build Vercel
```

### 🚨 WORKFLOW OBLIGATOIRE DE DÉVELOPPEMENT

**🎯 CLOUD-FIRST DEVELOPMENT** :

### 🚀 **Développement Local → Cloud**
```bash
# 1. Développement local avec Supabase
npm run dev                    # Next.js local + Supabase cloud

# 2. Tests & validation
npm run test                   # Tests unitaires
npm run build                  # Build validation
npm run lint                   # Code quality

# 3. Deploy automatique
git add .
git commit -m "feature: nouvelle fonctionnalité"
git push origin main           # Auto-deploy Vercel

# 4. VÉRIFICATION OBLIGATOIRE VERCEL
# ⚠️ ATTENDRE 2-3 MINUTES APRÈS PUSH
# Vérifier sur: https://vercel.com/fouadsmari-6640s-projects/dia360/deployments
# Si ERREUR BUILD → CORRIGER IMMÉDIATEMENT
# Si SUCCESS → Continuer

# 5. Monitoring production
vercel logs --follow           # Logs temps réel
```

### 🔄 **Monitoring Continue**
- **Vercel Analytics** : Performance automatique
- **Supabase Dashboard** : DB monitoring + logs
- **GitHub Actions** : CI/CD validation
- **Real-time logs** : Debugging production

❌ **FINI** : Infrastructure locale complexe
✅ **RÉSULTAT** : Cloud-native, scalable, production-ready

## 📋 WORKFLOW DE DÉVELOPPEMENT CLOUD

### Phase de Planification
1. **Documentation** : Écrire le concept avant le code
2. **Todo List** : Découper en micro-tâches
3. **Cloud Design** : Architecture Vercel + Supabase
4. **Test Plan** : Définir critères succès production

### Phase de Développement
1. **Setup Cloud** : Supabase + Vercel configuration
2. **API First** : Routes Next.js + Prisma
3. **UI Second** : Interface après validation données
4. **Integration** : Tests production environment

### Phase de Validation
1. **Données réelles** testées en production
2. **Performance** mesurée via Vercel Analytics
3. **Erreurs** gérées avec monitoring cloud
4. **Documentation** mise à jour

## 🔧 STANDARDS TECHNIQUES CLOUD

### Code Quality
```typescript
// ✅ BON : Type strict + validation Zod
interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const UserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['USER', 'ADMIN'])
});

// ❌ MAUVAIS : Type any
const user: any = data;
```

### Gestion d'Erreurs Cloud
```typescript
// ✅ BON : Logging Vercel + Supabase
try {
  const data = await supabase.from('users').select('*');
  console.log('✅ Users fetched:', data.data?.length);
  return data;
} catch (error) {
  console.error('❌ Supabase error:', error);
  // Logs automatiquement visibles dans Vercel Dashboard
  throw new Error('Database connection failed');
}

// ❌ MAUVAIS : Console.log seulement
catch (error) {
  console.log('Error:', error);
}
```

### Architecture Cloud
```
DIA360 Cloud Stack:
├── Vercel Frontend      # Next.js + API Routes
├── Supabase Backend     # PostgreSQL + Auth + Storage
├── GitHub CI/CD         # Auto-deployment
└── Monitoring           # Vercel Analytics + Supabase Logs
```

## 🚫 INTERDICTIONS ABSOLUES

1. **❌ Mock data** en production
2. **❌ Console.log** en production (utiliser Vercel logs)
3. **❌ Secrets** en dur dans le code
4. **❌ Any type** sauf cas exceptionnels
5. **❌ Deploy** sans tests
6. **❌ Infrastructure locale** complexe
7. **❌ Solutions temporaires** ou contournements
8. **❌ Données hardcodées** ou simulées

## ✅ OBLIGATIONS CLOUD

1. **✅ TypeScript strict** mode
2. **✅ Prisma** avec Supabase
3. **✅ NextAuth** authentification
4. **✅ Vercel deployment** automatique
5. **✅ Environment variables** Vercel
6. **✅ Monitoring** production intégré
7. **✅ SSL/TLS** natif
8. **✅ Backup** automatique Supabase
9. **✅ Scalabilité** auto Vercel
10. **✅ Performance** optimisée cloud
11. **✅ VÉRIFICATION BUILD VERCEL** après chaque push
12. **✅ CORRECTION IMMÉDIATE** des erreurs de déploiement

## 🔧 MAINTENANCE BASE DONNÉES FACEBOOK

### Scripts de nettoyage automatique

**URGENT**: Si données dupliquées Facebook détectées:

```bash
# 1. Nettoyer doublons existants
psql $SUPABASE_URL -f scripts/clean-facebook-duplicates.sql

# 2. Renforcer contraintes anti-doublons  
psql $SUPABASE_URL -f scripts/strengthen-facebook-constraints.sql

# 3. Vérifier intégrité
psql $SUPABASE_URL -c "SELECT * FROM check_facebook_data_integrity();"
```

### Protection anti-boucles API

- **❌ useEffect automatiques** sur pages Facebook désactivés
- **✅ Boutons validation manuels** ajoutés sur toutes les pages
- **✅ Contraintes UNIQUE** renforcées  
- **✅ Auto-nettoyage logs** activé (30 jours)
- **✅ Monitoring santé données** via vues

## 🔄 PROCESS DE REVIEW CLOUD

### Avant Merge
- ✅ Tests passent localement
- ✅ Build Vercel réussit
- ✅ Performance OK (< 2s)
- ✅ Sécurité validée
- ✅ Documentation mise à jour

### Après Deploy Vercel
- ✅ Monitoring Vercel actif
- ✅ Logs Supabase vérifiés
- ✅ Analytics performance surveillés
- ✅ Rollback automatique disponible

## 🎯 MÉTRIQUES SUCCÈS CLOUD

### Performance
- ⚡ **Build time** : < 2 minutes
- 🚀 **Deploy time** : < 60 secondes  
- 📊 **Page load** : < 2 secondes
- 🔌 **API response** : < 500ms
- ⏱️ **Cold start** : < 1 seconde

### Fiabilité
- 🔒 **Uptime** : > 99.9%
- 🛡️ **SSL** : Grade A+
- 📈 **Scalability** : Auto
- 💾 **Data backup** : Continu
- 🔍 **Monitoring** : Temps réel