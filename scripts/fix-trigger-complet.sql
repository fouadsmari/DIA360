-- Correction complète du trigger log_user_changes
-- À exécuter dans Supabase SQL Editor

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour DELETE, on utilise user_id = NULL pour éviter la contrainte FK
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.auth_logs (user_id, action, status, details)
    VALUES (
      NULL, -- user_id NULL car l'utilisateur est en cours de suppression
      'user_deleted',
      'success',
      json_build_object(
        'deleted_user_id', OLD.id,
        'deleted_user_email', OLD.email,
        'deleted_user_poste', OLD.poste,
        'deleted_at', NOW()
      ) -- RETIRER ::text - laisser en JSONB natif
    );
    RETURN OLD;
  END IF;

  -- Pour INSERT et UPDATE, comportement normal
  INSERT INTO public.auth_logs (user_id, action, status, details)
  VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN NEW.id
      ELSE NEW.id
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'user_created'
      WHEN TG_OP = 'UPDATE' THEN 'user_updated'
    END,
    'success',
    CASE 
      WHEN TG_OP = 'INSERT' THEN 
        json_build_object(
          'user_id', NEW.id,
          'email', NEW.email,
          'poste', NEW.poste,
          'created_at', NOW()
        ) -- RETIRER ::text - laisser en JSONB natif
      WHEN TG_OP = 'UPDATE' THEN 
        json_build_object(
          'user_id', NEW.id,
          'old_email', OLD.email,
          'new_email', NEW.email,
          'old_poste', OLD.poste,
          'new_poste', NEW.poste,
          'updated_at', NOW()
        ) -- RETIRER ::text - laisser en JSONB natif
    END
  );
  
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;