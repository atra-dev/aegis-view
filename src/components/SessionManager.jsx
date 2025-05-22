'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logOut } from '@/services/auth'
import { getUserSettings } from '@/services/settings'
import toast from 'react-hot-toast'
import { logger } from '@/utils/logger'

const IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds
const WARNING_TIME = 60 * 1000 // Show warning 1 minute before logout

export default function SessionManager() {
  const router = useRouter()
  const { user } = useAuth()

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        const settings = await getUserSettings(user.uid)
        if (settings.security?.pinCodeEnabled) {
          toast.success('Session expired. Please enter pin code to continue.')
          router.push('/auth/pin')
        } else {
          await logOut()
          router.push('/auth/signin')
        }
      }
    } catch (error) {
      logger.error('Session expiration error:', error)
    }
  }, [router, user])

  useEffect(() => {
    if (!user) return

    let logoutTimer
    let warningTimer
    let warningToast

    // Reset timers when user activity is detected
    const resetTimer = () => {
      clearTimeout(logoutTimer)
      clearTimeout(warningTimer)
      if (warningToast) {
        toast.dismiss(warningToast)
      }

      // Set warning timer
      warningTimer = setTimeout(() => {
        warningToast = toast.loading(
          'Your session will expire in 1 minute due to inactivity. Move your mouse or press any key to stay signed in.',
          { duration: WARNING_TIME }
        )
      }, IDLE_TIMEOUT - WARNING_TIME)

      // Set logout timer
      logoutTimer = setTimeout(handleLogout, IDLE_TIMEOUT)
    }

    // Events to monitor for user activity
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
      clearTimeout(logoutTimer)
      clearTimeout(warningTimer)
      if (warningToast) {
        toast.dismiss(warningToast)
      }
    }
  }, [user, handleLogout])

  return null
} 