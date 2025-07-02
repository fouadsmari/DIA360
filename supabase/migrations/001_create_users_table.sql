-- Migration: Create users table for DIA360
-- Description: Table utilisateurs avec authentification et gestion des rôles

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  poste VARCHAR(50) NOT NULL CHECK (poste IN ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_poste ON public.users(poste);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Superadmin can view all users
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
      AND is_active = true
    )
  );

-- Policy: Superadmin can insert new users
CREATE POLICY "Superadmin can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
      AND is_active = true
    )
  );

-- Policy: Superadmin can update all users
CREATE POLICY "Superadmin can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
      AND is_active = true
    )
  );

-- Policy: Superadmin can delete users (soft delete via is_active)
CREATE POLICY "Superadmin can delete users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
      AND is_active = true
    )
  );

-- Create auth_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for auth_logs performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_action ON public.auth_logs(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_status_date ON public.auth_logs(status, created_at);

-- Enable RLS for auth_logs
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own logs" ON public.auth_logs
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Superadmin can view all logs
CREATE POLICY "Superadmin can view all logs" ON public.auth_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND poste = 'Superadmin'
      AND is_active = true
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log user changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log user modifications for audit trail
  INSERT INTO public.auth_logs (user_id, action, status, details)
  VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN NEW.id
      ELSE OLD.id
    END,
    TG_OP,
    'success',
    CASE 
      WHEN TG_OP = 'INSERT' THEN json_build_object(
        'nom', NEW.nom, 
        'prenom', NEW.prenom, 
        'email', NEW.email, 
        'poste', NEW.poste
      )
      WHEN TG_OP = 'UPDATE' THEN json_build_object(
        'old', json_build_object('nom', OLD.nom, 'prenom', OLD.prenom, 'email', OLD.email, 'poste', OLD.poste, 'is_active', OLD.is_active),
        'new', json_build_object('nom', NEW.nom, 'prenom', NEW.prenom, 'email', NEW.email, 'poste', NEW.poste, 'is_active', NEW.is_active)
      )
      WHEN TG_OP = 'DELETE' THEN json_build_object(
        'nom', OLD.nom, 
        'prenom', OLD.prenom, 
        'email', OLD.email, 
        'poste', OLD.poste
      )
    END
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
CREATE TRIGGER user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION log_user_changes();

-- Create materialized view for dashboard stats
CREATE MATERIALIZED VIEW public.user_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE poste = 'Superadmin') as admin_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month,
  COUNT(*) FILTER (WHERE poste = 'Direction') as direction_count,
  COUNT(*) FILTER (WHERE poste = 'Responsable') as responsable_count,
  COUNT(*) FILTER (WHERE poste = 'PUP') as pup_count,
  COUNT(*) FILTER (WHERE poste = 'GMS') as gms_count
FROM public.users;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_stats_singleton ON public.user_stats ((1));

-- Function to refresh user stats
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh stats when users change
CREATE TRIGGER refresh_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_user_stats();

-- Insert default superadmin user (will be updated with real data)
INSERT INTO public.users (nom, prenom, email, password_hash, poste) 
VALUES (
  'Admin', 
  'System', 
  'admin@dia360.com', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdeNb.QkqLQ7SbO', -- 'admin123'
  'Superadmin'
)
ON CONFLICT (email) DO NOTHING;