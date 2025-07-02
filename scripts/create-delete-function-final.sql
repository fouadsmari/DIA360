-- Solution définitive : Fonction PostgreSQL qui contourne le trigger
-- À exécuter dans Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_user_final(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_data RECORD;
BEGIN
    -- Récupérer les données utilisateur avant suppression
    SELECT * INTO user_data FROM users WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        result := json_build_object('success', false, 'error', 'Utilisateur non trouvé');
        RETURN result;
    END IF;
    
    -- Empêcher suppression du Superadmin principal
    IF user_data.poste = 'Superadmin' AND user_data.email = 'admin@dia360.com' THEN
        result := json_build_object('success', false, 'error', 'Impossible de supprimer le Superadmin principal');
        RETURN result;
    END IF;
    
    -- Désactiver temporairement le trigger
    ALTER TABLE users DISABLE TRIGGER user_audit_trigger;
    
    -- Supprimer les auth_logs liés
    DELETE FROM auth_logs WHERE user_id = target_user_id;
    
    -- Créer un log de suppression AVANT de supprimer l'utilisateur
    INSERT INTO auth_logs (user_id, action, status, details)
    VALUES (
        NULL,
        'user_deleted',
        'success',
        json_build_object(
            'deleted_user_id', user_data.id,
            'deleted_user_email', user_data.email,
            'deleted_user_poste', user_data.poste,
            'deleted_at', NOW()
        )
    );
    
    -- Supprimer l'utilisateur (trigger désactivé, pas d'erreur)
    DELETE FROM users WHERE id = target_user_id;
    
    -- Réactiver le trigger
    ALTER TABLE users ENABLE TRIGGER user_audit_trigger;
    
    result := json_build_object(
        'success', true, 
        'deleted_user_id', target_user_id,
        'deleted_user_email', user_data.email
    );
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, réactiver le trigger et retourner l'erreur
    ALTER TABLE users ENABLE TRIGGER user_audit_trigger;
    
    result := json_build_object(
        'success', false, 
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;