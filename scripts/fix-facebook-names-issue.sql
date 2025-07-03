-- =====================================
-- CORRECTION NOMS CAMPAGNES ET ADSETS
-- =====================================
-- Ce script analyse et corrige les problèmes de noms manquants
-- IMPACT : Lecture seule puis corrections
-- DURÉE : 5-10 minutes

-- 1. ANALYSE DES NOMS MANQUANTS
-- 📊 Vérifier combien de noms manquent:
SELECT 
  'Campagnes sans nom' as probleme,
  COUNT(*) as nombre,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM facebook_ads_data), 2) as pourcentage
FROM facebook_ads_data 
WHERE campaign_name IS NULL OR campaign_name = ''

UNION ALL

SELECT 
  'Adsets sans nom' as probleme,
  COUNT(*) as nombre,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM facebook_ads_data), 2) as pourcentage
FROM facebook_ads_data 
WHERE adset_name IS NULL OR adset_name = ''

UNION ALL

SELECT 
  'Ads sans nom' as probleme,
  COUNT(*) as nombre,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM facebook_ads_data), 2) as pourcentage
FROM facebook_ads_data 
WHERE ad_name IS NULL OR ad_name = '';

-- 2. ANALYSE DES DOUBLONS POTENTIELS
-- 🔍 Vérifier les doublons par breakdowns:
SELECT 
  'Doublons par breakdowns' as probleme,
  COUNT(*) - COUNT(DISTINCT (account_id, ad_id, date_start)) as nombre_doublons,
  COUNT(*) as total_lignes,
  COUNT(DISTINCT (account_id, ad_id, date_start)) as lignes_uniques
FROM facebook_ads_data;

-- 3. EXEMPLE DE DOUBLONS
-- 📋 Montrer un exemple de doublons:
WITH duplicate_ads AS (
  SELECT account_id, ad_id, date_start, COUNT(*) as occurrences
  FROM facebook_ads_data
  GROUP BY account_id, ad_id, date_start
  HAVING COUNT(*) > 1
  LIMIT 1
)
SELECT 
  fad.account_id,
  fad.ad_id,
  fad.ad_name,
  fad.date_start,
  fad.age,
  fad.gender,
  fad.country,
  fad.publisher_platform,
  fad.impressions,
  fad.spend
FROM facebook_ads_data fad
JOIN duplicate_ads da ON 
  fad.account_id = da.account_id AND 
  fad.ad_id = da.ad_id AND 
  fad.date_start = da.date_start
ORDER BY fad.account_id, fad.ad_id, fad.date_start;

-- 4. CRÉER TABLE TEMPORAIRE POUR NOMS CORRECTS
-- 📝 Créer une table pour stocker les noms corrects (sans breakdowns):
CREATE TEMPORARY TABLE facebook_names_lookup AS
SELECT DISTINCT
  account_id,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  ad_id,
  ad_name
FROM facebook_ads_data
WHERE campaign_name IS NOT NULL AND campaign_name != ''
  AND adset_name IS NOT NULL AND adset_name != ''
  AND ad_name IS NOT NULL AND ad_name != '';

-- 5. VÉRIFIER LA COHÉRENCE DES NOMS
-- ⚠️ Vérifier s'il y a des noms différents pour les mêmes IDs:
SELECT 
  'Campaigns avec noms différents' as probleme,
  COUNT(*) as nombre
FROM (
  SELECT campaign_id, COUNT(DISTINCT campaign_name) as name_count
  FROM facebook_names_lookup
  GROUP BY campaign_id
  HAVING COUNT(DISTINCT campaign_name) > 1
) inconsistent_campaigns

UNION ALL

SELECT 
  'Adsets avec noms différents' as probleme,
  COUNT(*) as nombre
FROM (
  SELECT adset_id, COUNT(DISTINCT adset_name) as name_count
  FROM facebook_names_lookup
  GROUP BY adset_id
  HAVING COUNT(DISTINCT adset_name) > 1
) inconsistent_adsets

UNION ALL

SELECT 
  'Ads avec noms différents' as probleme,
  COUNT(*) as nombre
