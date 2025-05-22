import { NextResponse } from 'next/server';
import { 
  setCacheWithExpiry, 
  getCachedData, 
  deleteCachedData, 
  getKeys 
} from '@/services/redis';

// GET endpoint to fetch cached data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      // If no key is provided, return all keys
      const keys = await getKeys();
      return NextResponse.json({ success: true, data: keys });
    }

    const data = await getCachedData(key);
    if (data === null) {
      return NextResponse.json({ success: false, message: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Redis GET Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to set cached data
export async function POST(request) {
  try {
    const body = await request.json();
    const { key, value, expiry } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, message: 'Key and value are required' },
        { status: 400 }
      );
    }

    const success = await setCacheWithExpiry(key, value, expiry);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to set cache' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Data cached successfully' });
  } catch (error) {
    console.error('Redis POST Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove cached data
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, message: 'Key is required' },
        { status: 400 }
      );
    }

    const success = await deleteCachedData(key);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete cache' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Cache deleted successfully' });
  } catch (error) {
    console.error('Redis DELETE Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 