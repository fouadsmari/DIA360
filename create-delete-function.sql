-- Fonction pour supprimer un utilisateur en cascade
CREATE OR REPLACE FUNCTION delete_user_cascade(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Supprimer d'abord tous les auth_logs
    DELETE FROM auth_logs WHERE user_id = target_user_id;
    
    -- Supprimer l'utilisateur
    DELETE FROM users WHERE id = target_user_id;
    
    -- Retourner le résultat
    result := json_build_object('success', true, 'deleted_user_id', target_user_id);
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, retourner les détails
    result := json_build_object(
        'success', false, 
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;