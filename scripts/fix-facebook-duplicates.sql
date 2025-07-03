-- =====================================
-- CORRECTION DOUBLONS FACEBOOK
-- =====================================
-- Ce script corrige les problèmes de doublons dus aux breakdowns
-- IMPACT : Création de vues propres pour éviter les faux calculs
-- DURÉE : 5-10 minutes

-- 🔍 ANALYSE DES DOUBLONS

-- 1. IDENTIFIER LES DOUBLONS EXACTS
-- 📊 Montrer les cas de vrais doublons (même breakdown):
CREATE TEMPORARY VIEW exact_duplicates AS
SELECT 
  account_id, ad_id, date_start, date_stop, 
  age, gender, country, publisher_platform, platform_position, impression_device,
  COUNT(*) as occurrences
FROM facebook_ads_data
GROUP BY 
  account_id, ad_id, date_start, date_stop, 
  age, gender, country, publisher_platform, platform_position, impression_device
HAVING COUNT(*) > 1;

-- 2. IDENTIFIER LES DOUBLONS DE BREAKDOWNS
-- 📊 Montrer les cas de doublons par breakdowns différents:
CREATE TEMPORARY VIEW breakdown_duplicates AS
SELECT 
  account_id, ad_id, date_start,
  COUNT(*) as total_breakdowns,
  COUNT(DISTINCT COALESCE(age, 'null')) as age_variants,
  COUNT(DISTINCT COALESCE(gender, 'null')) as gender_variants,
  COUNT(DISTINCT COALESCE(country, 'null')) as country_variants,
  COUNT(DISTINCT COALESCE(publisher_platform, 'null')) as platform_variants,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend
FROM facebook_ads_data
GROUP BY account_id, ad_id, date_start
HAVING COUNT(*) > 1;

-- 3. RAPPORT DE DOUBLONS
SELECT 
  'Vrais doublons (même breakdown)' as type_probleme,
  COUNT(*) as nombre_groupes,
  SUM(occurrences) as total_lignes_dupliquees
FROM exact_duplicates

UNION ALL

SELECT 
  'Doublons de breakdowns' as type_probleme,
  COUNT(*) as nombre_ads,
  SUM(total_breakdowns) as total_lignes
FROM breakdown_duplicates;

-- 🛠️ SOLUTIONS POUR ÉVITER LES FAUX CALCULS

-- 4. CRÉER VUE POUR DONNÉES AGRÉGÉES PAR AD
-- 📋 Vue principale pour éviter les doublons de breakdowns:
CREATE OR REPLACE VIEW facebook_ads_aggregated AS
SELECT 
  -- Identifiants uniques
  compte_id,
  account_id,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  ad_id,
  ad_name,
  date_start,
  date_stop,
  
  -- Métriques agrégées (somme des breakdowns)
  SUM(impressions) as impressions,
  SUM(reach) as reach,
  SUM(spend) as spend,
  SUM(clicks) as clicks,
  SUM(unique_clicks) as unique_clicks,
  SUM(inline_link_clicks) as inline_link_clicks,
  SUM(inline_post_engagement) as inline_post_engagement,
  
  -- Ratios recalculés (IMPORTANT: après agrégation)
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::decimal / SUM(impressions) * 100), 4)
    ELSE 0 
  END as ctr,
  
  CASE 
    WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend)::decimal / SUM(clicks)), 4)
    ELSE 0 
  END as cpc,
  
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(spend)::decimal / SUM(impressions) * 1000), 4)
    ELSE 0 
  END as cpm,
  
  CASE 
    WHEN SUM(reach) > 0 THEN ROUND((SUM(impressions)::decimal / SUM(reach)), 2)
    ELSE 0 
  END as frequency,
  
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(inline_link_clicks)::decimal / SUM(impressions) * 100), 4)
    ELSE 0 
  END as website_ctr,
  
  CASE 
    WHEN SUM(inline_link_clicks) > 0 THEN ROUND((SUM(spend)::decimal / SUM(inline_link_clicks)), 4)
    ELSE 0 
  END as cost_per_inline_link_click,
  
  CASE 
    WHEN SUM(unique_clicks) > 0 THEN ROUND((SUM(spend)::decimal / SUM(unique_clicks)), 4)
    ELSE 0 
  END as cost_per_unique_click,
  
  -- Métadonnées
  MIN(created_at) as first_created_at,
  MAX(updated_at) as last_updated_at,
  
  -- Informations de breakdowns (pour référence)
  COUNT(*) as breakdown_count,
  string_agg(DISTINCT age, ', ' ORDER BY age) as age_breakdowns,
  string_agg(DISTINCT gender, ', ' ORDER BY gender) as gender_breakdowns,
  string_agg(DISTINCT country, ', ' ORDER BY country) as country_breakdowns,
  string_agg(DISTINCT publisher_platform, ', ' ORDER BY publisher_platform) as platform_breakdowns,
  
  -- Actions agrégées
  jsonb_agg(
    CASE 
      WHEN actions != '[]' AND actions IS NOT NULL 
      THEN actions::jsonb 
      ELSE NULL 
    END
  ) FILTER (WHERE actions != '[]' AND actions IS NOT NULL) as all_actions

FROM facebook_ads_data
GROUP BY 
  compte_id, account_id, campaign_id, campaign_name, 
  adset_id, adset_name, ad_id, ad_name, date_start, date_stop;

