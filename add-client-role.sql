-- Script simple pour ajouter "Client" au type user_role existant
DO $$ 
BEGIN
    -- Ajouter Client au type user_role s'il n'existe pas déjà
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Client' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'Client';
        RAISE NOTICE 'Valeur "Client" ajoutée au type user_role';
    ELSE
        RAISE NOTICE 'Valeur "Client" existe déjà dans user_role';
    END IF;
END $$;