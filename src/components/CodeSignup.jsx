'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enrollUser } from '@/services/auth'
import toast from 'react-hot-toast'
import { Lock, CheckCircle, XCircle } from 'phosphor-react'
import { logger } from '@/utils/logger'

export function CodeSignup({ currentUser, verificationCodeId }) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(null)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit code', {
        duration: 3000,
        icon: '⚠️',
      })
      return
    }
    
    setIsLoading(true)
    try {
      const success = await enrollUser(currentUser, verificationCodeId, code)
      if (success) {
        setIsValid(true)
        toast.success('MFA setup complete! Redirecting...', {
          duration: 2000,
          icon: '✅',
        })
        setTimeout(() => {
          router.push('/auth/signin')
        }, 1000)
      } else {
        setIsValid(false)
        toast.error('Failed to verify code. Please try again.', {
          duration: 4000,
          icon: '❗',
        })
      }
    } catch (error) {
      logger.error('Code verification error:', error)
      setIsValid(false)
      toast.error('Failed to verify code. Please try again.', {
        duration: 4000,
        icon: '⚠️',
      })
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="max-w-md w-full space-y-8 p-8 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 relative z-10 overflow-hidden">
        {/* Content */}
        <div className="relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-900/90 p-3 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                <Lock weight='fill' className='w-8 h-8 text-cyan-400'/>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
              Verification Code_
            </h2>
            <p className="mt-3 text-sm text-cyan-500/70 font-mono">
              [Enter the code sent to your phone]
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-center space-x-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="relative">
                  <input
                    type="text"
                    maxLength={1}
                    required
                    value={code[index] || ''}
                    onChange={(e) => {
                      const newValue = e.target.value.replace(/\D/g, '');
                      if (newValue) {
                        const newCode = code.split('');
                        newCode[index] = newValue;
                        setCode(newCode.join(''));
                        if (index < 5) {
                          const nextInput = e.target.parentElement.nextElementSibling?.querySelector('input');
                          if (nextInput) nextInput.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        if (!code[index] && index > 0) {
                          const prevInput = e.target.parentElement.previousElementSibling?.querySelector('input');
                          if (prevInput) prevInput.focus();
                        } else if (code[index]) {
                          const newCode = code.split('');
                          newCode[index] = '';
                          setCode(newCode.join(''));
                        }
                      }
                    }}
                    className={`w-14 h-14 text-center text-2xl font-mono bg-gray-900/50 border-2 rounded-xl text-cyan-300 
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 
                      transition-all duration-200 transform hover:scale-105
                      ${isValid === true ? 'border-green-500/50' : 
                        isValid === false ? 'border-red-500/50' : 
                        'border-cyan-500/30'}`}
                  />
                  {isValid === true && index === 5 && (
                    <div className="absolute -right-2 -top-2">
                      <CheckCircle className="w-5 h-5 text-green-500 animate-bounce" />
                    </div>
                  )}
                  {isValid === false && index === 5 && (
                    <div className="absolute -right-2 -top-2">
                      <XCircle className="w-5 h-5 text-red-500 animate-bounce" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full py-3 px-4 text-sm font-medium rounded-xl text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 font-mono border border-cyan-500/30 disabled:opacity-50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>
          </form>
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
    </div>
  )
} 