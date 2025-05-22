import { logger } from '@/utils/logger'

const VIRUSTOTAL_API_KEY = process.env.NEXT_PUBLIC_VIRUSTOTAL_API_KEY

export const checkIPReputation = async (ip) => {
  try {
    if (!VIRUSTOTAL_API_KEY) {
      logger.error('VirusTotal API key is not configured')
      return { success: false, error: 'VirusTotal API key is not configured' }
    }

    const response = await fetch('/api/check-ip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: VIRUSTOTAL_API_KEY,
        entry: ip
      })
    })

    if (!response.ok) {
      throw new Error('Failed to check IP reputation')
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('Error checking IP reputation:', error)
    return { success: false, error: error.message }
  }
} 