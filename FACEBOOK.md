# 📘 Module Facebook Ads - Instructions d'implémentation

## ⚠️ IMPORTANT - Respect du MAITRE.md

**OBLIGATION ABSOLUE** : Respecter l'intégralité du fichier `MAITRE.md` dans toute l'implémentation. Toutes les conventions, structures, et directives du MAITRE doivent être suivies sans exception.

---

## 🗄️ Base de données - Structure complète

### 1. Tables principales

#### `facebook_ads_data`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_ads_data (
  id BIGSERIAL PRIMARY KEY,
  
  -- Références et hiérarchie (ARCHITECTURE UNIFIÉE)
  compte_id INTEGER REFERENCES public.comptes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- ID de l'utilisateur qui a créé l'import
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
  
  -- Métadonnées et gestion des erreurs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status VARCHAR(50) DEFAULT 'active' CHECK (sync_status IN ('active', 'account_suspended', 'access_denied', 'data_invalid')),
  data_quality_score INTEGER DEFAULT 100, -- Score de qualité des données (0-100)
  
  -- Index composé pour performance (ARCHITECTURE UNIFIÉE)
  UNIQUE(compte_id, ad_id, date_start, date_stop, age, gender, country, publisher_platform, platform_position, impression_device)
);

-- Index pour optimisation (ARCHITECTURE UNIFIÉE)
CREATE INDEX idx_facebook_ads_compte_date ON public.facebook_ads_data(compte_id, date_start, date_stop);
CREATE INDEX idx_facebook_ads_hierarchy ON public.facebook_ads_data(account_id, campaign_id, adset_id, ad_id);
CREATE INDEX idx_facebook_ads_performance ON public.facebook_ads_data(compte_id, date_start, spend, impressions);
CREATE INDEX idx_facebook_ads_sync_status ON public.facebook_ads_data(sync_status, updated_at);
```

#### `facebook_sync_status`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_sync_status (
  id BIGSERIAL PRIMARY KEY,
  sync_id VARCHAR(255) UNIQUE NOT NULL, -- ID unique pour tracking
  compte_id INTEGER REFERENCES public.comptes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'syncing', 'completed', 'failed', 'partial', 'cancelled', 'rate_limited')),
  progress INTEGER DEFAULT 0,
  total_days INTEGER,
  synced_days INTEGER DEFAULT 0,
  failed_days INTEGER DEFAULT 0,
  error_message TEXT,
  facebook_error_code VARCHAR(50), -- Code d'erreur Facebook spécifique
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(compte_id, account_id, date_start, date_stop)
);
```

#### `facebook_import_logs`
```sql
CREATE TABLE IF NOT EXISTS public.facebook_import_logs (
  id BIGSERIAL PRIMARY KEY,
  compte_id INTEGER REFERENCES public.comptes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  import_type VARCHAR(50) DEFAULT 'ad',
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  status VARCHAR(50) CHECK (status IN ('success', 'failed', 'partial', 'rate_limited', 'token_expired', 'account_suspended')),
  rows_imported INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  api_calls_failed INTEGER DEFAULT 0,
  facebook_quota_usage JSONB, -- Usage des quotas Facebook
  error_details JSONB,
  performance_metrics JSONB, -- Métriques de performance de l'import
  duration_seconds INTEGER,
  memory_usage_mb INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX idx_facebook_logs_compte_date ON public.facebook_import_logs(compte_id, created_at);
CREATE INDEX idx_facebook_logs_status ON public.facebook_import_logs(status, created_at);
```

### 2. Politique RLS (Row Level Security)

```sql
-- Activer RLS
ALTER TABLE public.facebook_ads_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_import_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour facebook_ads_data (ARCHITECTURE UNIFIÉE)
CREATE POLICY "facebook_ads_data_policy" ON public.facebook_ads_data
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- Politique pour facebook_sync_status
CREATE POLICY "facebook_sync_status_policy" ON public.facebook_sync_status
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- Politique pour facebook_import_logs
CREATE POLICY "facebook_import_logs_policy" ON public.facebook_import_logs
  FOR ALL
  USING (
    compte_id IN (
      SELECT c.id FROM comptes c
      LEFT JOIN compte_users_clients cuc ON c.id = cuc.compte_id
      LEFT JOIN compte_users_pub_gms cup ON c.id = cup.compte_id  
      LEFT JOIN compte_gestionnaires cg ON c.id = cg.compte_id
      WHERE cuc.user_id::text = auth.jwt() ->> 'sub'
         OR cup.user_id::text = auth.jwt() ->> 'sub'
         OR cg.user_id::text = auth.jwt() ->> 'sub'
    )
  );
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

### 🕒 Gestion intelligente des périodes et breakdowns temporels

**Logique de granularité automatique** :

* **1 à 90 jours** : Utiliser `breakdowns=['day']` pour données quotidiennes
* **Plus de 90 jours** : Utiliser `breakdowns=['month']` pour données mensuelles
* **Périodes custom** : Permettre à l'utilisateur de forcer daily ou monthly

**Paramètres API selon le type de période** :

```javascript
// Période prédéfinie (recommandé pour performance)
{
  "date_preset": "last_7_days", // ou last_30_days, last_90_days, etc.
  "breakdowns": ["day"]
}

