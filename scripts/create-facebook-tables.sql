-- Script de création des tables pour le module Facebook Ads
-- À exécuter dans Supabase SQL Editor

-- Table principale pour stocker toutes les données Facebook Ads
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
  
  -- Index composé pour performance et unicité
  UNIQUE(user_id, ad_id, date_start, date_stop, age, gender, country, publisher_platform, platform_position, impression_device)
);

-- Index pour optimisation des requêtes
CREATE INDEX IF NOT EXISTS idx_facebook_ads_user_date 
  ON public.facebook_ads_data(user_id, date_start, date_stop);
  
CREATE INDEX IF NOT EXISTS idx_facebook_ads_hierarchy 
  ON public.facebook_ads_data(account_id, campaign_id, adset_id, ad_id);
  
CREATE INDEX IF NOT EXISTS idx_facebook_ads_performance 
  ON public.facebook_ads_data(user_id, date_start, spend, impressions);

CREATE INDEX IF NOT EXISTS idx_facebook_ads_breakdowns
  ON public.facebook_ads_data(user_id, age, gender, country);

-- Table pour suivre le statut des synchronisations
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

-- Index pour les requêtes de statut
CREATE INDEX IF NOT EXISTS idx_facebook_sync_status_user 
  ON public.facebook_sync_status(user_id, account_id, status);

-- Table pour les logs d'import détaillés
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

-- Index pour l'historique des imports
CREATE INDEX IF NOT EXISTS idx_facebook_import_logs_user 
  ON public.facebook_import_logs(user_id, account_id, created_at DESC);

-- Activer Row Level Security (RLS)
ALTER TABLE public.facebook_ads_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_import_logs ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour facebook_ads_data
DROP POLICY IF EXISTS "facebook_ads_data_policy" ON public.facebook_ads_data;
CREATE POLICY "facebook_ads_data_policy" ON public.facebook_ads_data
  FOR ALL
  USING (user_id = auth.uid());

-- Politique RLS pour facebook_sync_status
DROP POLICY IF EXISTS "facebook_sync_status_policy" ON public.facebook_sync_status;
CREATE POLICY "facebook_sync_status_policy" ON public.facebook_sync_status
  FOR ALL
  USING (user_id = auth.uid());

-- Politique RLS pour facebook_import_logs
DROP POLICY IF EXISTS "facebook_import_logs_policy" ON public.facebook_import_logs;
CREATE POLICY "facebook_import_logs_policy" ON public.facebook_import_logs
  FOR ALL
  USING (user_id = auth.uid());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour facebook_ads_data
DROP TRIGGER IF EXISTS update_facebook_ads_data_updated_at ON public.facebook_ads_data;
CREATE TRIGGER update_facebook_ads_data_updated_at 
  BEFORE UPDATE ON public.facebook_ads_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE public.facebook_ads_data IS 'Données détaillées des publicités Facebook au niveau ad avec breakdowns';
COMMENT ON TABLE public.facebook_sync_status IS 'Statut des synchronisations Facebook en cours ou terminées';
COMMENT ON TABLE public.facebook_import_logs IS 'Historique détaillé des imports Facebook avec métriques';

COMMENT ON COLUMN public.facebook_ads_data.actions IS 'Actions au format JSONB [{action_type: "...", value: n}, ...]';
COMMENT ON COLUMN public.facebook_ads_data.action_values IS 'Valeurs des actions au format JSONB [{action_type: "...", value: n}, ...]';
COMMENT ON COLUMN public.facebook_sync_status.progress IS 'Pourcentage de progression de 0 à 100';

-- Vue pour agrégation niveau Account
CREATE OR REPLACE VIEW public.facebook_account_summary AS
SELECT 
  user_id,
  account_id,
  date_start,
  date_stop,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(cpc) as avg_cpc,
  AVG(cpm) as avg_cpm,
  COUNT(DISTINCT campaign_id) as campaigns_count,
  COUNT(DISTINCT adset_id) as adsets_count,
  COUNT(DISTINCT ad_id) as ads_count
FROM public.facebook_ads_data
GROUP BY user_id, account_id, date_start, date_stop;

-- Vue pour agrégation niveau Campaign
CREATE OR REPLACE VIEW public.facebook_campaign_summary AS
SELECT 
  user_id,
  account_id,
  campaign_id,
  campaign_name,
  date_start,
  date_stop,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(cpc) as avg_cpc,
  AVG(cpm) as avg_cpm,
  COUNT(DISTINCT adset_id) as adsets_count,
  COUNT(DISTINCT ad_id) as ads_count
FROM public.facebook_ads_data
GROUP BY user_id, account_id, campaign_id, campaign_name, date_start, date_stop;

-- Vue pour agrégation niveau AdSet
CREATE OR REPLACE VIEW public.facebook_adset_summary AS
SELECT 
  user_id,
  account_id,
  campaign_id,
  campaign_name,
  adset_id,
  adset_name,
  date_start,
  date_stop,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(spend) as total_spend,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(cpc) as avg_cpc,
  AVG(cpm) as avg_cpm,
  COUNT(DISTINCT ad_id) as ads_count
FROM public.facebook_ads_data
GROUP BY user_id, account_id, campaign_id, campaign_name, adset_id, adset_name, date_start, date_stop;

-- Grant permissions pour les vues
GRANT SELECT ON public.facebook_account_summary TO authenticated;
GRANT SELECT ON public.facebook_campaign_summary TO authenticated;
GRANT SELECT ON public.facebook_adset_summary TO authenticated;