# 📘 Module Facebook Ads - Instructions d'implémentation

## ⚠️ IMPORTANT - Respect du MAITRE.md

**OBLIGATION ABSOLUE** : Respecter l'intégralité du fichier `MAITRE.md` dans toute l'implémentation. Toutes les conventions, structures, et directives du MAITRE doivent être suivies sans exception.

---

## 🗄️ Base de données - Structure complète

### 1. Tables principales

#### `facebook_ads_data`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_ads_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Références et hiérarchie
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(500),
  adset_id VARCHAR(255) NOT NULL,
  adset_name VARCHAR(500),
  ad_id VARCHAR(255) NOT NULL,
  ad_name VARCHAR(500),
  
  -- Temporalité
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  
  -- Métriques de base
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,2) DEFAULT 0,
  spend DECIMAL(15,2) DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  unique_clicks BIGINT DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  inline_link_clicks BIGINT DEFAULT 0,
  inline_post_engagement BIGINT DEFAULT 0,
  website_ctr DECIMAL(10,4) DEFAULT 0,
  cost_per_inline_link_click DECIMAL(10,4) DEFAULT 0,
  cost_per_unique_click DECIMAL(10,4) DEFAULT 0,
  
  -- Actions et conversions (JSONB pour flexibilité)
  actions JSONB DEFAULT '[]',
  action_values JSONB DEFAULT '[]',
  unique_actions JSONB DEFAULT '[]',
  
  -- Breakdowns démographiques
  age VARCHAR(50),
  gender VARCHAR(20),
  country VARCHAR(100),
  region VARCHAR(255),
  
  -- Breakdowns plateforme
  publisher_platform VARCHAR(100),
  platform_position VARCHAR(100),
  impression_device VARCHAR(100),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index composé pour performance
  UNIQUE(user_id, ad_id, date_start, date_stop, age, gender, country, publisher_platform, platform_position, impression_device)
);

-- Index pour optimisation
CREATE INDEX idx_facebook_ads_user_date ON public.facebook_ads_data(user_id, date_start, date_stop);
CREATE INDEX idx_facebook_ads_hierarchy ON public.facebook_ads_data(account_id, campaign_id, adset_id, ad_id);
CREATE INDEX idx_facebook_ads_performance ON public.facebook_ads_data(user_id, date_start, spend, impressions);
```

#### `facebook_sync_status`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'syncing', 'completed', 'failed', 'partial')),
  progress INTEGER DEFAULT 0,
  total_days INTEGER,
  synced_days INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, account_id, date_start, date_stop)
);
```

#### `facebook_import_logs`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  import_type VARCHAR(50) DEFAULT 'ad',
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  status VARCHAR(50) CHECK (status IN ('success', 'failed', 'partial')),
  rows_imported INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  error_details JSONB,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Politique RLS (Row Level Security)

```sql
-- Activer RLS
ALTER TABLE public.facebook_ads_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_import_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour facebook_ads_data
CREATE POLICY "facebook_ads_data_policy" ON public.facebook_ads_data
  FOR ALL
  USING (user_id = auth.uid());

-- Politique pour facebook_sync_status
CREATE POLICY "facebook_sync_status_policy" ON public.facebook_sync_status
  FOR ALL
  USING (user_id = auth.uid());

-- Politique pour facebook_import_logs
CREATE POLICY "facebook_import_logs_policy" ON public.facebook_import_logs
  FOR ALL
  USING (user_id = auth.uid());
```

---

## 📥 Prompt Claude – Module Facebook Ads (v22 – Niveau Ad uniquement)

### 🎯 Objectif

Créer l'intégration complète de Facebook Ads dans mon app SaaS de reporting. Voici les instructions précises à suivre :

---

### 🧩 Menu & Interface

1. **Créer un menu déroulant `Facebook Ads`** dans la barre latérale de l'application.
2. Sous ce menu, créer **4 pages distinctes** :

   * `Account`
   * `Campaigns`
   * `AdSets`
   * `Ads`
3. Chaque page affichera les données agrégées **à son niveau respectif** à partir des données importées uniquement au niveau `ad` (grâce aux colonnes hiérarchiques).
4. Ajouter dans l'en-tête de chaque page :

   * Un **calendrier de sélection de période**
   * Une option pour **comparer deux périodes** si l'utilisateur le souhaite
   * Dès que l'utilisateur sélectionne une période, déclencher la logique de synchronisation expliquée ci-dessous.

---

### 🔄 Logique de synchronisation intelligente

* Aucune synchronisation manuelle (pas de bouton "Sync").
* Lorsque l'utilisateur sélectionne une période :

  * Si les données sont **déjà présentes et complètes** → on les affiche immédiatement sans appel API.
  * Si les données sont **partiellement présentes** → synchroniser **seulement les jours manquants**.
  * Si les données sont **absentes** → importer **l'intégralité de la période**.

---

### 📅 Fuseau horaire

* Toutes les dates et appels API doivent être basés sur le **fuseau horaire Canada/Toronto**.

---

### 📊 Niveau de synchronisation unique

