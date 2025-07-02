-- Tables pour gérer les APIs des différentes plateformes
-- À exécuter dans Supabase SQL Editor

-- Table pour les APIs Facebook Ads
CREATE TABLE IF NOT EXISTS public.facebook_ads_apis (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  app_id VARCHAR(255) NOT NULL,
  app_secret VARCHAR(500) NOT NULL,
  access_token TEXT NOT NULL,
  account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Table pour les APIs Google Ads
CREATE TABLE IF NOT EXISTS public.google_ads_apis (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  client_id VARCHAR(500) NOT NULL,
  client_secret VARCHAR(500) NOT NULL,
  refresh_token TEXT NOT NULL,
  developer_token VARCHAR(500) NOT NULL,
  customer_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Table pour les APIs des réseaux sociaux (Facebook Pages, Instagram, LinkedIn, TikTok)
CREATE TABLE IF NOT EXISTS public.social_media_apis (
  id SERIAL PRIMARY KEY,
  plateforme VARCHAR(50) NOT NULL CHECK (plateforme IN ('facebook_page', 'instagram', 'linkedin', 'tiktok')),
  nom VARCHAR(255) NOT NULL,
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  access_token TEXT,
  refresh_token TEXT,
  page_id VARCHAR(255),
  account_id VARCHAR(255),
  config JSONB DEFAULT '{}', -- Pour stocker des configurations spécifiques
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_facebook_ads_apis_active ON public.facebook_ads_apis(is_active);
CREATE INDEX IF NOT EXISTS idx_google_ads_apis_active ON public.google_ads_apis(is_active);
CREATE INDEX IF NOT EXISTS idx_social_media_apis_plateforme ON public.social_media_apis(plateforme);
CREATE INDEX IF NOT EXISTS idx_social_media_apis_active ON public.social_media_apis(is_active);

-- Politiques RLS (Row Level Security)
ALTER TABLE public.facebook_ads_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_apis ENABLE ROW LEVEL SECURITY;

-- Politique pour Facebook Ads APIs - Superadmin et Direction peuvent tout voir/modifier
CREATE POLICY "facebook_ads_apis_policy" ON public.facebook_ads_apis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

-- Politique pour Google Ads APIs - Superadmin et Direction peuvent tout voir/modifier
CREATE POLICY "google_ads_apis_policy" ON public.google_ads_apis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

-- Politique pour Social Media APIs - Superadmin et Direction peuvent tout voir/modifier
CREATE POLICY "social_media_apis_policy" ON public.social_media_apis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste IN ('Superadmin', 'Direction')
      AND is_active = true
    )
  );

-- Commentaires pour documentation
COMMENT ON TABLE public.facebook_ads_apis IS 'Configuration des APIs Facebook Ads';
COMMENT ON TABLE public.google_ads_apis IS 'Configuration des APIs Google Ads';
COMMENT ON TABLE public.social_media_apis IS 'Configuration des APIs des réseaux sociaux (Facebook Pages, Instagram, LinkedIn, TikTok)';

COMMENT ON COLUMN public.facebook_ads_apis.app_id IS 'ID de l''application Facebook';
COMMENT ON COLUMN public.facebook_ads_apis.app_secret IS 'Secret de l''application Facebook';
COMMENT ON COLUMN public.facebook_ads_apis.access_token IS 'Token d''accès Facebook Ads';
COMMENT ON COLUMN public.facebook_ads_apis.account_id IS 'ID du compte publicitaire Facebook';

COMMENT ON COLUMN public.google_ads_apis.client_id IS 'Client ID Google Ads';
COMMENT ON COLUMN public.google_ads_apis.client_secret IS 'Client Secret Google Ads';
COMMENT ON COLUMN public.google_ads_apis.refresh_token IS 'Refresh Token Google Ads';
COMMENT ON COLUMN public.google_ads_apis.developer_token IS 'Developer Token Google Ads';
COMMENT ON COLUMN public.google_ads_apis.customer_id IS 'Customer ID Google Ads';

COMMENT ON COLUMN public.social_media_apis.plateforme IS 'Plateforme: facebook_page, instagram, linkedin, tiktok';
COMMENT ON COLUMN public.social_media_apis.config IS 'Configuration JSON spécifique à la plateforme';