// Période custom
{
  "time_range": {
    "since": "2024-01-01",
    "until": "2024-01-31"
  },
  "breakdowns": ["day"] // ou ["month"] selon durée
}
```

---

### 🏗️ Structure d'appel API Facebook correcte

**URL et structure recommandée** :

```javascript
// CORRECT - Pour récupérer ads avec métriques
`https://graph.facebook.com/v22.0/${accountId}/ads`

// Paramètres fields avec insights
fields: `insights{
  impressions,reach,frequency,spend,clicks,unique_clicks,
  cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,
  website_ctr,cost_per_inline_link_click,cost_per_unique_click,
  actions,action_values,unique_actions
},ad_id,name,adset_id,campaign_id,status,effective_status`

// INCORRECT - Ne pas utiliser
`https://graph.facebook.com/v22.0/${accountId}/insights`
```

**Mapping des champs retournés (CORRIGÉ)** :

```javascript
// Structure de réponse Facebook → Mapping BDD
function mapFacebookResponseToDatabase(response, insightsData, accountId, compteId, userId) {
  // Validation des données obligatoires
  if (!response.id || !insightsData || !insightsData.data || insightsData.data.length === 0) {
    throw new Error('Données Facebook invalides ou incomplètes')
  }
  
  const insights = insightsData.data[0] // Premier élément des insights
  
  // Validation des métriques (pas de valeurs négatives)
  const spend = parseFloat(insights.spend || 0)
  const impressions = parseInt(insights.impressions || 0)
  const clicks = parseInt(insights.clicks || 0)
  
  if (spend < 0 || impressions < 0 || clicks < 0) {
    throw new Error('Métriques Facebook invalides (valeurs négatives)')
  }
  
  return {
    // Références
    compte_id: compteId,
    user_id: userId,
    account_id: accountId,
    
    // Champs hiérarchiques (MAPPING CORRIGÉ)
    ad_id: response.id, // Facebook retourne l'ID dans 'id'
    ad_name: response.name || '',
    adset_id: response.adset?.id || response.adset_id || '',
    adset_name: response.adset?.name || '',
    campaign_id: response.campaign?.id || response.campaign_id || '',
    campaign_name: response.campaign?.name || '',
    
    // Dates (CONVERSION FUSEAU HORAIRE)
    date_start: insights.date_start,
    date_stop: insights.date_stop,
    
    // Métriques depuis insights (VALIDATION + CONVERSION)
    impressions: impressions,
    reach: parseInt(insights.reach || 0),
    frequency: parseFloat(insights.frequency || 0),
    spend: spend,
    clicks: clicks,
    unique_clicks: parseInt(insights.unique_clicks || 0),
    cpc: parseFloat(insights.cpc || 0),
    cpm: parseFloat(insights.cpm || 0),
    ctr: parseFloat(insights.ctr || 0),
    inline_link_clicks: parseInt(insights.inline_link_clicks || 0),
    inline_post_engagement: parseInt(insights.inline_post_engagement || 0),
    website_ctr: parseFloat(insights.website_ctr || 0),
    cost_per_inline_link_click: parseFloat(insights.cost_per_inline_link_click || 0),
    cost_per_unique_click: parseFloat(insights.cost_per_unique_click || 0),
    
    // Actions (NETTOYAGE JSON)
    actions: insights.actions ? JSON.stringify(insights.actions) : '[]',
    action_values: insights.action_values ? JSON.stringify(insights.action_values) : '[]',
    unique_actions: insights.unique_actions ? JSON.stringify(insights.unique_actions) : '[]',
    
    // Breakdowns démographiques
    age: insights.age || null,
    gender: insights.gender || null,
    country: insights.country || null,
    region: insights.region || null,
    
    // Breakdowns plateforme
    publisher_platform: insights.publisher_platform || null,
    platform_position: insights.platform_position || null,
    impression_device: insights.impression_device || null,
    
    // Métadonnées
    sync_status: 'active',
    data_quality_score: calculateDataQualityScore(insights)
  }
}

