# 🔄 Migration Facebook Database - Plan d'exécution

## 📋 Vue d'ensemble

Ce document contient le plan complet de migration de la base de données Facebook Ads pour corriger les incohérences critiques identifiées entre la structure actuelle et les spécifications FACEBOOK.md.

## ⚠️ AVERTISSEMENTS CRITIQUES

**🚨 BACKUP OBLIGATOIRE** : Cette migration modifie des structures critiques. Un backup complet est **REQUIS** avant exécution.

**🚨 ORDRE D'EXÉCUTION** : Les scripts doivent être exécutés dans l'ordre exact spécifié. Ne pas modifier l'ordre.

**🚨 DOWNTIME** : Certaines opérations nécessitent un arrêt temporaire de l'application (RLS disable/enable).

---

## 📊 État actuel vs cible

### Structure actuelle (Problématique)
- ❌ Architecture hybride `user_id UUID` + `compte_id INTEGER`
- ❌ Politiques RLS avec logique "OU" dangereuse
- ❌ Index non optimisés pour l'architecture compte
- ❌ Colonnes de gestion d'erreurs manquantes
- ❌ Types de données inconsistants

### Structure cible (FACEBOOK.md)
- ✅ Architecture unifiée basée sur `compte_id`
- ✅ Politiques RLS sécurisées
- ✅ Index optimisés pour performance
- ✅ Gestion complète des erreurs Facebook
- ✅ Types de données cohérents

---

## 🗂️ Scripts de migration

### 📄 Phase 1 - Analyse et préparation (SÉCURITAIRE)
- `01-analyze-current-structure.sql` - Analyse de l'état actuel
- `02-backup-verification.sql` - Vérification du backup
- `03-prepare-migration.sql` - Préparation de la migration

### 📄 Phase 2 - Corrections urgentes (24h MAX)
- `04-disable-rls-temporarily.sql` - Désactivation temporaire RLS
- `05-add-missing-columns.sql` - Ajout colonnes critiques
- `06-fix-rls-policies.sql` - Correction politiques de sécurité
- `07-enable-rls-secure.sql` - Réactivation RLS sécurisée

### 📄 Phase 3 - Migration complète (1 semaine)
- `08-migrate-data-types.sql` - Migration UUID → BIGSERIAL
- `09-update-constraints.sql` - Mise à jour contraintes
- `10-rebuild-indexes.sql` - Reconstruction index optimisés
- `11-add-materialized-views.sql` - Vues matérialisées performance

### 📄 Phase 4 - Validation et nettoyage
- `12-validate-migration.sql` - Tests de validation
- `13-cleanup-old-structure.sql` - Nettoyage anciennes structures
- `14-performance-tests.sql` - Tests de performance

---

## ⏱️ Planning d'exécution recommandé

| Phase | Durée | Fenêtre | Impact app |
|-------|-------|---------|------------|
| Phase 1 | 30 min | Heures ouvrables | ✅ Aucun |
| Phase 2 | 2-4h | Heures creuses | ⚠️ Disponibilité réduite |
| Phase 3 | 2-3 jours | Week-end | 🚫 Maintenance planifiée |
| Phase 4 | 1-2h | Heures ouvrables | ✅ Aucun |

---

## 🎯 Checklist de pré-migration

### ✅ Vérifications obligatoires
- [ ] Backup complet de la base Supabase
- [ ] Export des données Facebook existantes
- [ ] Notification équipe de la maintenance
- [ ] Environnement de test préparé
- [ ] Scripts validés en environnement de test
- [ ] Rollback plan préparé

### ✅ Outils requis
- [ ] Accès admin Supabase
- [ ] SQL Editor Supabase
- [ ] Monitoring des performances
- [ ] Logs d'application

---

## 🚨 Procédure d'urgence (Rollback)

En cas de problème critique durant la migration :

