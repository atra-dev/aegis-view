'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { verifyPinCode } from '@/services/pinVerification'
import { createActivityLog, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from '@/services/activityLog'
import toast from 'react-hot-toast'
import { Eye, EyeSlash, Lock } from 'phosphor-react'
import { logger } from '@/utils/logger'

const PIN_VERIFIED_KEY = 'pinVerified'

export default function PinCodeVerification() {
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [isValid, setIsValid] = useState(null)
  const inputRefs = useRef([])
  const router = useRouter()

  useEffect(() => {
    // Clear any existing verification when component mounts
    localStorage.removeItem('lastActivity')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const pinString = pin.join('')
    if (pinString.length !== 6) {
      toast.error('Please enter a valid 6-digit pin code')
      return
    }

    setIsLoading(true)
    try {
      await verifyPinCode(pinString)
      setIsValid(true)
      
      // Set PIN verification flag
      localStorage.setItem(PIN_VERIFIED_KEY, 'true')
      
      // Log successful PIN verification
      await createActivityLog({
        title: 'PIN Code Verification',
        description: 'User successfully verified PIN code',
        category: ACTIVITY_CATEGORIES.AUTH,
        action: ACTIVITY_ACTIONS.LOGIN,
        details: {
          method: 'pin_code',
          status: 'success'
        }
      })
      
      // Update last activity timestamp
      localStorage.setItem('lastActivity', Date.now().toString())
      
      // Redirect back to dashboard
      setTimeout(() => {
        router.push('/monitoring/alerts')
      }, 1000)
    } catch (error) {
      logger.error('Pin verification error:', error)
      setIsValid(false)
      
      // Log failed PIN verification
      await createActivityLog({
        title: 'PIN Code Verification Failed',
        description: 'User entered incorrect PIN code',
        category: ACTIVITY_CATEGORIES.AUTH,
        action: ACTIVITY_ACTIONS.SECURITY_ALERT,
        details: {
          method: 'pin_code',
          status: 'failed',
          error: error.message
        }
      })
      
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (value, index) => {
    if (value.length > 1) return // Prevent pasting multiple digits
    
    const newPin = [...pin]
    newPin[index] = value.replace(/\D/g, '') // Only allow numbers
    setPin(newPin)
    
    // Move to next input if a digit was entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus()
    }
  }

  const toggleShowPin = () => {
    setShowPin(!showPin)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gray-900/90 p-3 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
              <Lock weight='fill' className='w-8 h-8 text-cyan-400'/>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono mb-2">
            Enter PIN Code
          </h2>
          <p className="text-gray-400">
            Please enter your 6-digit PIN code to resume your session
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center space-x-3">
            {pin.map((digit, index) => (
              <div key={index} className="relative">
                <input
                  ref={el => inputRefs.current[index] = el}
                  type={showPin ? "text" : "password"}
                  value={digit}
                  onChange={(e) => handlePinChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`w-14 h-14 text-center text-2xl font-mono bg-gray-900/50 border-2 rounded-xl text-cyan-300 
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 
                    transition-all duration-200 transform hover:scale-105
                    ${isValid === true ? 'border-green-500/50' : 
                      isValid === false ? 'border-red-500/50' : 
                      'border-cyan-500/30'}`}
                  maxLength={1}
                  disabled={isLoading}
                />
                {isValid === true && index === 5 && (
                  <div className="absolute -right-2 -top-2">
                    <div className="w-5 h-5 text-green-500 animate-bounce">
                      ✓
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleShowPin}
              className="text-gray-400 hover:text-gray-300 transition-colors duration-200 flex items-center gap-2"
            >
              {showPin ? (
                <>
                  <EyeSlash size={20} />
                  <span>Hide PIN</span>
                </>
              ) : (
                <>
                  <Eye size={20} />
                  <span>Show PIN</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl 
                hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 
                disabled:opacity-50 transition-all duration-200 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify PIN'
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push('/auth/signin')}
              className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors duration-200"
            >
              Sign in instead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 