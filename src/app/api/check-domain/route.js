import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/utils/withErrorHandler'
import { safeConsole } from '@/utils/errorHandler'

async function handler(request) {
  const { apiKey, entry } = await request.json()
  
  if (!apiKey || !entry) {
    throw new Error('API key and entry are required')
  }

  const response = await fetch(
    `https://www.virustotal.com/api/v3/domains/${entry}`,
    {
      headers: {
        'x-apikey': apiKey
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to check domain')
  }

  const data = await response.json()
  safeConsole.log('VirusTotal response:', data)
  
  if (data.data?.attributes?.last_analysis_stats) {
    return NextResponse.json({
      success: true,
      malicious: data.data.attributes.last_analysis_stats.malicious
    })
  }
  
  return NextResponse.json({ success: true, malicious: 0 })
}

// Export the wrapped handler directly as POST
export const POST = withErrorHandler(handler)

// Add OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
