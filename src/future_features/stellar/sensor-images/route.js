import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: 'Bearer token is required'
        },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    // Get API URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_STELLAR_API_URL?.trim();
    if (!baseUrl) {
      console.error('Missing or invalid API URL');
      return NextResponse.json(
        { 
          error: 'Configuration error',
          details: 'API URL is not properly configured'
        },
        { status: 500 }
      );
    }

    // Format the API URL
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/sensor-images`;
    console.log('Fetching from URL:', apiUrl);

    // Make request to Stellar API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Log response details for debugging
    console.log('Stellar API response:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Authentication required',
            details: 'Invalid or expired token'
          },
          { status: 401 }
        );
      }

      // Handle other errors
      const errorText = await response.text();
      console.error('Stellar API error:', errorText);
      
      return NextResponse.json(
        { 
          error: 'API request failed',
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Stellar API response data:', {
      hasData: !!data,
      hasDatasensor: !!data?.data?.datasensor,
      datasensorKeys: data?.data?.datasensor ? Object.keys(data.data.datasensor) : [],
      datasensorLength: data?.data?.datasensor ? Object.keys(data.data.datasensor).length : 0
    });

    // Convert the datasensor object into an array of images
    const sensorImages = data?.data?.datasensor ? 
      Object.entries(data.data.datasensor).map(([key, value]) => ({
        id: key,
        ...value
      })) : [];

    return NextResponse.json({ 
      success: true, 
      data: sensorImages
    });

  } catch (error) {
    console.error('Error in sensor images route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
} 