// Fonction de calcul de score qualité
function calculateDataQualityScore(insights) {
  let score = 100
  
  // Pénalités pour données manquantes
  if (!insights.impressions || insights.impressions === '0') score -= 20
  if (!insights.spend || insights.spend === '0') score -= 10
  if (!insights.clicks || insights.clicks === '0') score -= 5
  
  // Bonus pour données complètes
  if (insights.actions && insights.actions.length > 0) score += 5
  if (insights.reach && parseInt(insights.reach) > 0) score += 5
  
  return Math.max(0, Math.min(100, score))
}
```

---

### 💾 Système de cache intelligent multi-niveau

**Stratégie de cache pour éviter saturation API** :

1. **Cache Level 1 - Base de données** :
   * Données < 1 heure : Utiliser cache BDD
   * Données > 1 heure : Appel Facebook API requis
   * Données > 24h et période fermée : Cache permanent

2. **Cache Level 2 - Redis (optionnel)** :
   * Requêtes identiques multiples dans 15 minutes
   * Clé : `fb_cache:{accountId}:{dateFrom}:{dateTo}:{breakdowns}`

3. **Limitation des appels simultanés** :
   * Max 5 appels Facebook API simultanés par utilisateur
   * Queue système pour les autres requêtes
   * Retry avec backoff exponentiel

**Exemple de logique cache** :

```javascript
// Vérifier fraîcheur des données
const cacheKey = `${accountId}_${dateFrom}_${dateTo}`
const existingData = await checkLocalCache(cacheKey)

if (existingData && isDataFresh(existingData.updated_at, 1)) {
  // Données < 1h → Utiliser cache
  return existingData.data
} else {
  // Données anciennes → Appel Facebook + Update cache
  const freshData = await callFacebookAPI(params)
  await updateLocalCache(cacheKey, freshData)
  return freshData
}
```

---

### 🚦 Optimisation multi-utilisateur

**Gestion des quotas pour architecture SaaS** :

* **Pool de tokens** : Distribuer les appels sur plusieurs tokens d'accès
* **Rate limiting par utilisateur** : Max 10 appels/minute par utilisateur
* **Priorisation** : Superadmin > Direction > Responsable
* **Batch requests** : Grouper les requêtes similaires
* **Surveillance quotas** : Alertes avant limite API Facebook

**Architecture recommandée** :

```javascript
// Service de gestion des appels Facebook
class FacebookApiManager {
  async callWithRateLimit(userId, accountId, params) {
    // Vérifier quota utilisateur
    await checkUserQuota(userId)
    
    // Vérifier cache local
    const cached = await checkCache(accountId, params)
    if (cached && cached.fresh) return cached.data
    
    // Appel API avec retry
    const data = await this.callFacebookWithRetry(params)
    
    // Mettre à jour cache
    await updateCache(accountId, params, data)
    
    return data
  }
}
```

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

## 🚨 Gestion robuste des erreurs Facebook

### Codes d'erreur Facebook et stratégies de retry

```javascript
class FacebookErrorHandler {
  static handleError(error, retryCount = 0) {
    const errorCode = error.code || error.error?.code
    const errorType = error.error?.type || 'unknown'
    
    switch (errorCode) {
      case 100: // Invalid parameter
        return { shouldRetry: false, message: 'Paramètres invalides' }
        
      case 190: // Access token expired
        return { shouldRetry: true, action: 'refresh_token', delay: 0 }
        
      case 17: // User request limit reached
        return { shouldRetry: true, delay: 3600000 } // 1 heure
        
      case 613: // Calls to this api have exceeded the rate limit
        const retryAfter = error.error?.error_user_msg?.match(/(\d+)/)?.[1] || 300
        return { shouldRetry: true, delay: parseInt(retryAfter) * 1000 }
        
      case 500:
      case 502:
      case 503: // Erreurs serveur Facebook
        const backoffDelay = Math.min(300000, Math.pow(2, retryCount) * 1000) // Max 5 min
        return { shouldRetry: retryCount < 3, delay: backoffDelay }
        
      case 400:
      case 401:
      case 403: // Erreurs client - pas de retry
        return { shouldRetry: false, message: 'Erreur d\'autorisation' }
        
      default:
        return { shouldRetry: retryCount < 2, delay: 5000 }
    }
  }
}
```

### Gestion des tokens expirés

```javascript
class FacebookTokenManager {
  static async refreshTokenIfNeeded(userId, compteId) {
    try {
      // Vérifier validité du token actuel
      const isValid = await this.validateToken(userId)
      if (isValid) return true
      
      // Tentative de refresh
      const refreshed = await this.refreshLongLivedToken(userId)
      if (refreshed) {
        await this.updateTokenInDatabase(userId, compteId, refreshed)
        return true
      }
      
      // Marquer le compte comme nécessitant une réautorisation
      await this.markAccountForReauth(userId, compteId)
      return false
      
    } catch (error) {
      console.error('Erreur refresh token:', error)
      return false
    }
  }
  
