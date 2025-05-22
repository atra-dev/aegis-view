'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { logOut } from '@/services/auth'
import { getUserStatus } from '@/services/auth'
import { logger } from '@/utils/logger'
import toast from 'react-hot-toast'

export default function PendingApproval() {
  const [isLoading, setIsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          router.push('/auth/signin')
          return
        }

        setUserEmail(user.email)
        const status = await getUserStatus(user.uid)
        
        if (status !== 'pending') {
          logger.info('User status changed:', { status, userId: user.uid })
          router.push('/dashboard')
          return
        }

        setIsLoading(false)
      } catch (error) {
        logger.error('Error checking user status:', error)
        toast.error('An error occurred while checking your status')
        router.push('/auth/signin')
      }
    }

    checkUserStatus()
  }, [router])

  const handleSignOut = async () => {
    try {
      await logOut()
      router.push('/auth/signin')
    } catch (error) {
      logger.error('Error signing out:', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Checking your status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-100">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Your account is currently under review
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md bg-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-100">
                    Status: Pending
                  </h3>
                  <div className="mt-1 text-sm text-gray-400">
                    <p>Email: {userEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-400">
            <p>We will notify you once your account has been approved.</p>
            <p className="mt-2">You can sign out and check back later.</p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSignOut}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 