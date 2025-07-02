import { supabaseAdmin } from '@/lib/supabase'

export interface FacebookApiLog {
  user_id: string
  compte_id?: number
  account_id: string
  endpoint: string
  method: string
  request_url: string
  request_headers?: Record<string, string>
  request_body?: unknown
  request_params?: Record<string, string>
  response_status?: number
  response_headers?: Record<string, string>
  response_body?: unknown
  response_time_ms?: number
  sync_id?: string
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  date_range_from?: string
  date_range_to?: string
  success?: boolean
  error_message?: string
  error_code?: string
}

export class FacebookApiLogger {
  private startTime: number = Date.now()
  
  constructor(
    private userId: string,
    private compteId?: number,
    private accountId?: string
  ) {}

  async logRequest(logData: Partial<FacebookApiLog>): Promise<void> {
    try {
      // Obtenir la configuration de rétention pour cet utilisateur
      const { data: config } = await supabaseAdmin
        .from('facebook_logs_config')
        .select('retention_days')
        .eq('user_id', this.userId)
        .single()

      const retentionDays = config?.retention_days || 15
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + retentionDays)

      const logEntry: FacebookApiLog = {
        user_id: this.userId,
        compte_id: this.compteId,
        account_id: this.accountId || '',
        endpoint: '',
        method: 'GET',
        request_url: '',
        response_time_ms: Date.now() - this.startTime,
        success: true,
        ...logData
      }

      const { error } = await supabaseAdmin
        .from('facebook_api_logs')
        .insert([{
          ...logEntry,
          expires_at: expiresAt.toISOString()
        }])

      if (error) {
        console.error('Erreur lors de l\'enregistrement du log Facebook:', error)
      }
    } catch (error) {
      console.error('Erreur Facebook Logger:', error)
    }
  }

  async logApiCall(
    endpoint: string,
    method: string,
    url: string,
    options?: {
      headers?: Record<string, string>
      body?: unknown
      params?: Record<string, string>
      syncId?: string
      level?: 'account' | 'campaign' | 'adset' | 'ad'
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<unknown> {
    this.startTime = Date.now()
    let response: Response | null = null
    let responseBody: unknown = null

    try {
      console.log(`🚀 Facebook API Call: ${method} ${url}`)
      
      // Faire le VRAI appel API Facebook
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        },
        ...(options?.body && { body: JSON.stringify(options.body) })
      })
      
      if (response.ok) {
        responseBody = await response.json()
      }

      // Logger la requête et réponse
      await this.logRequest({
        endpoint,
        method,
        request_url: url,
        request_headers: options?.headers,
        request_body: options?.body,
        request_params: options?.params,
        response_status: response.status,
        response_body: responseBody,
        response_time_ms: Date.now() - this.startTime,
        sync_id: options?.syncId,
        level: options?.level,
        date_range_from: options?.dateFrom,
        date_range_to: options?.dateTo,
        success: response.ok,
        error_message: response.ok ? undefined : `HTTP ${response.status}`,
        error_code: response.ok ? undefined : response.status.toString()
      })

      return responseBody

    } catch (error) {
      console.error(`❌ Facebook API Error: ${endpoint}`, error)
      
      // Logger l'erreur
      await this.logRequest({
        endpoint,
        method,
        request_url: url,
        request_headers: options?.headers,
        request_body: options?.body,
        request_params: options?.params,
        response_status: response?.status || 0,
        response_time_ms: Date.now() - this.startTime,
        sync_id: options?.syncId,
        level: options?.level,
        date_range_from: options?.dateFrom,
        date_range_to: options?.dateTo,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_code: 'NETWORK_ERROR'
      })

      throw error
    }
  }

}

export async function createFacebookLogger(
  userId: string,
  compteId?: number,
  accountId?: string
): Promise<FacebookApiLogger> {
  return new FacebookApiLogger(userId, compteId, accountId)
}