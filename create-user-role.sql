-- Script pour créer le type user_role avec tous les rôles incluant Client
DO $$ 
BEGIN
    -- Vérifier si le type user_role existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Créer le type avec tous les rôles
        CREATE TYPE user_role AS ENUM ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS', 'Client');
        RAISE NOTICE 'Type user_role créé avec tous les rôles incluant Client';
    ELSE
        -- Le type existe, ajouter Client s'il n'y est pas
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'Client' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
            ALTER TYPE user_role ADD VALUE 'Client';
            RAISE NOTICE 'Valeur "Client" ajoutée au type user_role existant';
        ELSE
            RAISE NOTICE 'Valeur "Client" existe déjà dans user_role';
        END IF;
    END IF;
END $$;