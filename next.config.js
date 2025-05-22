/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },

  allowedDevOrigins: [],

  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.tawk.to https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://www.gstatic.com https://firebase.googleapis.com https://*.firebaseio.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://vercel.live;
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com;
          img-src 'self' data: http: https: blob:;
          connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.virustotal.com/ https://atracaas.cisoasaservice.io/ https://api.openai.com;
          frame-src 'self' https://www.google.com https://www.youtube.com https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://www.google.com/recaptcha/ https://vercel.live;
          object-src 'none';
          base-uri 'self';
          form-action 'self';
          frame-ancestors 'none';
        `.replace(/\s{2,}/g, ' ').trim()
      }
    ];

    const maskedHeaders = [
      'X-Vercel-Id',
      'X-Nextjs-Stale-Time',
      'X-Vercel-Cache',
      'Server',
      'X-Matched-Path',
      'X-Powered-By',
      'X-Runtime',
      'X-Request-Id',
      'X-Forwarded-For',
      'X-Forwarded-Proto',
      'X-Forwarded-Host',
      'X-Real-IP',
    ].map(key => ({
      key,
      value: 'masked',
    }));

    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          ...(process.env.NODE_ENV === 'production' ? maskedHeaders : []),
        ],
      },
      {
        // Add CORS headers for Firebase authentication endpoints
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://firebase.googleapis.com;
              connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.googleusercontent.com https://firebasestorage.googleapis.com;
              img-src 'self' data: https://www.gstatic.com https://*.googleusercontent.com https://firebasestorage.googleapis.com;
              style-src 'self' 'unsafe-inline';
              font-src 'self' https://fonts.gstatic.com;
              frame-src 'self' https://*.firebaseapp.com;
              worker-src 'self' blob:;
            `.replace(/\s+/g, ' ').trim()
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ],
      },
    ];
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(mp3)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/sounds/',
          outputPath: 'static/sounds/',
          name: '[name].[ext]',
          esModule: false,
        },
      },
    });
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;