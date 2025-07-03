# Correction API Facebook - Récupération des Noms

## Problème Identifié

L'API Facebook ne récupère que les IDs des campagnes et adsets, pas leurs noms. Cela cause des problèmes d'affichage dans l'interface.

## Solution

### 1. Modifier la Requête Facebook API

Dans `/src/app/api/facebook/data/ads/route.ts` ligne 257, remplacer :

```typescript
// AVANT (ligne 257)
fields: `insights{impressions,reach,frequency,spend,clicks,unique_clicks,cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,website_ctr,cost_per_inline_link_click,cost_per_unique_click,actions,action_values,unique_actions},id,name,adset_id,campaign_id,status,effective_status`

// APRÈS
fields: `insights{impressions,reach,frequency,spend,clicks,unique_clicks,cpc,cpm,ctr,inline_link_clicks,inline_post_engagement,website_ctr,cost_per_inline_link_click,cost_per_unique_click,actions,action_values,unique_actions},id,name,adset_id,adset{id,name},campaign_id,campaign{id,name},status,effective_status`
```

### 2. Modifier la Fonction de Mapping

Dans la même fonction `mapFacebookResponseToDatabase` (ligne 57), mettre à jour :

```typescript
// AVANT (lignes 81-84)
ad_id: response.id,
ad_name: response.name || '',
adset_id: response.adset_id || '',
campaign_id: response.campaign_id || '',

// APRÈS
ad_id: response.id,
ad_name: response.name || '',
adset_id: response.adset?.id || response.adset_id || '',
adset_name: response.adset?.name || '',
campaign_id: response.campaign?.id || response.campaign_id || '',
campaign_name: response.campaign?.name || '',
```

### 3. Mettre à Jour l'Interface TypeScript

Ajouter les types pour les objets imbriqués :

```typescript
interface FacebookAdData {
  id: string
  name: string
  adset_id?: string
  adset?: {
    id: string
    name: string
  }
  campaign_id?: string
  campaign?: {
    id: string
    name: string
  }
  status?: string
  effective_status?: string
  insights?: {
    // ... reste identique
  }
}
```

## Avantages de cette Solution

1. **Récupération directe** : Les noms sont récupérés en une seule requête
2. **Pas d'appels supplémentaires** : Évite de faire des requêtes séparées
3. **Données complètes** : Tous les noms sont disponibles immédiatement
4. **Performance** : Pas d'impact négatif sur les performances

## Alternative (si la solution principale ne fonctionne pas)

Si Facebook ne permet pas les champs imbriqués, faire des requêtes séparées :

```typescript
// 1. Récupérer d'abord les campaigns
const campaignsResponse = await fetch(`https://graph.facebook.com/v22.0/${accountIdWithPrefix}/campaigns?fields=id,name&access_token=${access_token}`)

// 2. Récupérer les adsets
const adsetsResponse = await fetch(`https://graph.facebook.com/v22.0/${accountIdWithPrefix}/adsets?fields=id,name,campaign_id&access_token=${access_token}`)

// 3. Créer des maps pour les noms
const campaignNames = new Map()
const adsetNames = new Map()

// 4. Utiliser ces maps lors du mapping des ads
```

## Impact

Cette correction résoudra le problème des noms manquants dans :
- L'affichage des campagnes
- L'affichage des adsets  
- Les rapports et tableaux
- Les calculs d'agrégation