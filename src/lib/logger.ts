// Système de logging pour DIA360
// Respect strict du MAITRE.md - Logging exhaustif pour debugging

interface LogContext {
  userId?: string
  email?: string
  ip?: string
  userAgent?: string
  validationErrors?: Record<string, string>
  changes?: Record<string, string | number | boolean>
  [key: string]: string | number | boolean | undefined | Record<string, string> | Record<string, string | number | boolean>
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${level}: ${message}${contextStr}`
  }

  // Logging pour authentification
  auth = {
    loginAttempt: (email: string, context?: LogContext) => {
      const message = `🔑 LOGIN_ATTEMPT: ${email}`
      console.log(this.formatMessage('INFO', message, context))
    },

    loginSuccess: (user: { id: string; nom: string; prenom: string; email: string; poste: string }, context?: LogContext) => {
      const message = `✅ LOGIN_SUCCESS: User ${user.id} - ${user.nom} ${user.prenom} (${user.poste})`
      console.log(this.formatMessage('INFO', message, { ...context, userId: user.id, email: user.email }))
    },

    loginFailedCredentials: (email: string, context?: LogContext) => {
      const message = `❌ LOGIN_FAILED: Invalid credentials for ${email}`
      console.error(this.formatMessage('ERROR', message, { ...context, email }))
    },

    loginFailedInactive: (email: string, context?: LogContext) => {
      const message = `❌ LOGIN_FAILED: Account inactive for ${email}`
      console.error(this.formatMessage('ERROR', message, { ...context, email }))
    },

    loginFailedDatabase: (email: string, error: Error, context?: LogContext) => {
      const message = `❌ LOGIN_ERROR: Database error for ${email} - ${error.message}`
      console.error(this.formatMessage('ERROR', message, { ...context, email, error: error.message, stack: error.stack }))
    },

    logout: (userId: string, context?: LogContext) => {
      const message = `🚪 LOGOUT: User ${userId}`
      console.log(this.formatMessage('INFO', message, { ...context, userId }))
    }
  }

  // Logging pour inscription
  register = {
    attempt: (email: string, context?: LogContext) => {
      const message = `📝 REGISTER_ATTEMPT: ${email}`
      console.log(this.formatMessage('INFO', message, { ...context, email }))
    },

    success: (user: { id: string; nom: string; prenom: string; email: string; poste: string }, context?: LogContext) => {
      const message = `✅ REGISTER_SUCCESS: New user ${user.id} - ${user.nom} ${user.prenom} (${user.poste})`
      console.log(this.formatMessage('INFO', message, { ...context, userId: user.id, email: user.email }))
    },

    failedEmailExists: (email: string, context?: LogContext) => {
      const message = `❌ REGISTER_FAILED: Email ${email} already exists`
      console.error(this.formatMessage('ERROR', message, { ...context, email }))
    },

    failedValidation: (email: string, errors: Record<string, string>, context?: LogContext) => {
      const message = `❌ REGISTER_FAILED: Validation errors for ${email}`
      console.error(this.formatMessage('ERROR', message, { ...context, email, validationErrors: errors }))
    },

    failedDatabase: (email: string, error: Error, context?: LogContext) => {
      const message = `❌ REGISTER_ERROR: Database error for ${email} - ${error.message}`
      console.error(this.formatMessage('ERROR', message, { ...context, email, error: error.message, stack: error.stack }))
    }
  }

  // Logging pour réinitialisation mot de passe
  resetPassword = {
    request: (email: string, context?: LogContext) => {
      const message = `🔄 RESET_REQUEST: Password reset requested for ${email}`
      console.log(this.formatMessage('INFO', message, { ...context, email }))
    },

    success: (email: string, context?: LogContext) => {
      const message = `✅ RESET_SUCCESS: Password reset completed for ${email}`
      console.log(this.formatMessage('INFO', message, { ...context, email }))
    },

    failedUserNotFound: (email: string, context?: LogContext) => {
      const message = `❌ RESET_FAILED: User not found for ${email}`
      console.error(this.formatMessage('ERROR', message, { ...context, email }))
    },

    failedEmail: (email: string, error: Error, context?: LogContext) => {
      const message = `❌ RESET_ERROR: Email sending failed for ${email} - ${error.message}`
      console.error(this.formatMessage('ERROR', message, { ...context, email, error: error.message }))
    }
  }

  // Logging pour gestion profil
  profile = {
    view: (userId: string, context?: LogContext) => {
      const message = `👁️ PROFILE_VIEW: User ${userId} viewed profile`
      console.log(this.formatMessage('INFO', message, { ...context, userId }))
    },

    update: (userId: string, changes: Record<string, string | number | boolean>, context?: LogContext) => {
      const message = `📝 PROFILE_UPDATE: User ${userId} updated profile`
      console.log(this.formatMessage('INFO', message, { ...context, userId, changes }))
    },

    passwordChange: (userId: string, context?: LogContext) => {
      const message = `🔐 PASSWORD_CHANGE: User ${userId} changed password`
      console.log(this.formatMessage('INFO', message, { ...context, userId }))
    }
  }

  // Logging pour administration
  admin = {
    usersList: (adminId: string, context?: LogContext) => {
      const message = `📋 ADMIN_USERS_LIST: Admin ${adminId} viewed users list`
      console.log(this.formatMessage('INFO', message, { ...context, adminId }))
    },

    userEdit: (adminId: string, targetUserId: string, changes: Record<string, string | number | boolean>, context?: LogContext) => {
      const message = `✏️ ADMIN_USER_EDIT: Admin ${adminId} edited user ${targetUserId}`
      console.log(this.formatMessage('INFO', message, { ...context, adminId, targetUserId, changes }))
    },

    userToggle: (adminId: string, targetUserId: string, newStatus: boolean, context?: LogContext) => {
      const message = `🔄 ADMIN_USER_TOGGLE: Admin ${adminId} ${newStatus ? 'activated' : 'deactivated'} user ${targetUserId}`
      console.log(this.formatMessage('INFO', message, { ...context, adminId, targetUserId, newStatus }))
    },

    userDelete: (adminId: string, targetUserId: string, context?: LogContext) => {
      const message = `🗑️ ADMIN_USER_DELETE: Admin ${adminId} deleted user ${targetUserId}`
      console.log(this.formatMessage('WARNING', message, { ...context, adminId, targetUserId }))
    }
  }

  // Logging pour API
  api = {
    request: (method: string, url: string, context?: LogContext) => {
      const message = `🔵 API_REQUEST: ${method} ${url}`
      console.log(this.formatMessage('INFO', message, context))
    },

    success: (method: string, url: string, duration: number, context?: LogContext) => {
      const message = `✅ API_SUCCESS: ${method} ${url} (${duration}ms)`
      console.log(this.formatMessage('INFO', message, { ...context, duration }))
    },

    error: (method: string, url: string, error: Error, duration: number, context?: LogContext) => {
      const message = `❌ API_ERROR: ${method} ${url} (${duration}ms) - ${error.message}`
      console.error(this.formatMessage('ERROR', message, { 
        ...context, 
        duration, 
        error: error.message, 
        stack: error.stack 
      }))
    },

    validation: (method: string, url: string, errors: Record<string, string>, context?: LogContext) => {
      const message = `⚠️ API_VALIDATION: ${method} ${url} - Validation failed`
      console.warn(this.formatMessage('WARNING', message, { ...context, validationErrors: errors }))
    },

    unauthorized: (method: string, url: string, context?: LogContext) => {
      const message = `🚫 API_UNAUTHORIZED: ${method} ${url}`
      console.warn(this.formatMessage('WARNING', message, context))
    }
  }

  // Logging pour base de données
  database = {
    query: (query: string, duration: number, context?: LogContext) => {
      const message = `📊 DB_QUERY: ${query} (${duration}ms)`
      console.log(this.formatMessage('INFO', message, { ...context, query, duration }))
    },

    error: (query: string, error: Error, context?: LogContext) => {
      const message = `❌ DB_ERROR: ${query} - ${error.message}`
      console.error(this.formatMessage('ERROR', message, { 
        ...context, 
        query, 
        error: error.message, 
        stack: error.stack 
      }))
    },

    connection: (status: 'connected' | 'disconnected' | 'error', context?: LogContext) => {
      const emoji = status === 'connected' ? '✅' : status === 'disconnected' ? '🔌' : '❌'
      const message = `${emoji} DB_CONNECTION: ${status}`
      const level = status === 'error' ? 'ERROR' : 'INFO'
      console[status === 'error' ? 'error' : 'log'](this.formatMessage(level, message, context))
    }
  }

  // Logging générique
  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('INFO', message, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('WARNING', message, context))
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = error ? { 
      ...context, 
      error: error.message, 
      stack: error.stack 
    } : context
    console.error(this.formatMessage('ERROR', message, errorContext))
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, context))
    }
  }
}

// Instance singleton du logger
export const logger = new Logger()

// Helper pour extraire context de la requête
export function getRequestContext(request: Request): LogContext {
  const userAgent = request.headers.get('user-agent') || undefined
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return { ip, userAgent }
}