* L'importation se fait **uniquement au niveau `ad`**.
* Les champs hiérarchiques suivants doivent être inclus dans chaque ligne importée :

  * `account_id`, `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `ad_id`, `ad_name`
* Cela permet de générer les dashboards par simple **filtrage dans la base**, sans autre appel API.

---

### 📋 Liste complète des métriques à importer

**Métriques générales à inclure obligatoirement** (sans les métriques SKAdNetwork ni vidéo/live) :

* `impressions`
* `reach`
* `frequency`
* `spend`
* `clicks`
* `unique_clicks`
* `cpc`
* `cpm`
* `ctr`
* `inline_link_clicks`
* `inline_post_engagement`
* `website_ctr`
* `cost_per_inline_link_click`
* `cost_per_unique_click`
* `actions`
* `action_values`
* `unique_actions`
* Tous les `action_type` supportés :

  * `link_click`
  * `lead`
  * `purchase`
  * `contact`
  * `add_to_cart`
  * `initiate_checkout`
  * `complete_registration`
  * `subscribe`
  * `search`
  * `page_engagement`
  * `post_engagement`
  * `comment`
  * `post_reaction`
  * `onsite_conversion.*`
  * `offsite_conversion.*`
  * `omni_app_install`, etc.

---

### 🧩 Breakdowns à inclure

Importer **tous les breakdowns possibles liés aux actions et conversions** :

* `action_type`
* `action_target_id`
* `action_destination`
* `action_reaction`
* `action_device`
* `action_platform`
* `action_display_format`
* `action_canvas_component_name`
* `action_product_id`
* `action_label`
* `action_video_type`
* `action_link_url`
* `action_post_id`
* `action_carousel_card_id`
* `action_attribution_windows`

Également les breakdowns standards :

* `age`
* `gender`
* `country`
* `region`
* `publisher_platform`
* `platform_position`
* `impression_device`

---

### 📦 Gestion pagination et quota

* La pagination de l'API Facebook doit être **gérée intégralement** (en boucle) pour récupérer **100% des données**.
* Ne jamais tronquer les données à une seule page.
* Optimiser le système pour ne pas dépasser les quotas API (éviter les appels inutiles).

---

### 📈 UX – Affichage de la synchronisation

* Lorsqu'une synchronisation est en cours, le frontend doit afficher :

  * Une **barre de progression en temps réel**
  * Le pourcentage de complétion
  * Le nombre de jours récupérés
  * Un message clair en cas d'erreur
* L'interface doit refléter l'état exact grâce à des événements reçus du backend :

  * `start`, `progress`, `completed`, `failed`

---

### 🛡️ Sécurité & fiabilité

* Valider que l'utilisateur a bien accès au compte Facebook synchronisé.
* Enregistrer les logs de chaque synchronisation dans une table dédiée (`facebook_import_logs`) contenant :

  * le compte
  * la période
  * l'état (succès / échec)
  * le timestamp
  * les erreurs éventuelles

---

### 🧪 Résultat attendu

* Une intégration **100% complète et fiable** avec Facebook Ads (v22)
* Import **exhaustif** des données de performance et de conversion
* Dashboards account/campaign/adset/ad générés à partir des **filtres**
* UX **fluide, moderne, sans clics inutiles**
* Architecture prête à **scaler**

---

## 🔧 Instructions techniques supplémentaires

### API Facebook Ads

1. **Version API** : Utiliser Facebook Marketing API v22.0
2. **Authentification** : OAuth 2.0 avec token longue durée
3. **Permissions requises** : `ads_read`, `ads_management`
4. **Rate limiting** : Implémenter un système de retry avec backoff exponentiel

### Structure des endpoints backend

```
/api/facebook/
  - /sync               # POST - Déclenche sync pour période
  - /status/{accountId} # GET - Statut sync en cours
  - /data/account       # GET - Données agrégées niveau account
  - /data/campaigns     # GET - Données agrégées niveau campaign
  - /data/adsets        # GET - Données agrégées niveau adset
  - /data/ads           # GET - Données détaillées niveau ad
```

### Optimisations importantes

1. **Batch requests** : Utiliser le batch endpoint de Facebook pour grouper les requêtes
2. **Cache** : Implémenter un cache Redis pour les données fréquemment consultées
3. **Queue** : Utiliser une queue (Bull/BullMQ) pour les jobs de synchronisation
4. **Webhooks** : Configurer les webhooks Facebook pour les mises à jour temps réel

### Tests requis

1. **Tests unitaires** pour toutes les fonctions de transformation de données
2. **Tests d'intégration** pour les endpoints API
3. **Tests E2E** pour le flux complet de synchronisation
4. **Tests de charge** pour valider la scalabilité

---

## 📝 Notes importantes

- Toujours respecter les conventions du MAITRE.md
- Utiliser TypeScript avec typage strict
- Implémenter une gestion d'erreur robuste
- Logger tous les événements importants
- Documenter le code de manière claire
- Suivre les principes SOLID et DRY

---

Ce document constitue la référence complète pour l'implémentation du module Facebook Ads.