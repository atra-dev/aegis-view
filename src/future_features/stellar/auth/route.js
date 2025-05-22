import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/utils/withErrorHandler';
import { safeConsole } from '@/utils/errorHandler';

async function handler(request) {
  const { username, password } = await request.json();
  
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  const baseUrl = process.env.NEXT_PUBLIC_STELLAR_API_URL?.trim();
  if (!baseUrl) {
    throw new Error('API URL is not properly configured');
  }

  // Ensure the URL is properly formatted
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/access_token`;
  safeConsole.log('Making authentication request to:', apiUrl);

  // Create Basic auth string
  const credentials = `${username}:${password}`;
  const authString = Buffer.from(credentials).toString('base64');
  
  // Make request to Stellar API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid username or password');
    }
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  safeConsole.log('Authentication successful:', {
    hasToken: !!data.access_token,
    hasExp: !!data.exp
  });
  
  if (!data.access_token) {
    throw new Error('Invalid API response: No access token provided');
  }
  
  return NextResponse.json({
    success: true,
    token: data.access_token,
    exp: data.exp
  });
}

// Export the wrapped handler directly as POST
export const POST = withErrorHandler(handler);

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
  });
} 