// Certificate pinning configuration for Firebase services
import { logger } from './logger';
import { securityMonitor } from './securityMonitor';

const FIREBASE_CERTIFICATES = {
  'securetoken.googleapis.com': [
    // SHA-256 fingerprints of Google's public keys
    'sha256/YZPgTZ+woNCCCIW3LH2CxQeLzB/1m42QcCTBSdgayjs=',
    'sha256/hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc='
  ],
  'firestore.googleapis.com': [
    'sha256/YZPgTZ+woNCCCIW3LH2CxQeLzB/1m42QcCTBSdgayjs=',
    'sha256/hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc='
  ],
  'www.googleapis.com': [
    'sha256/YZPgTZ+woNCCCIW3LH2CxQeLzB/1m42QcCTBSdgayjs=',
    'sha256/hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc='
  ]
};

const getHostnameFromUrl = (urlString) => {
  try {
    // Handle Request objects
    if (typeof urlString === 'object' && urlString.url) {
      urlString = urlString.url;
    }

    // Handle URL objects
    if (urlString instanceof URL) {
      return urlString.hostname;
    }

    // Handle string URLs
    if (typeof urlString === 'string') {
      // Remove any whitespace
      urlString = urlString.trim();

      // Handle relative URLs
      if (urlString.startsWith('/')) {
        return window.location.hostname;
      }

      // Handle URLs without protocol
      if (!urlString.includes('://')) {
        urlString = 'https://' + urlString;
      }

      return new URL(urlString).hostname;
    }

    return null;
  } catch (e) {
    // Log the problematic URL for debugging
    console.debug('URL parsing failed:', urlString);
    return null;
  }
};

export const validateCertificate = (hostname, cert) => {
  if (!hostname) return true; // Skip validation if hostname is not provided
  
  const validFingerprints = FIREBASE_CERTIFICATES[hostname];
  if (!validFingerprints) {
    // Allow non-Firebase domains to pass through
    return true;
  }

  const certFingerprint = cert.fingerprint256;
  const isValid = validFingerprints.includes(certFingerprint);
  
  if (!isValid) {
    securityMonitor.handleCertificateError(hostname);
  }
  
  return isValid;
};

export const setupCertificatePinning = () => {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    try {
      // Get hostname from URL
      const hostname = getHostnameFromUrl(url);
      
      // Skip certificate pinning for non-Firebase URLs or if hostname cannot be determined
      if (!hostname || !Object.keys(FIREBASE_CERTIFICATES).some(domain => hostname.includes(domain))) {
        return originalFetch(url, options);
      }

      // Apply certificate pinning for Firebase URLs
      const agent = new (require('https').Agent)({
        rejectUnauthorized: true,
        checkServerIdentity: (hostname, cert) => {
          if (!validateCertificate(hostname, cert)) {
            throw new Error(`Certificate validation failed for ${hostname}`);
          }
        }
      });

      // Create new options object to avoid modifying the original
      const patchedOptions = {
        ...options,
        agent
      };

      return originalFetch(url, patchedOptions);
    } catch (error) {
      // If it's a certificate validation error, throw it
      if (error.message.includes('Certificate validation failed')) {
        logger.error('Certificate pinning error:', error);
        throw new Error('Security error: Invalid certificate');
      }
      
      // For other errors (like URL parsing), fall back to original fetch
      return originalFetch(url, options);
    }
  };
}; 