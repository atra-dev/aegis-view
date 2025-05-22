import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firedb } from './firebase'
import { updateProfile } from 'firebase/auth'
import { auth } from './firebase'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { logger } from '@/utils/logger'

const defaultSettings = {
  appearance: {
    theme: 'dark',
    fontSize: 14
  },
  notifications: {
    email: {
      highPriorityAlerts: true,
      systemUpdates: true,
      securityIncidents: true,
      dailyReports: true
    },
    inApp: {
      desktopNotifications: true,
      soundAlerts: true,
      browserNotifications: true
    }
  },
  security: {
    pinCode: null,
    pinCodeEnabled: false
  }
}

export const getUserSettings = async (userId) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (userSettingsDoc.exists()) {
      return userSettingsDoc.data()
    }
    
    // Create document with default settings if it doesn't exist
    await setDoc(userSettingsRef, defaultSettings)
    return defaultSettings
  } catch (error) {
    logger.error('Error fetching user settings:', error)
    throw error
  }
}

export const updateUserSettings = async (userId, settings) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    await setDoc(userSettingsRef, settings, { merge: true })
  } catch (error) {
    logger.error('Error updating user settings:', error)
    throw error
  }
}

export const updateAppearanceSettings = async (userId, appearanceSettings) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (!userSettingsDoc.exists()) {
      // If document doesn't exist, create it with default settings
      await setDoc(userSettingsRef, {
        ...defaultSettings,
        appearance: appearanceSettings
      })
    } else {
      // Update existing document
      await updateDoc(userSettingsRef, {
        appearance: appearanceSettings
      })
    }
  } catch (error) {
    logger.error('Error updating appearance settings:', error)
    throw error
  }
}

export const updateNotificationSettings = async (userId, notificationSettings) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (!userSettingsDoc.exists()) {
      // If document doesn't exist, create it with default settings
      await setDoc(userSettingsRef, {
        ...defaultSettings,
        notifications: notificationSettings
      })
    } else {
      // Update existing document
      await updateDoc(userSettingsRef, {
        notifications: notificationSettings
      })
    }
  } catch (error) {
    logger.error('Error updating notification settings:', error)
    throw error
  }
}

export const updateSecuritySettings = async (userId, securitySettings) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (!userSettingsDoc.exists()) {
      // If document doesn't exist, create it with default settings
      await setDoc(userSettingsRef, {
        ...defaultSettings,
        security: securitySettings
      })
    } else {
      // Update existing document
      await updateDoc(userSettingsRef, {
        security: securitySettings
      })
    }
  } catch (error) {
    logger.error('Error updating security settings:', error)
    throw error
  }
}

export const getUserPinCode = async (userId) => {
  try {
    const userSettingsRef = doc(firedb, 'userSettings', userId)
    const userSettingsDoc = await getDoc(userSettingsRef)
    
    if (userSettingsDoc.exists()) {
      const settings = userSettingsDoc.data()
      return settings.security?.pinCode || null
    }
    
    return null
  } catch (error) {
    logger.error('Error fetching user pin code:', error)
    throw error
  }
}

export const getUserMFAStatus = async (userId) => {
  try {
    const userDoc = await getDoc(doc(firedb, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data().mfaEnabled || false
    }
    return false
  } catch (error) {
    logger.error('Error fetching MFA status:', error)
    throw error
  }
}

export const updateDisplayName = async (userId, displayName) => {
  try {
    // Update Firebase Authentication profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: displayName
      })
    }

    // Update display name in users collection
    const userRef = doc(firedb, 'users', userId)
    await updateDoc(userRef, {
      displayName: displayName
    })

    return { success: true }
  } catch (error) {
    logger.error('Error updating display name:', error)
    throw error
  }
}

export const updateUserPhoto = async (userId, photoFile) => {
  try {
    const storage = getStorage()
    const storageRef = ref(storage, `user-photos/${userId}`)
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, photoFile)
    const photoURL = await getDownloadURL(snapshot.ref)

    // Update Firebase Authentication profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        photoURL: photoURL
      })
    }

    // Update photo URL in users collection
    const userRef = doc(firedb, 'users', userId)
    await updateDoc(userRef, {
      photoURL: photoURL
    })

    return { success: true, photoURL }
  } catch (error) {
    logger.error('Error updating user photo:', error)
    throw error
  }
} 