  static async validateToken(userId) {
    // Appel à Facebook pour valider le token
    const response = await fetch('https://graph.facebook.com/me?access_token=' + token)
    return response.ok
  }
}
```

---

## 📊 Optimisations de performance avancées

### Vues matérialisées pour agrégation

```sql
-- Vue matérialisée pour performance dashboard
CREATE MATERIALIZED VIEW facebook_daily_summary AS
SELECT 
  compte_id,
  account_id,
  campaign_id,
  campaign_name,
  date_start,
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(cpc) as avg_cpc,
  COUNT(DISTINCT ad_id) as total_ads,
  MAX(updated_at) as last_updated
FROM facebook_ads_data 
WHERE sync_status = 'active'
GROUP BY compte_id, account_id, campaign_id, campaign_name, date_start;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX idx_facebook_daily_summary_unique 
ON facebook_daily_summary(compte_id, account_id, campaign_id, date_start);

-- Refresh automatique (à scheduler)
CREATE OR REPLACE FUNCTION refresh_facebook_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY facebook_daily_summary;
END;
$$ LANGUAGE plpgsql;
```

### Système de queue pour les imports

```javascript
// Configuration BullMQ pour les jobs Facebook
const facebookQueue = new Queue('facebook-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
})

// Worker pour traiter les jobs
const facebookWorker = new Worker('facebook-sync', async (job) => {
  const { userId, compteId, accountId, dateFrom, dateTo } = job.data
  
  try {
    // Vérifier rate limit utilisateur
    await checkUserRateLimit(userId)
    
    // Traiter le sync
    const result = await processFacebookSync(userId, compteId, accountId, dateFrom, dateTo)
    
    // Mettre à jour les métriques
    await updateSyncMetrics(userId, compteId, result)
    
    return result
    
  } catch (error) {
    // Logger l'erreur
    await logSyncError(userId, compteId, error)
    throw error
  }
}, { connection: redisConnection })
```

---

## 🔍 Monitoring et alertes

### Métriques de santé du système

```javascript
class FacebookHealthMonitor {
  static async getSystemHealth() {
    const metrics = {
      // Taux de succès des appels API
      apiSuccessRate: await this.calculateApiSuccessRate(),
      
      // Temps de réponse moyen
      avgResponseTime: await this.getAverageResponseTime(),
      
      // Comptes avec erreurs
      accountsWithErrors: await this.getAccountsWithErrors(),
      
      // Usage des quotas
      quotaUsage: await this.getQuotaUsage(),
      
      // Données obsolètes
      staleDataCount: await this.getStaleDataCount()
    }
    
    return metrics
  }
  
