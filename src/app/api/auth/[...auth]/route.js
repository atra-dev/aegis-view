import { NextResponse } from 'next/server';

export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api/auth/', '');
  
  const url = new URL(`https://identitytoolkit.googleapis.com/v1/${path}`);
  searchParams.forEach((value, key) => url.searchParams.append(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  return NextResponse.json(data);
}

export async function POST(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api/auth/', '');
  
  const body = await request.json();
  
  const url = new URL(`https://identitytoolkit.googleapis.com/v1/${path}`);
  searchParams.forEach((value, key) => url.searchParams.append(key, value));

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  return NextResponse.json(data);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 