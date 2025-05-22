import { auth } from '@/services/firebase';
import { logger } from './logger';

// Use sessionStorage for temporary auth state
const AUTH_STATE_KEY = 'auth_state';
const CLEANUP_DELAY = 60000; // 1 minute

class AuthStateManager {
  constructor() {
    this.pendingCleanup = null;
  }

  generateState() {
    const state = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    this.setState(state);
    return state;
  }

  setState(state) {
    try {
      sessionStorage.setItem(AUTH_STATE_KEY, state);
      // Schedule cleanup
      this.scheduleCleaning();
    } catch (error) {
      logger.error('Failed to save auth state:', error);
    }
  }

  getState() {
    return sessionStorage.getItem(AUTH_STATE_KEY);
  }

  verifyState(receivedState) {
    const savedState = this.getState();
    if (!savedState || !receivedState) return false;
    
    // Clear state immediately after verification
    this.clearState();
    
    return savedState === receivedState;
  }

  clearState() {
    try {
      sessionStorage.removeItem(AUTH_STATE_KEY);
      if (this.pendingCleanup) {
        clearTimeout(this.pendingCleanup);
        this.pendingCleanup = null;
      }
    } catch (error) {
      logger.error('Failed to clear auth state:', error);
    }
  }

  scheduleCleaning() {
    if (this.pendingCleanup) {
      clearTimeout(this.pendingCleanup);
    }
    
    this.pendingCleanup = setTimeout(() => {
      this.clearState();
    }, CLEANUP_DELAY);
  }

  // Clean URL from OAuth parameters
  cleanUrl() {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    let changed = false;

    // List of parameters to remove
    const paramsToRemove = ['code', 'state', 'access_token', 'id_token'];

    paramsToRemove.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });

    if (changed) {
      // Replace URL without OAuth parameters
      window.history.replaceState({}, document.title, url.toString());
    }
  }
}

export const authStateManager = new AuthStateManager(); 