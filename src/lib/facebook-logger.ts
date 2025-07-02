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
      
      // Faire l'appel API (en mode mock pour le développement)
      response = await this.mockFacebookApiCall(url, method, options)
      
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

  private async mockFacebookApiCall(
    url: string, 
    method: string, 
    options?: Record<string, unknown>
  ): Promise<Response> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

    // En mode développement, simuler des réponses Facebook
    if (url.includes('/insights')) {
      return new Response(JSON.stringify({
        data: [
          {
            impressions: '1000',
            clicks: '50',
            spend: '25.50',
            date_start: options?.params?.time_range || '2025-01-07',
            date_stop: options?.params?.time_range || '2025-01-07'
          }
        ],
        paging: {
          cursors: {
            before: 'before_cursor',
            after: 'after_cursor'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url.includes('/ads')) {
      return new Response(JSON.stringify({
        data: [
          {
            id: '123456789',
            name: 'Test Ad',
            adset_id: '987654321',
            campaign_id: '456789123',
            status: 'ACTIVE'
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Réponse par défaut
    return new Response(JSON.stringify({
      data: [],
      message: 'Mock response from Facebook API'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function createFacebookLogger(
  userId: string,
  compteId?: number,
  accountId?: string
): Promise<FacebookApiLogger> {
  return new FacebookApiLogger(userId, compteId, accountId)
}