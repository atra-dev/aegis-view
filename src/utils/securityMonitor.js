import { auth } from '../services/firebase';
import { createActivityLog, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from '../services/activityLog';
import { logger } from './logger';

class SecurityMonitor {
  constructor() {
    this.failedAttempts = new Map();
    this.MAX_FAILED_ATTEMPTS = 3;
    this.RESET_TIMEOUT = 300000; // 5 minutes
  }

  async logSecurityEvent(eventType, details) {
    try {
      await createActivityLog({
        title: 'Security Alert',
        description: `Security event detected: ${eventType}`,
        category: ACTIVITY_CATEGORIES.AUTH,
        action: ACTIVITY_ACTIONS.SECURITY_ALERT,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userId: auth.currentUser?.uid || 'system'
        }
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  handleCertificateError(hostname) {
    const key = `cert_${hostname}`;
    const attempts = this.failedAttempts.get(key) || 0;
    this.failedAttempts.set(key, attempts + 1);

    // Log the security event
    this.logSecurityEvent('certificate_validation_failure', {
      hostname,
      attemptCount: attempts + 1
    });

    // If max attempts exceeded, force sign out
    if (attempts + 1 >= this.MAX_FAILED_ATTEMPTS) {
      this.handleSecurityBreach('Multiple certificate validation failures detected');
      
      // Reset counter after timeout
      setTimeout(() => {
        this.failedAttempts.delete(key);
      }, this.RESET_TIMEOUT);
    }
  }

  async handleSecurityBreach(reason) {
    try {
      // Log the security breach
      await this.logSecurityEvent('security_breach', {
        reason,
        action: 'forced_logout'
      });

      // Force sign out the user
      if (auth.currentUser) {
        await auth.signOut();
      }

      // Clear any sensitive data from localStorage
      localStorage.clear();
      
      // Reload the page to clear any cached data
      window.location.reload();
    } catch (error) {
      logger.error('Error handling security breach:', error);
    }
  }
}

export const securityMonitor = new SecurityMonitor(); 