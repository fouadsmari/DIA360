-- Script pour mettre à jour la contrainte CHECK sur la colonne poste
-- pour inclure "Client"

-- 1. D'abord, supprimer l'ancienne contrainte
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_poste_check;

-- 2. Créer une nouvelle contrainte qui inclut "Client"
ALTER TABLE users ADD CONSTRAINT users_poste_check 
CHECK (poste IN ('Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS', 'Client'));