FROM (
  SELECT ad_id, COUNT(DISTINCT ad_name) as name_count
  FROM facebook_names_lookup
  GROUP BY ad_id
  HAVING COUNT(DISTINCT ad_name) > 1
) inconsistent_ads;

-- 6. PROPOSITION DE CORRECTION
-- 💡 Créer une vue pour les données correctes (sans doublons de breakdowns):
CREATE OR REPLACE VIEW facebook_ads_clean AS
SELECT 
  -- Grouper par ad et date pour éliminer les doublons de breakdowns
  compte_id,
  user_id,
  account_id,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  ad_id,
  ad_name,
  date_start,
  date_stop,
  -- Sommer les métriques qui peuvent être agrégées
  SUM(impressions) as impressions,
  SUM(reach) as reach,
  SUM(spend) as spend,
  SUM(clicks) as clicks,
  SUM(unique_clicks) as unique_clicks,
  SUM(inline_link_clicks) as inline_link_clicks,
  SUM(inline_post_engagement) as inline_post_engagement,
  -- Calculer les moyennes pondérées pour les ratios
  CASE 
    WHEN SUM(impressions) > 0 THEN (SUM(clicks) * 100.0 / SUM(impressions))
    ELSE 0 
  END as ctr,
  CASE 
    WHEN SUM(clicks) > 0 THEN (SUM(spend) / SUM(clicks))
    ELSE 0 
  END as cpc,
  CASE 
    WHEN SUM(impressions) > 0 THEN (SUM(spend) * 1000.0 / SUM(impressions))
    ELSE 0 
  END as cpm,
  CASE 
    WHEN SUM(reach) > 0 THEN (SUM(impressions) * 1.0 / SUM(reach))
    ELSE 0 
  END as frequency,
  -- Prendre les premiers statuts trouvés
  MIN(sync_status) as sync_status,
  AVG(data_quality_score) as data_quality_score,
  -- Agréger les actions JSON
  jsonb_agg(DISTINCT actions::jsonb) FILTER (WHERE actions != '[]') as all_actions
FROM facebook_ads_data
GROUP BY 
  compte_id, user_id, account_id, campaign_id, campaign_name, 
  adset_id, adset_name, ad_id, ad_name, date_start, date_stop;

-- 7. TESTER LA VUE PROPRE
-- 🧪 Comparer les totaux avant/après:
SELECT 
  'Données originales' as source,
  COUNT(*) as total_lignes,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend,
  COUNT(DISTINCT ad_id) as unique_ads
FROM facebook_ads_data

UNION ALL

SELECT 
  'Données nettoyées' as source,
  COUNT(*) as total_lignes,
  SUM(impressions) as total_impressions,
  SUM(spend) as total_spend,
  COUNT(DISTINCT ad_id) as unique_ads
FROM facebook_ads_clean;

-- 8. RECOMMANDATIONS
-- 📋 Afficher les recommandations:
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 RECOMMANDATIONS POUR CORRIGER LES PROBLÈMES:';
  RAISE NOTICE '';
  RAISE NOTICE '1. NOMS MANQUANTS:';
  RAISE NOTICE '   - Modifier l''API Facebook pour récupérer les noms';
  RAISE NOTICE '   - Champs à ajouter: adset{name}, campaign{name}';
  RAISE NOTICE '';
  RAISE NOTICE '2. DOUBLONS BREAKDOWNS:';
  RAISE NOTICE '   - Utiliser la vue facebook_ads_clean pour les rapports';
  RAISE NOTICE '   - Ou créer une table ads_summary sans breakdowns';
  RAISE NOTICE '';
  RAISE NOTICE '3. CALCULS CORRECTS:';
  RAISE NOTICE '   - Grouper par ad_id + date avant agrégation';
  RAISE NOTICE '   - Recalculer les ratios après agrégation';
  RAISE NOTICE '';
  RAISE NOTICE '4. ARCHITECTURE:';
  RAISE NOTICE '   - Standardiser sur compte_id uniquement';
  RAISE NOTICE '   - Supprimer user_id de la contrainte unique';
END $$;