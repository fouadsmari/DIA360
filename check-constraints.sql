-- Vérifier les contraintes sur la table users
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
JOIN pg_namespace n ON cl.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND cl.relname = 'users'
AND c.contype = 'c'; -- check constraints