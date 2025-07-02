-- Table pour logs des requêtes Facebook Marketing API
-- À exécuter dans Supabase SQL Editor

-- 1. Créer la table facebook_api_logs
CREATE TABLE IF NOT EXISTS facebook_api_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  compte_id INTEGER REFERENCES comptes(id),
  account_id TEXT NOT NULL,
  
  -- Informations sur la requête
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  request_url TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  request_params JSONB,
  
  -- Informations sur la réponse
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  response_time_ms INTEGER,
  
  -- Metadata
  sync_id TEXT,
  level TEXT CHECK (level IN ('account', 'campaign', 'adset', 'ad')),
  date_range_from DATE,
  date_range_to DATE,
  
  -- Status et erreurs
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  error_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 days'
);

-- 2. Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_user_id ON facebook_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_compte_id ON facebook_api_logs(compte_id);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_account_id ON facebook_api_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_created_at ON facebook_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_expires_at ON facebook_api_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_endpoint ON facebook_api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_facebook_api_logs_success ON facebook_api_logs(success);

-- 3. Fonction de nettoyage automatique des logs expirés
CREATE OR REPLACE FUNCTION cleanup_expired_facebook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM facebook_api_logs WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Table pour configurer la rétention des logs
CREATE TABLE IF NOT EXISTS facebook_logs_config (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  retention_days INTEGER DEFAULT 15 CHECK (retention_days >= 1 AND retention_days <= 90),
  auto_cleanup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. RLS (Row Level Security) pour facebook_api_logs
ALTER TABLE facebook_api_logs ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs voient seulement leurs logs
CREATE POLICY "Users can view their own facebook logs" ON facebook_api_logs
FOR SELECT USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role IN ('Superadmin', 'Direction')
  )
);

-- Policy pour que les utilisateurs puissent insérer leurs logs
CREATE POLICY "Users can insert their own facebook logs" ON facebook_api_logs
FOR INSERT WITH CHECK (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role IN ('Superadmin', 'Direction', 'Responsable')
  )
);

-- Policy pour que les Superadmin puissent tout gérer
CREATE POLICY "Superadmin can manage all facebook logs" ON facebook_api_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'Superadmin'
  )
);

-- 6. RLS pour facebook_logs_config
ALTER TABLE facebook_logs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own log config" ON facebook_logs_config
FOR ALL USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role IN ('Superadmin', 'Direction')
  )
);

-- 7. Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_facebook_logs_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facebook_logs_config_updated_at
  BEFORE UPDATE ON facebook_logs_config
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_logs_config_updated_at();

-- 8. Initialiser la config par défaut pour les utilisateurs existants
INSERT INTO facebook_logs_config (user_id, retention_days, auto_cleanup)
SELECT DISTINCT auth_user_id, 15, true
FROM users 
WHERE role IN ('Superadmin', 'Direction', 'Responsable')
ON CONFLICT (user_id) DO NOTHING;

-- 9. Commentaires pour documentation
COMMENT ON TABLE facebook_api_logs IS 'Logs de toutes les requêtes envoyées à l''API Facebook Marketing';
COMMENT ON TABLE facebook_logs_config IS 'Configuration de la rétention des logs Facebook par utilisateur';
COMMENT ON FUNCTION cleanup_expired_facebook_logs() IS 'Nettoie automatiquement les logs Facebook expirés';

-- 10. Créer la fonction pour ajuster la rétention des logs existants
CREATE OR REPLACE FUNCTION update_facebook_logs_retention(p_user_id TEXT, p_retention_days INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Mettre à jour la configuration
  INSERT INTO facebook_logs_config (user_id, retention_days, auto_cleanup)
  VALUES (p_user_id, p_retention_days, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    retention_days = p_retention_days,
    updated_at = NOW();
    
  -- Mettre à jour les dates d'expiration des logs existants
  UPDATE facebook_api_logs 
  SET expires_at = created_at + (p_retention_days || ' days')::INTERVAL
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;