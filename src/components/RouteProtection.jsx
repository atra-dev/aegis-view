'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/services/firebase'
import { checkPinVerification } from '@/services/pinVerification'
import { getUserSettings } from '@/services/settings'
import { getUserStatus } from '@/services/auth'
import { logger } from '@/utils/logger'

const PUBLIC_ROUTES = ['/auth/signin', '/auth/signup', '/auth/pin', '/']
const PENDING_APPROVAL_ROUTE = '/pending-approval'

export default function RouteProtection({ children }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userStatus, setUserStatus] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          if (!PUBLIC_ROUTES.includes(pathname)) {
            router.push('/auth/signin')
          }
          setIsLoading(false)
          return
        }

        // Check user status from Firestore
        const status = await getUserStatus(user.uid)
        logger.info('User status:', { status, userId: user.uid })
        setUserStatus(status)

        if (!status) {
          logger.error('No status found for user:', user.uid)
          router.push('/auth/signin')
          setIsLoading(false)
          return
        }

        // If user is pending, redirect to pending approval page
        if (status === 'pending') {
          if (pathname !== PENDING_APPROVAL_ROUTE) {
            router.push(PENDING_APPROVAL_ROUTE)
            return
          }
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // If user is not approved, redirect to sign in
        if (status !== 'approved') {
          logger.error('User not approved:', { status, userId: user.uid })
          router.push('/auth/signin')
          setIsLoading(false)
          return
        }

        // If it's a public route, no need for further checks
        if (PUBLIC_ROUTES.includes(pathname)) {
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // Check if user has PIN code enabled
        const settings = await getUserSettings(user.uid)
        if (!settings.security?.pinCodeEnabled) {
          // If PIN is not enabled, user can access all routes
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }

        // If PIN is enabled, verify it
        const isVerified = await checkPinVerification()
        if (!isVerified) {
          router.push('/auth/pin')
          return
        }

        // User is verified
        setIsAuthenticated(true)
        setIsLoading(false)
      } catch (error) {
        logger.error('Route protection error:', error)
        router.push('/auth/signin')
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show content if:
  // 1. User is authenticated OR
  // 2. It's a public route OR
  // 3. User is pending and on pending approval page
  if (isAuthenticated || 
      PUBLIC_ROUTES.includes(pathname) || 
      (userStatus === 'pending' && pathname === PENDING_APPROVAL_ROUTE)) {
    return children
  }

  // Don't show anything while redirecting or if not authenticated
  return null
} 