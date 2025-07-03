-- =====================================
-- CRÉATION TABLE MODÈLES COLONNES FACEBOOK
-- =====================================
-- MAITRE: Script permanent pour modèles colonnes Facebook

-- 🏗️ TABLE MODÈLES COLONNES FACEBOOK

CREATE TABLE IF NOT EXISTS public.facebook_column_templates (
  id BIGSERIAL PRIMARY KEY,
  
  -- Utilisateur et nom du modèle
  user_id TEXT NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE, -- Permet partage entre utilisateurs
  
  -- Configuration des colonnes
  visible_columns JSONB NOT NULL, -- Array des colonnes visibles
  column_order JSONB NOT NULL,    -- Ordre d'affichage des colonnes
  column_widths JSONB DEFAULT '{}', -- Largeurs personnalisées (optionnel)
  
  -- Métadonnées
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  UNIQUE(user_id, template_name)
);

-- 🔒 POLITIQUES RLS

ALTER TABLE public.facebook_column_templates ENABLE ROW LEVEL SECURITY;

-- Politique pour accès utilisateur
CREATE POLICY "facebook_column_templates_user_policy" ON public.facebook_column_templates
  FOR ALL
  USING (
    user_id = auth.jwt() ->> 'sub' OR 
    is_shared = true OR
    (EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.jwt() ->> 'sub' 
      AND poste IN ('Superadmin', 'Direction')
    ))
  );

-- 📇 INDEX POUR PERFORMANCE

CREATE INDEX idx_facebook_column_templates_user ON public.facebook_column_templates(user_id);
CREATE INDEX idx_facebook_column_templates_default ON public.facebook_column_templates(user_id, is_default);
CREATE INDEX idx_facebook_column_templates_shared ON public.facebook_column_templates(is_shared) WHERE is_shared = true;

-- 📊 MODÈLE DEFAULT POUR TOUS LES UTILISATEURS

INSERT INTO public.facebook_column_templates (
  user_id,
  template_name,
  is_default,
  is_shared,
  description,
  visible_columns,
  column_order
) VALUES (
  'system',
  'Modèle Standard',
  true,
  true,
  'Modèle par défaut avec colonnes essentielles',
  '["ad_name", "adset_id", "campaign_id", "sync_status", "performance", "spend", "impressions", "clicks", "ctr", "cpc"]',
  '["ad_name", "adset_id", "campaign_id", "sync_status", "performance", "spend", "impressions", "clicks", "ctr", "cpc"]'
) ON CONFLICT (user_id, template_name) DO NOTHING;

-- ✅ TABLE CRÉÉE AVEC SUCCÈS
-- 
-- 📋 FONCTIONNALITÉS:
--   1. Modèles personnalisés par utilisateur
--   2. Modèles partagés entre utilisateurs
--   3. Modèle par défaut système
--   4. Ordre et largeur des colonnes
--   5. RLS pour sécurité