1. **STOP immédiat** de l'exécution des scripts
2. **Restaurer backup** complet
3. **Vérifier intégrité** des données
4. **Notifier équipe** du rollback
5. **Analyser cause** avant nouvelle tentative

---

## 📞 Contacts d'urgence

- **DBA Principal** : [À définir]
- **Équipe Dev** : [À définir]
- **Support Supabase** : [Si nécessaire]

---

## 📋 Scripts à exécuter

Cliquez sur chaque lien pour accéder au script correspondant :

### Phase 1 - Analyse (Sécuritaire)
1. [📄 01-analyze-current-structure.sql](./scripts/migration-facebook/01-analyze-current-structure.sql)
2. [📄 02-backup-verification.sql](./scripts/migration-facebook/02-backup-verification.sql)
3. [📄 03-prepare-migration.sql](./scripts/migration-facebook/03-prepare-migration.sql)

### Phase 2 - Corrections urgentes
4. [📄 04-disable-rls-temporarily.sql](./scripts/migration-facebook/04-disable-rls-temporarily.sql)
5. [📄 05-add-missing-columns.sql](./scripts/migration-facebook/05-add-missing-columns.sql)
6. [📄 06-fix-rls-policies.sql](./scripts/migration-facebook/06-fix-rls-policies.sql)
7. [📄 07-enable-rls-secure.sql](./scripts/migration-facebook/07-enable-rls-secure.sql)

### Phase 3 - Migration complète
8. [📄 08-migrate-data-types.sql](./scripts/migration-facebook/08-migrate-data-types.sql)
9. [📄 09-update-constraints.sql](./scripts/migration-facebook/09-update-constraints.sql)
10. [📄 10-rebuild-indexes.sql](./scripts/migration-facebook/10-rebuild-indexes.sql)
11. [📄 11-add-materialized-views.sql](./scripts/migration-facebook/11-add-materialized-views.sql)

### Phase 4 - Validation
12. [📄 12-validate-migration.sql](./scripts/migration-facebook/12-validate-migration.sql)
13. [📄 13-cleanup-old-structure.sql](./scripts/migration-facebook/13-cleanup-old-structure.sql)
14. [📄 14-performance-tests.sql](./scripts/migration-facebook/14-performance-tests.sql)

---

## 📈 Métriques de succès

### Avant migration
- [ ] Temps de réponse moyen queries Facebook
- [ ] Nombre d'erreurs RLS par jour
- [ ] Taille base de données
- [ ] Performance index actuels

### Après migration
- [ ] ✅ Amélioration performance > 50%
- [ ] ✅ Erreurs RLS = 0
- [ ] ✅ Architecture 100% unifiée
- [ ] ✅ Gestion d'erreurs complète

---

## 📝 Log d'exécution

| Script | Date | Heure | Statut | Durée | Notes |
|--------|------|-------|--------|-------|-------|
| 01-analyze | | | ⏳ | | |
| 02-backup | | | ⏳ | | |
| 03-prepare | | | ⏳ | | |
| 04-disable-rls | | | ⏳ | | |
| 05-add-columns | | | ⏳ | | |
| 06-fix-rls | | | ⏳ | | |
| 07-enable-rls | | | ⏳ | | |
| 08-migrate-types | | | ⏳ | | |
| 09-constraints | | | ⏳ | | |
| 10-indexes | | | ⏳ | | |
| 11-views | | | ⏳ | | |
| 12-validate | | | ⏳ | | |
| 13-cleanup | | | ⏳ | | |
| 14-performance | | | ⏳ | | |

---

## ✅ Validation finale

Une fois tous les scripts exécutés :

1. **Vérifier structure** conforme à FACEBOOK.md
2. **Tester politiques RLS** avec différents rôles
3. **Valider performance** des requêtes
4. **Confirmer intégrité** des données
5. **Tester application** en mode réel

---

**📅 Prêt pour l'exécution** : Une fois ce plan validé, procéder à l'exécution des scripts dans l'ordre spécifié.