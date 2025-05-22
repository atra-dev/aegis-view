'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, verifyUserMFA } from '@/services/auth'
import { useRecaptcha } from '@/hooks/useRecaptcha'
import toast, { Toaster } from 'react-hot-toast'
import { CodeSignIn } from '@/components/CodeSignIn'
import Link from 'next/link'
import { auth } from '@/services/firebase'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const [verificationId, setVerificationId] = useState(null)
  const [resolver, setResolver] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()
  const recaptcha = useRecaptcha('sign-in')

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push('/monitoring/alerts')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleMFA = async (response) => {
    if (response?.code === 'auth/multi-factor-auth-required' && recaptcha) {
      const mfaData = await verifyUserMFA(response, recaptcha, 0)
      if (!mfaData) {
        toast.error('Failed to initiate MFA verification.', {
          duration: 4000,
          icon: '⚠️',
        })
        setError('Failed to initiate MFA verification')
      } else {
        const { verificationId, resolver } = mfaData
        setVerificationId(verificationId)
        setResolver(resolver)
        toast.success('Verification code sent to your phone', {
          duration: 3000,
          icon: '📱',
        })
      }
    } else {
      toast.error('Something went wrong. Please try again.', {
        duration: 4000,
        icon: '❗',
      })
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signInWithGoogle()
      if (result.success) {
        toast.success('Welcome back! Signed in successfully', {
          duration: 3000,
          icon: '👋',
        })
        router.push('/monitoring/alerts')
      } else {
        if (result.error?.code === 'auth/multi-factor-auth-required') {
          await handleMFA(result.error)
        } else {
          switch (result.error) {
            case 'user-not-found':
              toast.error('Account not found. Redirecting to signup...', {
                duration: 2000,
                icon: '↗️',
              })
              setTimeout(() => {
                router.push('/auth/signup')
              }, 1000)
              break
            case 'account-pending':
              toast.error('Your account is pending approval. Please wait for admin approval.', {
                duration: 5000,
                icon: '⏳',
              })
              setTimeout(() => {
                router.push('/pending-approval')
              }, 1000)
              break
            default:
              toast.error(typeof result.error === 'string' ? result.error : 'Failed to sign in. Please try again.', {
                duration: 4000,
                icon: '❗',
              })
          }
        }
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.', {
        duration: 4000,
        icon: '📡',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderCard = (title, subtitle, children) => (
    <div className="max-w-md w-full space-y-8 p-8 bg-gray-900/80 rounded-lg border border-cyan-500/30 backdrop-blur-md shadow-2xl shadow-cyan-500/20 relative z-10">
      {/* Decorative circuit lines */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-lg"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-cyan-500/20 rounded-br-lg"></div>
      </div>

      {/* Terminal-style header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <svg className="h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </div>
        <h2 className="text-center text-3xl font-bold text-cyan-400 font-mono">{title}</h2>
        <p className="text-cyan-500/50 font-mono text-sm">{subtitle}</p>
      </div>

      <div className="mt-8 space-y-6">
        {children}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Matrix-like rain effect */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='matrix' width='50' height='50' patternUnits='userSpaceOnUse'%3E%3Ctext x='50%25' y='50%25' fill='%2300ff00' font-family='monospace'%3E01%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23matrix)'/%3E%3C/svg%3E")`,
        animation: 'matrix-rain 20s linear infinite'
      }}></div>

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-gray-900/60 to-gray-900/90 backdrop-blur-sm"></div>

      <Toaster position="top-right" />
      {!verificationId && !resolver ? (
        renderCard(
          'System Access_',
          '[Secure Authentication Required]',
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 font-mono border-cyan-500/30 disabled:opacity-50 transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </span>
              )}
            </button>

            <div className="text-center relative z-20">
              <p className="text-cyan-400/70 font-mono text-sm">
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 font-medium hover:underline cursor-pointer"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </>
        )
      ) : (
        <CodeSignIn verificationId={verificationId} resolver={resolver} />
      )}
      <div id="sign-in"></div>

      <style jsx>{`
        @keyframes matrix-rain {
          0% { background-position: 0 0; }
          100% { background-position: 0 1000px; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
} 