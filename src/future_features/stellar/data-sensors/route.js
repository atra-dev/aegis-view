import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/utils/withErrorHandler';
import { safeConsole } from '@/utils/errorHandler';

async function handler(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const baseUrl = process.env.NEXT_PUBLIC_STELLAR_API_URL?.trim();
    
    if (!baseUrl) {
      throw new Error('API configuration error');
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const custId = searchParams.get('cust_id');

    // Construct the API URL with optional customer ID
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/data_sensors${custId ? `?cust_id=${custId}` : ''}`;
    safeConsole.log('Fetching data sensors from:', apiUrl);

    // Make the request to the Stellar API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication token expired or invalid');
      }
      throw new Error(responseData?.error || 'Failed to fetch data sensors');
    }

    if (!responseData) {
      throw new Error('Invalid response from data sensors API');
    }
    
    // Ensure we have the correct data structure
    const sensors = Array.isArray(responseData) ? responseData : 
                   Array.isArray(responseData.sensors) ? responseData.sensors : 
                   Array.isArray(responseData.data) ? responseData.data : null;

    if (!sensors) {
      throw new Error('Invalid data format received from API');
    }

    safeConsole.log('Processed sensors:', {
      total: sensors.length,
      hasData: sensors.length > 0,
      firstItem: sensors[0] ? { ...sensors[0], _sensitive: '[REDACTED]' } : null
    });

    // Return the data sensors data
    return NextResponse.json({
      success: true,
      total: sensors.length,
      sensors: sensors
    });
  } catch (error) {
    safeConsole.error('Data sensors error:', error);
    throw error; // Let the error handler format the response
  }
}

// Export the wrapped handler directly as GET
export const GET = withErrorHandler(handler);

// Add OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 