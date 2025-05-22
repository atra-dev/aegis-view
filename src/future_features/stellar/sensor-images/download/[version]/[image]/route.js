import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { version, image } = params;
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const baseUrl = process.env.NEXT_PUBLIC_STELLAR_API_URL?.trim();
    
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'API URL is not configured' },
        { status: 500 }
      );
    }

    // Construct the download URL
    const downloadUrl = `${baseUrl.replace(/\/$/, '')}/sensor-images/download/${version}/${image}`;
    console.log('Downloading from:', downloadUrl);

    // Make the request to the Stellar API
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: response.status }
        );
      }
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Sensor image not found' },
          { status: 404 }
        );
      }

      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to download sensor image' },
        { status: response.status }
      );
    }

    // Get the download URL from the response
    const data = await response.json();
    
    // Return the download URL to the client
    return NextResponse.json({ 
      success: true, 
      downloadUrl: data 
    });

  } catch (error) {
    console.error('Sensor image download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download sensor image' },
      { status: 500 }
    );
  }
} 