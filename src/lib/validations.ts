import { z } from 'zod'

// Schema pour l'inscription utilisateur
export const RegisterSchema = z.object({
  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom contient des caractères invalides'),
  
  prenom: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le prénom contient des caractères invalides'),
  
  email: z.string()
    .email('Format d\'email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères')
    .toLowerCase(),
  
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Le mot de passe doit contenir: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial'
    ),
  
  poste: z.enum(['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS'], {
    errorMap: () => ({ message: 'Poste invalide' })
  })
})

// Schema pour la connexion
export const LoginSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide')
    .toLowerCase(),
  
  password: z.string()
    .min(1, 'Mot de passe requis')
})

// Schema pour le changement de mot de passe
export const ChangePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Mot de passe actuel requis'),
  
  newPassword: z.string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Le mot de passe doit contenir: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial'
    ),
  
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

// Schema pour la réinitialisation de mot de passe
export const ResetPasswordSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide')
    .toLowerCase()
})

// Schema pour la mise à jour du profil utilisateur
export const UpdateUserSchema = z.object({
  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom contient des caractères invalides')
    .optional(),
  
  prenom: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le prénom contient des caractères invalides')
    .optional(),
  
  email: z.string()
    .email('Format d\'email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères')
    .toLowerCase()
    .optional(),
  
  poste: z.enum(['Superadmin', 'Direction', 'Responsable', 'PUP', 'GMS'])
    .optional(),
  
  is_active: z.boolean().optional()
})

// Types TypeScript générés à partir des schemas
export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// Type pour l'utilisateur complet
export interface User {
  id: string
  nom: string
  prenom: string
  email: string
  poste: 'Superadmin' | 'Direction' | 'Responsable' | 'PUP' | 'GMS'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Type pour l'authentification
export interface AuthUser {
  id: string
  email: string
  nom: string
  prenom: string
  poste: string
}

// Type pour les logs d'authentification
export interface AuthLog {
  id: string
  user_id: string | null
  action: string
  status: string
  details: Record<string, string | number | boolean> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}