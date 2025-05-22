'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { getUserSettings } from '@/services/settings'
import { checkPinVerification, clearPinVerification } from '@/services/pinVerification'
import { toast } from 'react-hot-toast'
import { logger } from '@/utils/logger'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'lastActivity'
const PIN_VERIFIED_KEY = 'pinVerified'

export default function PinVerificationMiddleware() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkPinVerificationStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        // Get user settings to check if pin code is enabled
        const settings = await getUserSettings(user.uid)
        if (!settings.security?.pinCodeEnabled) return

        // Check if pin was verified in Firebase
        const isVerified = await checkPinVerification()
        
        // Check if we need to verify pin due to inactivity
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
        const pinVerified = localStorage.getItem(PIN_VERIFIED_KEY)
        const now = Date.now()
        const timeSinceLastActivity = lastActivity ? now - parseInt(lastActivity) : INACTIVITY_TIMEOUT + 1
        
        // Require pin verification if:
        // 1. No pin verification exists in Firebase
        // 2. Last activity was more than 15 minutes ago AND pin was not verified
        // 3. User is trying to access a protected route
        const isProtectedRoute = !['/auth/signin', '/auth/signup', '/auth/pin'].includes(window.location.pathname)
        
        if (isProtectedRoute && (!isVerified || (!pinVerified && timeSinceLastActivity > INACTIVITY_TIMEOUT))) {
          // Clear any existing verification before redirecting
          await clearPinVerification()
          router.push('/auth/pin')
        }
      } catch (error) {
        logger.error('Pin verification check error:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkPinVerificationStatus()
  }, [router])

  // Update last activity timestamp on user interaction
  useEffect(() => {
    const updateLastActivity = () => {
      if (!isChecking) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
      }
    }

    // Add event listeners for user activity
    window.addEventListener('mousemove', updateLastActivity)
    window.addEventListener('keydown', updateLastActivity)
    window.addEventListener('click', updateLastActivity)
    window.addEventListener('scroll', updateLastActivity)

    // Initial activity update
    updateLastActivity()

    return () => {
      window.removeEventListener('mousemove', updateLastActivity)
      window.removeEventListener('keydown', updateLastActivity)
      window.removeEventListener('click', updateLastActivity)
      window.removeEventListener('scroll', updateLastActivity)
    }
  }, [isChecking])

  return null
} 