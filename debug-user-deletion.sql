-- Script pour déboguer la suppression d'utilisateurs

-- 1. Vérifier les contraintes de clés étrangères sur la table users
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name='users' OR ccu.table_name='users');

-- 2. Vérifier les politiques RLS sur la table users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 3. Vérifier les utilisateurs de test
SELECT id, email, poste 
FROM users 
WHERE email LIKE '%test%';

-- 4. Essayer de supprimer un utilisateur de test spécifique
-- DELETE FROM users WHERE email = 'test4@dia360.com';