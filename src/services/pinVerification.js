import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, firedb } from './firebase'
import { createActivityLog, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from './activityLog'
import { logger } from '@/utils/logger'

const PIN_VERIFICATION_COLLECTION = 'pinVerifications'
const MAX_PIN_ATTEMPTS = 3
const PIN_LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

export const verifyPinCode = async (pinCode) => {
  try {
    const user = auth.currentUser
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Get user's PIN code from settings
    const userSettingsRef = doc(firedb, 'userSettings', user.uid)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (!userSettingsDoc.exists()) {
      throw new Error('User settings not found')
    }

    const settings = userSettingsDoc.data()
    if (!settings.security?.pinCodeEnabled || !settings.security?.pinCode) {
      throw new Error('PIN code not enabled or not set')
    }

    // Get PIN verification document
    const pinVerificationRef = doc(firedb, PIN_VERIFICATION_COLLECTION, user.uid)
    const pinVerificationDoc = await getDoc(pinVerificationRef)

    // Check if user is locked out
    if (pinVerificationDoc.exists()) {
      const data = pinVerificationDoc.data()
      if (data.lockoutEnd && Date.now() < data.lockoutEnd) {
        const remainingTime = Math.ceil((data.lockoutEnd - Date.now()) / 60000)
        throw new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`)
      }
    }

    // Verify PIN code
    if (pinCode !== settings.security.pinCode) {
      // Increment failed attempts
      const attempts = pinVerificationDoc.exists() ? (pinVerificationDoc.data().failedAttempts || 0) + 1 : 1
      
      if (attempts >= MAX_PIN_ATTEMPTS) {
        // Set lockout
        const lockoutEnd = Date.now() + PIN_LOCKOUT_DURATION
        await setDoc(pinVerificationRef, {
          failedAttempts: attempts,
          lockoutEnd,
          lastAttempt: Date.now()
        }, { merge: true })

        // Log failed attempt
        await createActivityLog({
          title: 'PIN Code Lockout',
          description: 'User reached maximum PIN code attempts',
          category: ACTIVITY_CATEGORIES.AUTH,
          action: ACTIVITY_ACTIONS.SECURITY_ALERT,
          details: {
            userId: user.uid,
            attempts,
            lockoutEnd
          }
        })

        throw new Error(`Too many failed attempts. Please try again in 30 minutes.`)
      }

      // Update failed attempts
      await setDoc(pinVerificationRef, {
        failedAttempts: attempts,
        lastAttempt: Date.now()
      }, { merge: true })

      // Log failed attempt
      await createActivityLog({
        title: 'PIN Code Verification Failed',
        description: 'User entered incorrect PIN code',
        category: ACTIVITY_CATEGORIES.AUTH,
        action: ACTIVITY_ACTIONS.SECURITY_ALERT,
        details: {
          userId: user.uid,
          attempts
        }
      })

      throw new Error('Invalid PIN code')
    }

    // PIN code is correct, create verification record
    await setDoc(pinVerificationRef, {
      verified: true,
      verifiedAt: Date.now(),
      failedAttempts: 0,
      lockoutEnd: null
    })

    // Log successful verification
    await createActivityLog({
      title: 'PIN Code Verification Success',
      description: 'User successfully verified PIN code',
      category: ACTIVITY_CATEGORIES.AUTH,
      action: ACTIVITY_ACTIONS.SECURITY_ALERT,
      details: {
        userId: user.uid
      }
    })

    return { success: true }
  } catch (error) {
    logger.error('PIN verification error:', error)
    throw error
  }
}

export const checkPinVerification = async () => {
  try {
    const user = auth.currentUser
    if (!user) return false

    const pinVerificationRef = doc(firedb, PIN_VERIFICATION_COLLECTION, user.uid)
    const pinVerificationDoc = await getDoc(pinVerificationRef)

    if (!pinVerificationDoc.exists()) return false

    const data = pinVerificationDoc.data()
    if (!data.verified) return false

    // Check if verification is still valid (within 15 minutes)
    const verificationAge = Date.now() - data.verifiedAt
    const VERIFICATION_TIMEOUT = 15 * 60 * 1000 // 15 minutes

    if (verificationAge > VERIFICATION_TIMEOUT) {
      // Clear verification if expired
      await deleteDoc(pinVerificationRef)
      return false
    }

    return true
  } catch (error) {
    logger.error('PIN verification check error:', error)
    return false
  }
}

export const clearPinVerification = async () => {
  try {
    const user = auth.currentUser
    if (!user) return

    const pinVerificationRef = doc(firedb, PIN_VERIFICATION_COLLECTION, user.uid)
    await deleteDoc(pinVerificationRef)
  } catch (error) {
    logger.error('Error clearing PIN verification:', error)
  }
} 