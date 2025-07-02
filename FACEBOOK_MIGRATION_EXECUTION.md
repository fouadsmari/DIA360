# 🔄 Exécution Migration Facebook Database

## 📋 Scripts à exécuter en ordre

### 🟢 Phase 1 - Analyse (SÉCURITAIRE) - ✅ COMMENCER ICI

#### Script 1: Analyse structure actuelle
**Fichier:** `scripts/migration-facebook/01-analyze-current-structure.sql`
**Impact:** Aucun (lecture seule)
**Durée:** 2-3 minutes

```sql
-- Copier/coller le contenu du fichier 01-analyze-current-structure.sql
-- dans Supabase SQL Editor et exécuter
```

**Erreurs rencontrées:**
```
ERROR:  42601: syntax error at or near "\"
LINE 8: \echo '🔍 DÉBUT ANALYSE STRUCTURE FACEBOOK...'
        ^
```

---

#### Script 2: Vérification backup
**Fichier:** `scripts/migration-facebook/02-backup-verification.sql`
**Impact:** Aucun (lecture seule)
**Durée:** 1-2 minutes

```sql
-- Copier/coller le contenu du fichier 02-backup-verification.sql
-- dans Supabase SQL Editor et exécuter
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 02]
```

---

#### Script 3: Préparation migration
**Fichier:** `scripts/migration-facebook/03-prepare-migration.sql`
**Impact:** Minimal (tables temporaires)
**Durée:** 2-3 minutes

```sql
-- Copier/coller le contenu du fichier 03-prepare-migration.sql
-- dans Supabase SQL Editor et exécuter
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 03]
```

---

### 🟡 Phase 2 - Corrections urgentes (PLANIFIER - Max 4h)

⚠️ **ATTENTION:** Ces scripts doivent être exécutés EN CONTINU sans arrêt
⚠️ **BACKUP OBLIGATOIRE** avant cette phase

#### Script 4: Désactivation RLS temporaire
**Fichier:** `scripts/migration-facebook/04-disable-rls-temporarily.sql`
**Impact:** CRITIQUE (sécurité désactivée)
**Durée:** 30 secondes

```sql
-- ⚠️ NE PAS EXÉCUTER sans backup validé
-- Copier/coller le contenu du fichier 04-disable-rls-temporarily.sql
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 04]
```

---

#### Script 5: Ajout colonnes manquantes
**Fichier:** `scripts/migration-facebook/05-add-missing-columns.sql`
**Impact:** Modéré (ajout colonnes)
**Durée:** 5-10 minutes

```sql
-- Exécuter IMMÉDIATEMENT après script 04
-- Copier/coller le contenu du fichier 05-add-missing-columns.sql
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 05]
```

---

#### Script 6: Correction politiques RLS
**Fichier:** `scripts/migration-facebook/06-fix-rls-policies.sql`
**Impact:** Critique (sécurité)
**Durée:** 2-3 minutes

```sql
-- Exécuter IMMÉDIATEMENT après script 05
-- Copier/coller le contenu du fichier 06-fix-rls-policies.sql
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 06]
```

---

#### Script 7: Réactivation RLS sécurisée
**Fichier:** `scripts/migration-facebook/07-enable-rls-secure.sql`
**Impact:** Critique (réactivation sécurité)
**Durée:** 1-2 minutes

```sql
-- Exécuter IMMÉDIATEMENT après script 06
-- Copier/coller le contenu du fichier 07-enable-rls-secure.sql
```

**Erreurs rencontrées:**
```
[Coller ici les erreurs du script 07]
```

---

## 🚨 Template pour rapporter les erreurs

Pour chaque script qui génère une erreur, utiliser ce template :

```
==========================================
SCRIPT: [numéro]-[nom-script].sql
ERREUR RENCONTRÉE:
------------------------------------------
[Copier/coller l'erreur exacte de Supabase]

CONTEXTE:
- Étape en cours: [décrire ce que le script faisait]
- Base de données: [env de test / production]
- Timestamp: [date/heure]

ACTIONS TENTÉES:
- [décrire ce qui a été essayé]

BESOIN D'AIDE:
- [décrire le problème spécifique]
==========================================
```

## 📊 Status d'exécution

| Script | Status | Durée | Erreurs | Notes |
|--------|--------|-------|---------|-------|
| 01-analyze | ⏳ | | | |
| 02-backup | ⏳ | | | |
| 03-prepare | ⏳ | | | |
| 04-disable-rls | ⏳ | | | |
| 05-add-columns | ⏳ | | | |
| 06-fix-rls | ⏳ | | | |
| 07-enable-rls | ⏳ | | | |

**Légende:**
- ⏳ En attente
- ▶️ En cours
- ✅ Terminé
- ❌ Erreur
- ⚠️ Attention requise

## 🎯 Étapes suivantes

1. **MAINTENANT:** Exécuter scripts Phase 1 (01-02-03)
2. **Analyser résultats** Phase 1
3. **Faire backup** si Phase 1 OK
4. **Planifier Phase 2** (fenêtre maintenance)
5. **Exécuter Phase 2** en continu (04-05-06-07)

## 📞 Support

Pour chaque erreur rencontrée :
1. Copier l'erreur complète
2. Utiliser le template ci-dessus
3. Ajouter dans ce document
4. Continuer avec l'aide pour résolution