  static async sendAlertIfNeeded(metrics) {
    // Alertes critiques
    if (metrics.apiSuccessRate < 0.8) {
      await this.sendAlert('CRITICAL', 'Taux de succès API < 80%')
    }
    
    if (metrics.avgResponseTime > 10000) {
      await this.sendAlert('WARNING', 'Temps de réponse > 10s')
    }
    
    if (metrics.quotaUsage > 0.9) {
      await this.sendAlert('WARNING', 'Quota API > 90%')
    }
  }
}
```

---

## 🗺️ ROADMAP D'IMPLÉMENTATION

### 🚀 Phase 1 - Fondations (Semaine 1-2)

#### ✅ Tâches prioritaires :

1. **Migration base de données**
   - [ ] Exécuter les nouveaux scripts SQL (tables, index, RLS)
   - [ ] Migrer les données existantes vers la nouvelle structure
   - [ ] Tester les politiques RLS

2. **Correction de l'architecture actuelle**
   - [ ] Remplacer `user_id` par `compte_id` dans tous les APIs
   - [ ] Corriger les mappings Facebook → BDD
   - [ ] Implémenter la validation des données

3. **Gestion d'erreurs de base**
   - [ ] Créer `FacebookErrorHandler` 
   - [ ] Implémenter retry avec backoff exponentiel
   - [ ] Ajouter logging détaillé des erreurs

#### 📋 Livrables Phase 1 :
- ✅ Structure BDD corrigée et migrée
- ✅ APIs corrigés avec nouvelle architecture
- ✅ Gestion d'erreurs Facebook basique

---

### 🔧 Phase 2 - Robustesse (Semaine 3-4)

#### ✅ Tâches prioritaires :

1. **Système de cache intelligent**
   - [ ] Implémenter logique de cache multi-niveau
   - [ ] Créer `FacebookApiManager` avec rate limiting
   - [ ] Configurer Redis pour cache temporaire

2. **Gestion avancée des tokens**
   - [ ] Créer `FacebookTokenManager`
   - [ ] Implémenter refresh automatique des tokens
   - [ ] Système de pool de tokens

3. **Optimisation des appels API**
   - [ ] Corriger structure des URLs Facebook (`/ads` au lieu de `/insights`)
   - [ ] Implémenter gestion des breakdowns (max 4)
   - [ ] Logique daily/monthly selon période

#### 📋 Livrables Phase 2 :
- ✅ Cache intelligent opérationnel
- ✅ Gestion tokens robuste
- ✅ APIs Facebook optimisés

---

### 📊 Phase 3 - Performance (Semaine 5-6)

#### ✅ Tâches prioritaires :

1. **Système de queue**
   - [ ] Installer et configurer BullMQ + Redis
   - [ ] Créer workers pour jobs Facebook
   - [ ] Interface de monitoring des jobs

2. **Vues matérialisées**
   - [ ] Créer vues pour agrégation rapide
   - [ ] Scheduler refresh automatique
   - [ ] Optimiser requêtes dashboard

3. **Gestion des grandes périodes**
   - [ ] Chunking pour périodes > 365 jours
   - [ ] Parallélisation des requêtes
   - [ ] Optimisation mémoire

#### 📋 Livrables Phase 3 :
- ✅ Système de queue opérationnel
- ✅ Performance optimisée
- ✅ Gestion des gros volumes

---

### 🔍 Phase 4 - Monitoring (Semaine 7-8)

#### ✅ Tâches prioritaires :

1. **Dashboard de santé**
   - [ ] Interface de monitoring en temps réel
   - [ ] Métriques de performance
   - [ ] Alertes automatisées

2. **Système d'alertes**
   - [ ] Notifications email/Slack
   - [ ] Seuils configurables
   - [ ] Escalade automatique

3. **Analytics avancées**
   - [ ] Rapport d'utilisation des quotas
   - [ ] Analyse des patterns d'erreur
   - [ ] Optimisations suggérées

#### 📋 Livrables Phase 4 :
- ✅ Monitoring complet
- ✅ Système d'alertes
- ✅ Analytics opérationnelles

---

### 🌟 Phase 5 - Fonctionnalités avancées (Semaine 9-10)

#### ✅ Tâches prioritaires :

1. **Webhooks Facebook**
   - [ ] Configuration webhooks
   - [ ] Traitement événements temps réel
   - [ ] Validation signatures

2. **Optimisations SaaS**
   - [ ] Multi-tenancy optimisée
   - [ ] Isolation des données par client
   - [ ] Facturation basée usage

3. **Features premium**
   - [ ] Export avancé des données
   - [ ] Rapports personnalisés
   - [ ] API publique pour clients

#### 📋 Livrables Phase 5 :
- ✅ Webhooks opérationnels
- ✅ Features SaaS avancées
- ✅ Solution complète et scalable

---

### 📅 Planning global

| Phase | Durée | Focus | Statut |
|-------|-------|-------|--------|
| Phase 1 | 2 semaines | Fondations & corrections | 🟡 En cours |
| Phase 2 | 2 semaines | Robustesse & fiabilité | ⏳ Planifié |
| Phase 3 | 2 semaines | Performance & scalabilité | ⏳ Planifié |
| Phase 4 | 2 semaines | Monitoring & observabilité | ⏳ Planifié |
| Phase 5 | 2 semaines | Features avancées | ⏳ Planifié |

**🎯 Objectif final** : Solution Facebook Ads complète, robuste et ready-for-production en 10 semaines.

---

Ce document constitue la référence complète et corrigée pour l'implémentation du module Facebook Ads.