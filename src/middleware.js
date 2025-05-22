import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { createErrorResponse, safeConsole } from './utils/errorHandler';

// Initialize Redis client
let redis;

async function initRedis() {
  try {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://default:26qY8kWFZ5xbFN6RKaOFnt0KTYuoXvFq@redis-11018.c265.us-east-1-2.ec2.redns.redis-cloud.com:11018',
      socket: {
        tls: true,
        rejectUnauthorized: false
      }
    });

    redis.on('error', (err) => {
      safeConsole.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      safeConsole.log('Successfully connected to Redis');
    });

    await redis.connect();
  } catch (error) {
    safeConsole.error('Failed to initialize Redis:', error);
  }
}

// Initialize Redis on module load
initRedis();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute window
const MAX_REQUESTS = 100; // Maximum requests per window

// Allowed origins
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'https://atracaas.cisoasaservice.io'
];

// Rate limiting middleware
async function rateLimit(req) {
  if (!redis) {
    safeConsole.error('Redis client not initialized');
    return null; // Fail open if Redis is not available
  }

  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit:${ip}`;
  
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    
    if (current > MAX_REQUESTS) {
      const { body, status } = createErrorResponse('RATE_LIMITED', null, 429);
      return new NextResponse(JSON.stringify(body), { 
        status,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': RATE_LIMIT_WINDOW.toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + RATE_LIMIT_WINDOW * 1000).toString()
        }
      });
    }
    
    return null;
  } catch (error) {
    safeConsole.error('Rate limiting error:', error);
    return null; // Fail open in case of Redis errors
  }
}

// CORS middleware
function cors(req) {
  const origin = req.headers.get('origin');
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (isAllowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export async function middleware(req) {
  try {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: cors(req)
      });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get the response
    const response = NextResponse.next();

    // Add CORS and security headers
    Object.entries(cors(req)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    safeConsole.error('Middleware error:', error);
    const { body, status } = createErrorResponse('INTERNAL_ERROR', error);
    return new NextResponse(JSON.stringify(body), { status });
  }
}

// Apply middleware to all API routes
export const config = {
  matcher: '/api/:path*'
}; 