'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpWithGoogle, verifyPhoneNumber } from '@/services/auth'
import { useRecaptcha } from '@/hooks/useRecaptcha'
import toast, { Toaster } from 'react-hot-toast'
import { CodeSignup } from '@/components/CodeSignup'
import { PhoneRegistration } from '@/components/PhoneRegistration'

export default function SignUp() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleUser, setGoogleUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [verificationCodeId, setVerificationCodeId] = useState(null)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const recaptcha = useRecaptcha('sign-up')

  useEffect(() => {
    // Check if we have Google user info from the signin attempt
    const storedUser = sessionStorage.getItem('googleUserInfo')
    if (storedUser) {
      setGoogleUser(JSON.parse(storedUser))
      // Clear the stored info
      sessionStorage.removeItem('googleUserInfo')
    }
  }, [])

  const handleGoogleSignUp = async () => {
    if (!role) {
      toast.error('Please select a role before signing up')
      return
    }

    setIsLoading(true)
    try {
      const result = await signUpWithGoogle(role)
      if (result.success) {
        if (result.isNewUser) {
          if (result.requiresApproval) {
            setCurrentUser(result.user)
            setShowPhoneInput(true)
          } else {
            toast.success('Account created successfully! Signing you in...', {
              duration: 2000,
              icon: '✅',
            })
            setTimeout(() => {
              router.push('/')
            }, 1000)
          }
        } else {
          toast.error('An account with this Google account already exists. Please sign in instead.', {
            duration: 4000,
            icon: '❌',
          })
          router.push('/auth/signin')
        }
      } else {
        if (result.error === 'account-pending-approval') {
          toast.error('Your account is pending approval. Please wait for admin approval.', {
            duration: 4000,
            icon: '⏳',
          })
          router.push('/auth/signin')
        } else {
          toast.error(result.error || 'Failed to create account. Please try again.')
        }
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (phoneNumber) => {
    setIsLoading(true)

    try {
      const verificationId = await verifyPhoneNumber(
        currentUser,
        phoneNumber,
        recaptcha
      )

      if (verificationId) {
        setVerificationCodeId(verificationId)
        setShowPhoneInput(false)
      } else {
        toast.error('Failed to send verification code. Please try again.', {
          duration: 4000,
          icon: '❗',
        })
      }
    } catch (error) {
      console.error('Phone verification error:', error)
      toast.error('Failed to verify phone number. Please try again.', {
        duration: 4000,
        icon: '⚠️',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderCard = (title, subtitle, children) => (
    <div className="max-w-md w-full space-y-8 p-8 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 relative z-10 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-gradient-xy"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)`,
          animation: 'pulse 4s ease-in-out infinite'
        }}></div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

      {/* Content */}
      <div className="relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gray-900/90 p-3 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
              <svg className="h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
            {title}
          </h2>
          <p className="mt-3 text-sm text-cyan-500/70 font-mono">
            {subtitle}
          </p>
          {googleUser && (
            <p className="text-cyan-400/70 font-mono text-sm mt-2">
              Completing registration for: {googleUser.email}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-6">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(0) translateX(10px); }
          75% { transform: translateY(10px) translateX(5px); }
        }
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-gradient-xy"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)`,
          animation: 'pulse 4s ease-in-out infinite'
        }}></div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.2
            }}
          />
        ))}
      </div>

      <Toaster position="top-right" />
      {!showPhoneInput && !verificationCodeId ? (
        renderCard(
          'Initialize_User',
          '[New Identity Registration]',
          <>
            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-cyan-400 font-mono mb-1">Select_Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full py-3 px-4 text-lg font-mono bg-gray-900/50 border-2 rounded-xl text-cyan-300 
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 
                  transition-all duration-200 transform hover:scale-[1.02] border-cyan-500/30"
                required
              >
                <option value="">Select a role</option>
                <option value="trainee">SOC Trainee</option>
                <option value="analyst">SOC Analyst</option>
                <option value="specialist">Security Specialist</option>
                <option value="coo">Chief Operating Officer</option>
                <option value="ciso">Chief Information Security Officer</option>
               
              </select>
            </div>

            {/* Google Sign Up Button */}
            <button
              onClick={handleGoogleSignUp}
              disabled={isLoading || !role}
              className="w-full py-3 px-4 text-sm font-medium rounded-xl text-cyan-300 
                bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                hover:from-cyan-500/30 hover:to-blue-500/30 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 
                font-mono border border-cyan-500/30 disabled:opacity-50 
                transition-all duration-200 disabled:cursor-not-allowed 
                transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Initializing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  <span>Sign up with Google</span>
                </div>
              )}
            </button>
          </>
        )
      ) : showPhoneInput ? (
        <PhoneRegistration getPhoneNumber={handlePhoneSubmit} />
      ) : (
        <CodeSignup 
          currentUser={currentUser} 
          verificationCodeId={verificationCodeId} 
        />
      )}
      <div id="sign-up"></div>
    </div>
  )
} 