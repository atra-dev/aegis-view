import { safeConsole } from '@/utils/errorHandler';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ 
      success: false,
      error: 'API key is required' 
    });
  }

  try {
    const response = await fetch('https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8', {
      headers: {
        'x-apikey': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      safeConsole.error('API key validation failed:', {
        status: response.status,
        error: data.error || 'Unknown error'
      });
      
      return res.status(response.status).json({ 
        success: false,
        error: 'Invalid API key'
      });
    }

    safeConsole.log('API key validation successful');
    
    return res.status(200).json({ 
      success: true,
      data 
    });
  } catch (error) {
    safeConsole.error('Error checking API key:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to check API key'
    });
  }
}