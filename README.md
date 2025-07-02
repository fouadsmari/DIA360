# DIA360 - Digital Intelligence Analytics Platform

## 🎯 Plateforme d'Analyse et Business Intelligence Moderne

**DIA360** est une plateforme cloud-native construite avec Next.js 14, TypeScript, Supabase et Vercel pour offrir des insights en temps réel et des tableaux de bord interactifs.

## 🚀 Technologies

- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Next.js API Routes + Prisma + Supabase
- **Database** : PostgreSQL (Supabase)
- **Auth** : NextAuth.js + Supabase Auth
- **Deployment** : Vercel + GitHub Actions
- **Testing** : Jest + Playwright

## 📚 Documentation

Consultez le dossier `docs/` pour la documentation complète :

### 📋 Documents Principaux
- **[MAITRE.md](docs/MAITRE.md)** - Règles de développement et standards
- **[ROADMAP-INFRASTRUCTURE.md](docs/ROADMAP-INFRASTRUCTURE.md)** - Guide d'installation infrastructure
- **[CONTEXT.md](docs/CONTEXT.md)** - Contexte application et structure fichiers
- **[TECHNOLOGIES.md](docs/TECHNOLOGIES.md)** - Stack technique détaillé
- **[TOKENS.md](docs/TOKENS.md)** - Tokens et credentials (fichier privé, non commité)

## 🏗️ Structure Projet

```
DIA360/
├── docs/                    # Documentation complète
├── app/                     # Next.js App Router (à créer)
├── components/              # Composants réutilisables (à créer)
├── lib/                     # Utilitaires et services (à créer)
├── prisma/                  # Base de données (à créer)
└── README.md               # Ce fichier
```

## 🚀 Quick Start

### 1. Consulter la Documentation
Commencez par lire les documents dans l'ordre :
1. `docs/MAITRE.md` - Règles essentielles
2. `docs/ROADMAP-INFRASTRUCTURE.md` - Installation
3. `docs/CONTEXT.md` - Architecture générale

### 2. Setup Initial
Suivez le guide dans `docs/ROADMAP-INFRASTRUCTURE.md` pour :
- Configuration Supabase
- Setup Vercel
- Installation dépendances
- Configuration environnement

### 3. Développement
Respectez les règles du `docs/MAITRE.md` :
- Données réelles uniquement
- Développement incrémental
- Tests après chaque étape
- Code production-ready

## 🔐 Repository Privé

- **Repository** : `https://github.com/fouadsmari/DIA360`
- **Propriétaire** : fouadsmari (Fouad Smari)
- **Visibilité** : 🔒 **PRIVÉ** (confidentiel)
- **SSH configuré** : ✅ Opérationnel

## 📈 Roadmap

### Phase 1 - Infrastructure (2-3 jours)
- [ ] Setup Vercel + Supabase + GitHub
- [ ] Configuration NextAuth.js
- [ ] Base Prisma schema
- [ ] Design system de base

### Phase 2 - Core Features (1 semaine)
- [ ] Dashboard principal avec métriques
- [ ] Gestion utilisateurs + permissions
- [ ] API Routes principales
- [ ] Panel administration

### Phase 3 - Analytics (1 semaine)
- [ ] Graphiques interactifs
- [ ] Générateur de rapports
- [ ] Système de filtres
- [ ] Updates temps réel

### Phase 4 - Polish (3-5 jours)
- [ ] Animations et UX
- [ ] Optimisations performance
- [ ] Tests complets
- [ ] Documentation utilisateur

## 🎯 Métriques Succès

- **Performance** : Page load < 2s, API < 500ms
- **Qualité** : Test coverage > 80%, TypeScript strict
- **Business** : Onboarding < 5min, Uptime > 99.9%

---

**🚀 Prêt pour le développement d'une plateforme analytics moderne et scalable !**