-- 5. CRÉER VUE POUR DONNÉES ADSETS CORRECTES
-- 📋 Vue adsets avec calculs corrects:
CREATE OR REPLACE VIEW facebook_adsets_corrected AS
SELECT 
  compte_id,
  account_id,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  date_start,
  date_stop,
  
  -- Métriques agrégées au niveau adset
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  SUM(unique_clicks) as total_unique_clicks,
  SUM(inline_link_clicks) as total_inline_link_clicks,
  
  -- Ratios recalculés au niveau adset
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::decimal / SUM(impressions) * 100), 4)
    ELSE 0 
  END as avg_ctr,
  
  CASE 
    WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend)::decimal / SUM(clicks)), 4)
    ELSE 0 
  END as avg_cpc,
  
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(spend)::decimal / SUM(impressions) * 1000), 4)
    ELSE 0 
  END as avg_cpm,
  
  CASE 
    WHEN SUM(reach) > 0 THEN ROUND((SUM(impressions)::decimal / SUM(reach)), 2)
    ELSE 0 
  END as avg_frequency,
  
  -- Comptes
  COUNT(DISTINCT ad_id) as ads_count,
  COUNT(*) as days_count

FROM facebook_ads_aggregated  -- Utiliser la vue agrégée
GROUP BY 
  compte_id, account_id, campaign_id, campaign_name, 
  adset_id, adset_name, date_start, date_stop;

-- 6. CRÉER VUE POUR DONNÉES CAMPAGNES CORRECTES
-- 📋 Vue campagnes avec calculs corrects:
CREATE OR REPLACE VIEW facebook_campaigns_corrected AS
SELECT 
  compte_id,
  account_id,
  campaign_id,
  campaign_name,
  date_start,
  date_stop,
  
  -- Métriques agrégées au niveau campagne
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  SUM(unique_clicks) as total_unique_clicks,
  SUM(inline_link_clicks) as total_inline_link_clicks,
  
  -- Ratios recalculés au niveau campagne
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::decimal / SUM(impressions) * 100), 4)
    ELSE 0 
  END as avg_ctr,
  
  CASE 
    WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend)::decimal / SUM(clicks)), 4)
    ELSE 0 
  END as avg_cpc,
  
  CASE 
    WHEN SUM(impressions) > 0 THEN ROUND((SUM(spend)::decimal / SUM(impressions) * 1000), 4)
    ELSE 0 
  END as avg_cpm,
  
  CASE 
    WHEN SUM(reach) > 0 THEN ROUND((SUM(impressions)::decimal / SUM(reach)), 2)
    ELSE 0 
  END as avg_frequency,
  
  -- Comptes
  COUNT(DISTINCT adset_id) as adsets_count,
  COUNT(DISTINCT ad_id) as ads_count,
  COUNT(*) as days_count

FROM facebook_ads_aggregated  -- Utiliser la vue agrégée
GROUP BY 
  compte_id, account_id, campaign_id, campaign_name, date_start, date_stop;

-- 🧪 TESTS DE VALIDATION

-- 7. COMPARER LES TOTAUX AVANT/APRÈS
SELECT 
  'AVANT (avec doublons)' as source,
  'Ads' as niveau,
  COUNT(*) as total_lignes,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend,
  COUNT(DISTINCT ad_id) as unique_ads
FROM facebook_ads_data

UNION ALL

SELECT 
  'APRÈS (sans doublons)' as source,
  'Ads' as niveau,
  COUNT(*) as total_lignes,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend,
  COUNT(DISTINCT ad_id) as unique_ads
FROM facebook_ads_aggregated

UNION ALL

SELECT 
  'APRÈS' as source,
  'Adsets' as niveau,
  COUNT(*) as total_lignes,
  SUM(total_impressions) as total_impressions,
  SUM(total_spend) as total_spend,
  COUNT(DISTINCT adset_id) as unique_adsets
FROM facebook_adsets_corrected

UNION ALL

SELECT 
  'APRÈS' as source,
  'Campaigns' as niveau,
  COUNT(*) as total_lignes,
  SUM(total_impressions) as total_impressions,
  SUM(total_spend) as total_spend,
  COUNT(DISTINCT campaign_id) as unique_campaigns
FROM facebook_campaigns_corrected;

-- 8. VÉRIFIER LA COHÉRENCE DES RATIOS
-- 📊 Exemple de calculs corrects vs incorrects:
WITH sample_ad AS (
  SELECT ad_id, date_start
  FROM breakdown_duplicates
  LIMIT 1
)
SELECT 
  'INCORRECT (somme des CTR)' as methode,
  AVG(ctr) as ctr_calculated
FROM facebook_ads_data fad
JOIN sample_ad sa ON fad.ad_id = sa.ad_id AND fad.date_start = sa.date_start

UNION ALL

SELECT 
  'CORRECT (CTR après agrégation)' as methode,
  ctr as ctr_calculated
FROM facebook_ads_aggregated faa
JOIN sample_ad sa ON faa.ad_id = sa.ad_id AND faa.date_start = sa.date_start;

-- 📋 RECOMMANDATIONS FINALES
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ VUES CRÉÉES POUR CORRIGER LES DOUBLONS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. facebook_ads_aggregated     - Données ads sans doublons de breakdowns';
  RAISE NOTICE '2. facebook_adsets_corrected   - Données adsets avec calculs corrects';
  RAISE NOTICE '3. facebook_campaigns_corrected - Données campaigns avec calculs corrects';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Modifier les APIs pour utiliser ces vues';
  RAISE NOTICE '2. Tester les calculs dans l''interface';
  RAISE NOTICE '3. Valider les totaux avec Facebook Ads Manager';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE 'Ces vues éliminent les doublons de breakdowns.';
  RAISE NOTICE 'Si vous avez besoin des détails par breakdowns,';
  RAISE NOTICE 'utilisez la table facebook_ads_data directement.';
END $$;