import {
    onSnapshot,
    setDoc,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    where,
    serverTimestamp,
    writeBatch,
    orderBy,
    addDoc
} from 'firebase/firestore'
import { firedb } from './firebase'
import { auth } from './firebase'
import { createActivityLog, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from './activityLog'
import { logger } from '@/utils/logger'

// Modified store API key function to use toast for error handling
export const storeApiKey = async (apiKey, userId, userEmail) => {
    try {
        const apiKeyDoc = doc(firedb, 'apiKeys', apiKey)
        const docSnap = await getDoc(apiKeyDoc)
        
        if (docSnap.exists()) {
            const existingData = docSnap.data()
            if (existingData.userId !== userId) {
                return {
                    success: false,
                    error: 'This API key is already registered to another user'
                }
            }
            return { success: true }
        }

        // Get current date in PH time
        const today = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).split(",")[0];

        // If key doesn't exist, create new entry
        await setDoc(apiKeyDoc, {
            key: apiKey,
            userId: userId,
            userEmail: userEmail,
            dailyUsage: 0,
            lastReset: today,
            createdAt: serverTimestamp(),
            owner: userEmail
        })
        
        return { success: true }
    } catch (error) {
        logger.error('Error storing API key:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

// Modified get user API keys function to be more strict
export const getUserApiKeys = async (userId, userEmail) => {
    try {
        const apiKeysRef = collection(firedb, 'apiKeys')
        // Query only by userId for primary ownership
        const q = query(
            apiKeysRef, 
            where('userId', '==', userId)
        )
        const querySnapshot = await getDocs(q)
        
        const keys = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            keys.push({ 
                id: doc.id, 
                ...data,
                lastReset: data.lastReset,
                isExpired: data.dailyUsage >= 450,
                isOwner: data.userEmail === userEmail
            })
        })
        
        return keys
    } catch (error) {
        logger.error('Error getting user API keys:', error)
        return []
    }
}

// Delete API key
export const deleteApiKey = async (apiKey) => {
    try {
        await deleteDoc(doc(firedb, 'apiKeys', apiKey))
        return true
    } catch (error) {
        logger.error('Error deleting API key:', error)
        return false
    }
}

// Get API key usage
export const getApiKeyUsage = async (apiKey) => {
    try {
        const apiKeyDoc = doc(firedb, 'apiKeys', apiKey)
        const docSnap = await getDoc(apiKeyDoc)
        
        if (docSnap.exists()) {
            const data = docSnap.data()
            const today = new Date().toISOString().split('T')[0]
            
            // Reset counter if it's a new day
            if (data.lastReset !== today) {
                await updateDoc(apiKeyDoc, {
                    dailyUsage: 0,
                    lastReset: today
                })
                return 0
            }
            
            return data.dailyUsage
        }
        return 0
    } catch (error) {
        logger.error('Error getting API key usage:', error)
        return 0
    }
}

// Increment API key usage
export const incrementApiKeyUsage = async (apiKey) => {
    try {
        const apiKeyDoc = doc(firedb, 'apiKeys', apiKey)
        const docSnap = await getDoc(apiKeyDoc)
        
        if (docSnap.exists()) {
            const data = docSnap.data()
            const today = new Date().toISOString().split('T')[0]
            
            // Reset counter if it's a new day
            if (data.lastReset !== today) {
                await updateDoc(apiKeyDoc, {
                    dailyUsage: 1,
                    lastReset: today
                })
                return 1
            } else {
                const newUsage = data.dailyUsage + 1
                await updateDoc(apiKeyDoc, {
                    dailyUsage: newUsage
                })
                return newUsage
            }
        }
        return false
    } catch (error) {
        logger.error('Error incrementing API key usage:', error)
        return false
    }
}

// Listen for real-time API key usage updates
export const listenToApiKeyUsage = (apiKey, callback) => {
    try {
        const apiKeyDoc = doc(firedb, 'apiKeys', apiKey)
        return onSnapshot(apiKeyDoc, (doc) => {
            if (doc.exists()) {
                const data = doc.data()
                callback(data.dailyUsage)
            }
        })
    } catch (error) {
        logger.error('Error setting up API key usage listener:', error)
        return () => {}
    }
}

// Add function to get API key details
export const getApiKeyDetails = async (apiKey) => {
    try {
        const apiKeyDoc = doc(firedb, 'apiKeys', apiKey)
        const docSnap = await getDoc(apiKeyDoc)
        
        if (docSnap.exists()) {
            const data = docSnap.data()
            return {
                ...data,
                lastReset: data.lastReset,
                isExpired: data.dailyUsage >= 450
            }
        }
        return null
    } catch (error) {
        logger.error('Error getting API key details:', error)
        return null
    }
}

export const resetApiKeyUsage = async (apiKey) => {
    try {
        const apiKeyRef = doc(firedb, 'apiKeys', apiKey)
        await updateDoc(apiKeyRef, {
            dailyUsage: 0,
            lastReset: serverTimestamp()
        })
    } catch (error) {
        logger.error('Error resetting API key usage:', error)
        throw error
    }
}

// Alert Management Functions
export const saveAlert = async (alertData) => {
    try {
        const alertsRef = collection(firedb, 'alerts')
        const newAlertRef = doc(alertsRef)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const detectedBy = currentUser ? currentUser.email : 'system'
        
        // Convert timestamp to Philippine timezone
        const timestamp = new Date(alertData.timestamp)
        // Add 8 hours to convert to Philippine time
        const phTime = new Date(timestamp.getTime() + (8 * 60 * 60 * 1000))
        
        // Ensure all fields are included in the document
        await setDoc(newAlertRef, {
            ...alertData,
            alertName: alertData.alertName || '',
            tenant: alertData.tenant || '',
            killChainStage: alertData.killChainStage || '',
            technique: alertData.technique || '',
            category: alertData.category || '',
            status: 'Closed',
            verificationStatus: alertData.verificationStatus || 'To Be Confirmed',
            remarks: alertData.remarks || '',
            description: alertData.description || '',
            link: alertData.link || '',
            host: alertData.host || '',
            hostname: alertData.hostname || '',
            sourceIp: alertData.sourceIp || '',
            sourceType: alertData.sourceType || '',
            sourceGeo: {
                country: alertData.sourceGeo?.country || '',
                city: alertData.sourceGeo?.city || ''
            },
            destinationIp: alertData.destinationIp || '',
            destinationType: alertData.destinationType || '',
            destinationGeo: {
                country: alertData.destinationGeo?.country || '',
                city: alertData.destinationGeo?.city || ''
            },
            timestamp: phTime,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            detectedBy: detectedBy
        })
        
        return { success: true, id: newAlertRef.id }
    } catch (error) {
        logger.error('Error saving alert:', error)
        return { success: false, error: 'Failed to save alert' }
    }
}

export const getAlerts = async (filters = {}) => {
    try {
        const alertsRef = collection(firedb, 'alerts')
        let q = query(alertsRef)
        
        // Apply filters if provided
        if (filters.date) {
            const startOfDay = new Date(filters.date)
            startOfDay.setHours(0, 0, 0, 0)
            // Add 8 hours to convert to Philippine time
            const phStartOfDay = new Date(startOfDay.getTime() + (8 * 60 * 60 * 1000))
            
            const endOfDay = new Date(filters.date)
            endOfDay.setHours(23, 59, 59, 999)
            // Add 8 hours to convert to Philippine time
            const phEndOfDay = new Date(endOfDay.getTime() + (8 * 60 * 60 * 1000))
            
            q = query(
                alertsRef,
                where('timestamp', '>=', phStartOfDay),
                where('timestamp', '<=', phEndOfDay)
            )
        }
        
        if (filters.status && filters.status !== 'all') {
            q = query(q, where('status', '==', filters.status))
        }
        
        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        if (filters.killChainStage && filters.killChainStage !== 'all') {
            q = query(q, where('killChainStage', '==', filters.killChainStage))
        }
        
        const querySnapshot = await getDocs(q)
        const alerts = []
        
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            // Convert timestamp to Philippine time
            const timestamp = data.timestamp?.toDate()
            const phTimestamp = timestamp ? new Date(timestamp.getTime() + (8 * 60 * 60 * 1000)) : null
            
            alerts.push({
                id: doc.id,
                ...data,
                timestamp: phTimestamp?.toISOString()
            })
        })
        
        return alerts
    } catch (error) {
        logger.error('Error getting alerts:', error)
        return []
    }
}

export const updateAlert = async (alertId, updateData) => {
    try {
        const alertRef = doc(firedb, 'alerts', alertId)
        const alertDoc = await getDoc(alertRef)
        
        if (!alertDoc.exists()) {
            return { success: false, error: 'Alert not found' }
        }

        const currentUser = auth.currentUser
        const updatedBy = currentUser ? currentUser.email : 'system'
        const oldData = alertDoc.data()
        
        await updateDoc(alertRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
            updatedBy: updatedBy
        })

        return { success: true }
    } catch (error) {
        logger.error('Error updating alert:', error)
        return { success: false, error: 'Failed to update alert' }
    }
}

export const deleteAlert = async (alertId) => {
    try {
        const alertRef = doc(firedb, 'alerts', alertId)
        const alertDoc = await getDoc(alertRef)
        
        if (!alertDoc.exists()) {
            return { success: false, error: 'Alert not found' }
        }
        
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        const alertData = alertDoc.data()
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...alertData,
            id: alertId,
            collection: 'alerts',
            type: 'alert'
        })
        
        if (moveResult.success) {
            await deleteDoc(alertRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error('Error deleting alert:', error)
        return { success: false, error: 'Failed to delete alert' }
    }
}

// Real-time alerts listener
export const listenToAlerts = (filters = {}, callback) => {
    try {
        const alertsRef = collection(firedb, 'alerts')
        let q = query(alertsRef)
        
        // Apply filters
        if (filters.date && filters.date !== 'all') {
            if (filters.viewType === 'monthly') {
                // For monthly view, get start and end of month
                const [year, month] = filters.date.split('-')
                const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
                startOfMonth.setHours(0, 0, 0, 0)
                const endOfMonth = new Date(parseInt(year), parseInt(month), 0)
                endOfMonth.setHours(23, 59, 59, 999)
                
                const timezoneOffset = startOfMonth.getTimezoneOffset() * 60000
                const localStartOfMonth = new Date(startOfMonth.getTime() - timezoneOffset)
                const localEndOfMonth = new Date(endOfMonth.getTime() - timezoneOffset)
                
                q = query(
                    q,
                    where('timestamp', '>=', localStartOfMonth),
                    where('timestamp', '<=', localEndOfMonth)
                )
            } else {
                // For daily view (existing code)
                const startOfDay = new Date(filters.date)
                startOfDay.setHours(0, 0, 0, 0)
                const timezoneOffset = startOfDay.getTimezoneOffset() * 60000
                const localStartOfDay = new Date(startOfDay.getTime() - timezoneOffset)
                
                const endOfDay = new Date(filters.date)
                endOfDay.setHours(23, 59, 59, 999)
                const localEndOfDay = new Date(endOfDay.getTime() - timezoneOffset)
                
                q = query(
                    q,
                    where('timestamp', '>=', localStartOfDay),
                    where('timestamp', '<=', localEndOfDay)
                )
            }
        }
        
        if (filters.status && filters.status !== 'all') {
            q = query(q, where('status', '==', filters.status))
        }

        if (filters.verificationStatus && filters.verificationStatus !== 'all') {
            q = query(q, where('verificationStatus', '==', filters.verificationStatus))
        }
        
        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        if (filters.killChainStage && filters.killChainStage !== 'all') {
            q = query(q, where('killChainStage', '==', filters.killChainStage))
        }
        
        return onSnapshot(q, (snapshot) => {
            const alerts = []
            snapshot.forEach((doc) => {
                const data = doc.data()
                const timestamp = data.timestamp?.toDate?.()
                const localTimestamp = timestamp ? new Date(timestamp.getTime() + (timestamp.getTimezoneOffset() * 60000)) : null
                
                // Format fields
                const formattedHost = typeof data.host === 'object' ? 
                    data.host.ip || data.hostip_host || '' 
                    : data.host || ''
                
                const formattedHostname = typeof data.hostname === 'object' ?
                    data.hostname.name || ''
                    : data.hostname || data.engid_name || ''

                // Format source fields
                const formattedSourceIp = data.srcip || data.sourceIp || ''
                const formattedSourceType = data.srcip_type || data.sourceType || ''
                const formattedSourceGeo = {
                    country: data.srcip_geo?.countryCode || data.srcip_geo?.countryName || data.sourceGeo?.country || '',
                    city: data.srcip_geo?.city || data.sourceGeo?.city || ''
                }

                // Format destination fields
                const formattedDestinationIp = data.dstip || data.destinationIp || ''
                const formattedDestinationType = data.dstip_type || data.destinationType || ''
                const formattedDestinationGeo = {
                    country: data.dstip_geo?.countryCode || data.dstip_geo?.countryName || data.destinationGeo?.country || '',
                    city: data.dstip_geo?.city || data.destinationGeo?.city || ''
                }
                
                alerts.push({
                    id: doc.id,
                    ...data,
                    host: formattedHost,
                    hostname: formattedHostname,
                    sourceIp: formattedSourceIp,
                    sourceType: formattedSourceType,
                    sourceGeo: formattedSourceGeo,
                    destinationIp: formattedDestinationIp,
                    destinationType: formattedDestinationType,
                    destinationGeo: formattedDestinationGeo,
                    verificationStatus: data.verificationStatus || 'To Be Confirmed',
                    remarks: data.remarks || '',
                    timestamp: localTimestamp?.toISOString() || data.timestamp
                })
            })
            callback(alerts)
        })
    } catch (error) {
        logger.error('Error setting up alerts listener:', error)
        return () => {}
    }
}

// Blocked IP and Domain Management Functions
export const saveBlockedEntry = async (entryData) => {
    try {
        const blockedRef = collection(firedb, 'blockedEntries')
        const newEntryRef = doc(blockedRef)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        await setDoc(newEntryRef, {
            ...entryData,
            addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        
        return { success: true, id: newEntryRef.id }
    } catch (error) {
        logger.error('Error saving blocked entry:', error)
        return { success: false, error: 'Failed to save blocked entry' }
    }
}

export const getBlockedEntries = async (filters = {}) => {
    try {
        const blockedRef = collection(firedb, 'blockedEntries')
        let q = query(blockedRef)
        
        // Apply filters if provided
        if (filters.type && filters.type !== 'ALL') {
            q = query(q, where('type', '==', filters.type))
        }
        
        if (filters.status && filters.status !== 'ALL') {
            q = query(q, where('blocked', '==', filters.status === 'BLOCKED'))
        }
        
        if (filters.tenant && filters.tenant !== 'ALL') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        const querySnapshot = await getDocs(q)
        const entries = []
        
        querySnapshot.forEach((doc) => {
            entries.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString()
            })
        })
        
        return entries
    } catch (error) {
        logger.error('Error getting blocked entries:', error)
        return []
    }
}

export const updateBlockedEntry = async (entryId, updateData) => {
    try {
        const entryRef = doc(firedb, 'blockedEntries', entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
            return { success: false, error: 'Entry not found' }
        }

        const currentUser = auth.currentUser
        const updatedBy = currentUser ? currentUser.email : 'system'
        const oldData = entryDoc.data()
        
        await updateDoc(entryRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
            updatedBy: updatedBy
        })

        return { success: true }
    } catch (error) {
        logger.error('Error updating blocked entry:', error)
        return { success: false, error: 'Failed to update blocked entry' }
    }
}

export const deleteBlockedEntry = async (entryId) => {
    try {
        const entryRef = doc(firedb, 'blockedEntries', entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
            return { success: false, error: 'Entry not found' }
        }
        
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        const entryData = entryDoc.data()
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...entryData,
            id: entryId,
            collection: 'blockedEntries',
            type: 'blocked'
        })
        
        if (moveResult.success) {
            await deleteDoc(entryRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error('Error deleting blocked entry:', error)
        return { success: false, error: 'Failed to delete blocked entry' }
    }
}

// Real-time blocked entries listener
export const listenToBlockedEntries = (filters = {}, onSuccess, onError) => {
    try {
        const blockedRef = collection(firedb, 'blockedEntries')
        let q = query(blockedRef)
        
        // Apply filters
        if (filters.type && filters.type !== 'ALL') {
            q = query(q, where('type', '==', filters.type))
        }
        
        if (filters.status && filters.status !== 'ALL') {
            q = query(q, where('blocked', '==', filters.status === 'BLOCKED'))
        }
        
        if (filters.tenant && filters.tenant !== 'ALL') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        return onSnapshot(q, 
            (snapshot) => {
                try {
                    const entries = []
                    snapshot.forEach((doc) => {
                        const data = doc.data()
                        entries.push({
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate().toISOString(),
                            updatedAt: data.updatedAt?.toDate().toISOString()
                        })
                    })
                    onSuccess(entries)
                } catch (error) {
                    logger.error('Error processing snapshot:', error)
                    if (onError) onError(error)
                }
            },
            (error) => {
                logger.error('Snapshot listener error:', error)
                if (onError) onError(error)
                return () => {}
            }
        )
    } catch (error) {
        logger.error('Error setting up blocked entries listener:', error)
        if (onError) onError(error)
        return () => {}
    }
}

// ATIP Consolidated Management Functions
export const saveATIPEntry = async (entryData) => {
    try {
        const atipRef = collection(firedb, 'atipEntries')
        const newEntryRef = doc(atipRef)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        await setDoc(newEntryRef, {
            ...entryData,
            tenant: entryData.tenant,
            addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        
        return { success: true, id: newEntryRef.id }
    } catch (error) {
        logger.error('Error saving ATIP entry:', error)
        return { success: false, error: 'Failed to save ATIP entry' }
    }
}

export const getATIPEntries = async (filters = {}) => {
    try {
        const atipRef = collection(firedb, 'atipEntries')
        let q = query(atipRef)
        
        // Apply filters
        if (filters.date) {
            const startOfDay = new Date(filters.date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(filters.date)
            endOfDay.setHours(23, 59, 59, 999)
            
            q = query(
                q,
                where('date', '>=', startOfDay.toISOString()),
                where('date', '<=', endOfDay.toISOString())
            )
        }

        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }

        if (filters.dateRange) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            switch (filters.dateRange) {
                case 'today':
                    q = query(q, where('date', '>=', today.toISOString()))
                    break
                case 'week':
                    const weekAgo = new Date(today)
                    weekAgo.setDate(today.getDate() - 7)
                    q = query(q, where('date', '>=', weekAgo.toISOString()))
                    break
                case 'month':
                    const monthAgo = new Date(today)
                    monthAgo.setMonth(today.getMonth() - 1)
                    q = query(q, where('date', '>=', monthAgo.toISOString()))
                    break
            }
        }
        
        const querySnapshot = await getDocs(q)
        const entries = []
        
        querySnapshot.forEach((doc) => {
            entries.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString()
            })
        })
        
        return entries
    } catch (error) {
        logger.error('Error getting ATIP entries:', error)
        return []
    }
}

export const updateATIPEntry = async (entryId, updateData) => {
    try {
        const entryRef = doc(firedb, 'atipEntries', entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
            return { success: false, error: 'Entry not found' }
        }

        const currentUser = auth.currentUser
        const updatedBy = currentUser ? currentUser.email : 'system'
        const oldData = entryDoc.data()
        
        await updateDoc(entryRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
            updatedBy: updatedBy
        })

        return { success: true }
    } catch (error) {
        logger.error('Error updating ATIP entry:', error)
        return { success: false, error: 'Failed to update ATIP entry' }
    }
}

export const deleteATIPEntry = async (entryId) => {
    try {
        const entryRef = doc(firedb, 'atipEntries', entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
            return { success: false, error: 'Entry not found' }
        }
        
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        const entryData = entryDoc.data()
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...entryData,
            id: entryId,
            collection: 'atipEntries',
            type: 'atip'
        })
        
        if (moveResult.success) {
            await deleteDoc(entryRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error('Error deleting ATIP entry:', error)
        return { success: false, error: 'Failed to delete ATIP entry' }
    }
}

export const batchImportATIPEntries = async (entries) => {
    try {
        const atipRef = collection(firedb, 'atipEntries')
        const batch = writeBatch(firedb)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        entries.forEach((entry) => {
            const newEntryRef = doc(atipRef)
            batch.set(newEntryRef, {
                ...entry,
                addedBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
        })
        
        await batch.commit()
        return { success: true, count: entries.length }
    } catch (error) {
        logger.error('Error batch importing ATIP entries:', error)
        return { success: false, error: 'Failed to import entries' }
    }
}

// Real-time ATIP entries listener
export const listenToATIPEntries = (filters = {}, onSuccess, onError) => {
    try {
        const atipRef = collection(firedb, 'atipEntries')
        let q = query(atipRef)
        
        // Apply filters
        if (filters.dateRange) {
            const today = new Date()
            
            switch (filters.dateRange) {
                case '1D':
                    const selectedDate = new Date(filters.date)
                    selectedDate.setHours(0, 0, 0, 0)
                    const nextDay = new Date(selectedDate)
                    nextDay.setDate(selectedDate.getDate() + 1)
                    nextDay.setHours(0, 0, 0, 0)
                    
                    q = query(
                        q,
                        where('date', '>=', selectedDate.toISOString()),
                        where('date', '<', nextDay.toISOString())
                    )
                    break
                case '7D':
                    const weekAgo = new Date(today)
                    weekAgo.setDate(today.getDate() - 6)
                    weekAgo.setHours(0, 0, 0, 0)
                    const endOfWeek = new Date(today)
                    endOfWeek.setHours(23, 59, 59, 999)
                    
                    q = query(
                        q,
                        where('date', '>=', weekAgo.toISOString()),
                        where('date', '<=', endOfWeek.toISOString())
                    )
                    break
                case '1M':
                    const [year, month] = filters.month.split('-')
                    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
                    const endOfMonth = new Date(parseInt(year), parseInt(month), 0)
                    endOfMonth.setHours(23, 59, 59, 999)
                    
                    q = query(
                        q,
                        where('date', '>=', startOfMonth.toISOString()),
                        where('date', '<=', endOfMonth.toISOString())
                    )
                    break
            }
        } else if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(filters.endDate)
            end.setHours(23, 59, 59, 999)
            
            q = query(
                q,
                where('date', '>=', start.toISOString()),
                where('date', '<=', end.toISOString())
            )
        }

        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        return onSnapshot(q, 
            (snapshot) => {
                try {
                    const entries = []
                    snapshot.forEach((doc) => {
                        const data = doc.data()
                        entries.push({
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
                        })
                    })
                    logger.info('Fetched entries:', entries)
                    onSuccess(entries)
                } catch (error) {
                    logger.error('Error processing snapshot:', error)
                    if (onError) onError(error)
                }
            },
            (error) => {
                logger.error('Snapshot listener error:', error)
                if (onError) onError(error)
                return () => {}
            }
        )
    } catch (error) {
        logger.error('Error setting up ATIP entries listener:', error)
        if (onError) onError(error)
        return () => {}
    }
}

// Get ATIP statistics
export const getATIPStats = async (filters = {}) => {
    try {
        const entries = await getATIPEntries(filters)
        
        const stats = {
            totalMaliciousDomains: entries.length,
            totalConnectionAttempts: entries.reduce((sum, entry) => sum + parseInt(entry.attempts || 0), 0),
            confirmedMalicious: entries.length,
            blockedConnections: entries.reduce((sum, entry) => sum + parseInt(entry.attempts || 0), 0),
            tenantStats: {
                MWELL: entries.filter(e => e.tenant === 'MWELL').length,
                'SiyCha Group of Companies': entries.filter(e => e.tenant === 'SiyCha').length,
                MPIW: entries.filter(e => e.tenant === 'MPIW').length,
                NIKI: entries.filter(e => e.tenant === 'NIKI').length
            }
        }
        
        return stats
    } catch (error) {
        logger.error('Error getting ATIP stats:', error)
        return {
            totalMaliciousDomains: 0,
            totalConnectionAttempts: 0,
            confirmedMalicious: 0,
            blockedConnections: 0,
            tenantStats: {
                MWELL: 0,
                'SiyCha Group of Companies': 0,
                MPIW: 0,
                NIKI: 0
            }
        }
    }
}

// Report Management Functions
export const getReportData = async (filters = {}) => {
    try {
        const { tenant, dateRange, startDate, endDate } = filters
        
        // Get alerts for techniques distribution
        const alertsRef = collection(firedb, 'alerts')
        let alertsQuery = query(alertsRef)
        
        // Get ATIP entries for the same period
        const atipRef = collection(firedb, 'atipEntries')
        let atipQuery = query(atipRef)
        
        // Apply date range filter first
        if (startDate && endDate) {
            // For alerts, use timestamp field
            alertsQuery = query(
                alertsQuery,
                where('timestamp', '>=', new Date(startDate)),
                where('timestamp', '<=', new Date(endDate))
            )
            
            // For ATIP entries, adjust the date range to cover the full day
            const startDateObj = new Date(startDate)
            startDateObj.setHours(0, 0, 0, 0)
            
            const endDateObj = new Date(endDate)
            endDateObj.setHours(23, 59, 59, 999)
            
            atipQuery = query(
                atipQuery,
                where('date', '>=', startDateObj.toISOString()),
                where('date', '<=', endDateObj.toISOString())
            )
        }

        // Get all alerts and ATIP entries within the date range first
        const [alertsSnapshot, atipSnapshot] = await Promise.all([
            getDocs(alertsQuery),
            getDocs(atipQuery)
        ])
        
        // Then filter in memory for other conditions
        let filteredAlerts = alertsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        let filteredAtip = atipSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Apply tenant filter in memory with name mapping
        if (tenant && tenant !== 'all') {
            // For alerts, we need to check both forms of the tenant name
            filteredAlerts = filteredAlerts.filter(alert => {
                if (tenant === 'SiyCha') {
                    return alert.tenant === 'SiyCha Group of Companies' || alert.tenant === 'SiyCha';
                }
                return alert.tenant === tenant;
            });

            // For ATIP entries, we use the stored form
            filteredAtip = filteredAtip.filter(entry => {
                if (tenant === 'SiyCha Group of Companies') {
                    return entry.tenant === 'SiyCha';
                }
                return entry.tenant === tenant;
            });
        }
        
        // Process alerts data - collect unique techniques
        const techniquesMap = {}
        
        filteredAlerts.forEach(alert => {
            const technique = alert.technique || 'Unknown'
            if (!techniquesMap[technique]) {
                techniquesMap[technique] = {
                    truePositive: 0,
                    falsePositive: 0,
                    toBeConfirmed: 0
                }
            }
            
            if (alert.verificationStatus === 'True Positive') {
                techniquesMap[technique].truePositive++
            } else if (alert.verificationStatus === 'False Positive') {
                techniquesMap[technique].falsePositive++
            } else {
                techniquesMap[technique].toBeConfirmed++
            }
        })

        // Calculate ATIP statistics and use them for malicious activity
        const totalMaliciousTraffic = filteredAtip.reduce((sum, entry) => sum + parseInt(entry.attempts || 0), 0)
        const totalMaliciousDomains = filteredAtip.length
        
        // Calculate summary statistics from filtered alerts
        const totalIncidents = filteredAlerts.length
        const truePositives = filteredAlerts.filter(alert => 
            alert.verificationStatus === 'True Positive'
        ).length
        const falsePositives = filteredAlerts.filter(alert => 
            alert.verificationStatus === 'False Positive'
        ).length
        const toBeConfirmed = filteredAlerts.filter(alert => 
            alert.verificationStatus === 'To Be Confirmed'
        ).length
        
        return {
            techniquesData: techniquesMap,
            maliciousActivity: {
                totalMaliciousTraffic,
                totalMaliciousDomains
            },
            summaryStats: {
                totalIncidents,
                truePositives,
                falsePositives,
                toBeConfirmed
            }
        }
    } catch (error) {
        logger.error('Error getting report data:', error)
        return {
            techniquesData: {},
            maliciousActivity: {
                totalMaliciousTraffic: 0,
                totalMaliciousDomains: 0,
            },
            summaryStats: {
                totalIncidents: 0,
                truePositives: 0,
                falsePositives: 0,
                toBeConfirmed: 0
            }
        }
    }
}

// Attendance Management Functions
export const clockIn = async (userId, userName, shift) => {
    try {
        const attendanceRef = collection(firedb, 'attendance')
        
        // Get current PH time
        const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        phTime.setHours(0, 0, 0, 0)
        
        // Check if user has already clocked in today
        const q = query(
            attendanceRef,
            where('userId', '==', userId),
            where('date', '==', phTime.toISOString()),
            where('shift', '==', shift)
        )
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
            return { 
                success: false, 
                error: 'You have already clocked in for this shift today' 
            }
        }

        // Get user's role from users collection
        const userDoc = await getDoc(doc(firedb, 'users', userId))
        const userRole = userDoc.exists() ? userDoc.data().role : 'analyst'

        // Create new attendance record with PH time
        const newAttendanceRef = doc(attendanceRef)
        const clockInTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        
        await setDoc(newAttendanceRef, {
            userId,
            userName,
            date: phTime.toISOString(),
            shift,
            clockIn: clockInTime,
            clockOut: null,
            status: 'present',
            role: userRole
        })

        // Create activity log
        await createActivityLog({
            title: 'User Clocked In',
            description: `${userName} clocked in for ${shift} shift`,
            category: ACTIVITY_CATEGORIES.ATTENDANCE,
            action: ACTIVITY_ACTIONS.CLOCK_IN,
            details: {
                userId,
                userName,
                shift,
                date: phTime.toISOString(),
                role: userRole
            }
        })

        return { success: true, id: newAttendanceRef.id }
    } catch (error) {
        logger.error('Error clocking in:', error)
        return { success: false, error: 'Failed to clock in' }
    }
}

export const clockOut = async (userId, userName, shift) => {
    try {
        const attendanceRef = collection(firedb, 'attendance')
        
        // Get current PH time
        const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        phTime.setHours(0, 0, 0, 0)
        
        // Find today's attendance record for this user and shift
        const q = query(
            attendanceRef,
            where('userId', '==', userId),
            where('date', '==', phTime.toISOString()),
            where('shift', '==', shift),
            where('clockOut', '==', null)
        )
        const querySnapshot = await getDocs(q)
        
        if (querySnapshot.empty) {
            return { 
                success: false, 
                error: 'No active clock-in found for this shift' 
            }
        }

        // Update the attendance record with clock out time in PH time
        const attendanceDoc = querySnapshot.docs[0]
        const clockOutTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        
        await updateDoc(doc(attendanceRef, attendanceDoc.id), {
            clockOut: clockOutTime
        })

        // Create activity log
        await createActivityLog({
            title: 'User Clocked Out',
            description: `${userName} clocked out from ${shift} shift`,
            category: ACTIVITY_CATEGORIES.ATTENDANCE,
            action: ACTIVITY_ACTIONS.CLOCK_OUT,
            details: {
                userId,
                userName,
                shift,
                date: phTime.toISOString()
            }
        })

        return { success: true }
    } catch (error) {
        logger.error('Error clocking out:', error)
        return { success: false, error: 'Failed to clock out' }
    }
}

export const getAttendanceRecords = async (userId, startDate, endDate) => {
    try {
        const attendanceRef = collection(firedb, 'attendance')
        const q = query(
            attendanceRef,
            where('userId', '==', userId),
            where('date', '>=', startDate.toISOString()),
            where('date', '<=', endDate.toISOString()),
            orderBy('date', 'desc')
        )
        
        const querySnapshot = await getDocs(q)
        const records = []
        
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            records.push({
                id: doc.id,
                ...data,
                clockIn: data.clockIn?.toDate().toISOString(),
                clockOut: data.clockOut?.toDate().toISOString()
            })
        })
        
        return records
    } catch (error) {
        logger.error('Error fetching attendance records:', error)
        return []
    }
}

export const listenToAttendanceRecords = (userId, startDate, endDate, callback) => {
    const attendanceRef = collection(firedb, 'attendance')
    let q;

    if (userId) {
        // If userId is provided, filter by user
        q = query(
            attendanceRef,
            where('userId', '==', userId),
            orderBy('date', 'desc')
        )
    } else {
        // If no userId is provided, get all records for the date range
        q = query(
            attendanceRef,
            orderBy('date', 'desc')
        )
    }
    
    return onSnapshot(q, (snapshot) => {
        const records = []
        snapshot.forEach((doc) => {
            const data = doc.data()
            // Filter by date range in memory since we're already ordering by date
            if ((!startDate || data.date >= startDate.toISOString()) && 
                (!endDate || data.date <= endDate.toISOString())) {
                records.push({
                    id: doc.id,
                    ...data,
                    clockIn: data.clockIn?.toDate().toISOString(),
                    clockOut: data.clockOut?.toDate().toISOString()
                })
            }
        })
        callback(records)
    })
}

// Add log ingestion data
export const addLogIngestionData = async (logData) => {
    try {
        const logRef = collection(firedb, 'logIngestion')
        await addDoc(logRef, {
            ...logData,
            createdAt: serverTimestamp()
        })
    } catch (error) {
        logger.error('Error adding log ingestion data:', error)
        throw error
    }
}

// Listen to log ingestion data
export const listenToLogIngestion = (filters, callback) => {
    try {
        let q = collection(firedb, 'logIngestion')
        
        // Apply filters
        if (filters.tenant) {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        if (filters.startDate && filters.endDate) {
            q = query(q, 
                where('timestamp', '>=', filters.startDate),
                where('timestamp', '<=', filters.endDate)
            )
        }
        
        // Order by timestamp
        q = query(q, orderBy('timestamp', 'asc'))
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = []
            snapshot.forEach((doc) => {
                logs.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            callback(logs)
        })
        
        return unsubscribe
    } catch (error) {
        logger.error('Error setting up log ingestion listener:', error)
        throw error
    }
}

// Delete log ingestion data
export const deleteLogIngestionData = async (logId) => {
    try {
        await deleteDoc(doc(firedb, 'logIngestion', logId))
        return { success: true }
    } catch (error) {
        logger.error('Error deleting log ingestion data:', error)
        return { success: false, error: 'Failed to delete log ingestion data' }
    }
}

// Security Database Management Functions
export const addDatabaseEntry = async (category, entryData) => {
    try {
        const dbRef = collection(firedb, `securityDb_${category}`)
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        const newEntryRef = doc(dbRef)
        await setDoc(newEntryRef, {
            ...entryData,
            addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        
        return { success: true, id: newEntryRef.id }
    } catch (error) {
        logger.error(`Error adding ${category} entry:`, error)
        return { success: false, error: `Failed to add ${category} entry` }
    }
}

export const getDatabaseEntries = async (category, filters = {}) => {
    try {
        const dbRef = collection(firedb, `securityDb_${category}`)
        let q = query(dbRef, orderBy('createdAt', 'desc'))
        
        if (filters.searchTerm) {
            q = query(q, where('searchableText', '>=', filters.searchTerm.toLowerCase()))
        }
        
        const querySnapshot = await getDocs(q)
        const entries = []
        
        querySnapshot.forEach((doc) => {
            entries.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString()
            })
        })
        
        return entries
    } catch (error) {
        logger.error(`Error getting ${category} entries:`, error)
        return []
    }
}

export const updateDatabaseEntry = async (category, entryId, updateData) => {
    try {
        const entryRef = doc(firedb, `securityDb_${category}`, entryId)
        await updateDoc(entryRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        })
        return { success: true }
    } catch (error) {
        logger.error(`Error updating ${category} entry:`, error)
        return { success: false, error: `Failed to update ${category} entry` }
    }
}

export const deleteDatabaseEntry = async (category, entryId) => {
    try {
        const entryRef = doc(firedb, `securityDb_${category}`, entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
            return { success: false, error: 'Entry not found' }
        }
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...entryDoc.data(),
            id: entryId,
            collection: `securityDb_${category}`,
            type: category
        })
        
        if (moveResult.success) {
            await deleteDoc(entryRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error(`Error deleting ${category} entry:`, error)
        return { success: false, error: `Failed to delete ${category} entry` }
    }
}

export const listenToDatabaseEntries = (category, filters = {}, callback) => {
    try {
        const dbRef = collection(firedb, `securityDb_${category}`)
        let q = query(dbRef, orderBy('createdAt', 'desc'))
        
        if (filters.searchTerm) {
            q = query(q, where('searchableText', '>=', filters.searchTerm.toLowerCase()))
        }
        
        return onSnapshot(q, (snapshot) => {
            const entries = []
            snapshot.forEach((doc) => {
                entries.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate().toISOString(),
                    updatedAt: doc.data().updatedAt?.toDate().toISOString()
                })
            })
            callback(entries)
        })
    } catch (error) {
        logger.error(`Error setting up ${category} entries listener:`, error)
        return () => {}
    }
}

// Trash Management Functions
export const moveToTrash = async (itemData) => {
    try {
        const trashRef = collection(firedb, 'trash')
        
        // Get current user's email
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        
        // Set expiry date to 30 days from now
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30)
        
        // Ensure we have the original ID and collection
        const originalId = itemData.id
        const originalCollection = itemData.collection
        
        if (!originalId || !originalCollection) {
            logger.error('Missing required data for trash:', { originalId, originalCollection })
            return { 
                success: false, 
                error: 'Missing required data for trash operation' 
            }
        }
        
        // Use the original document ID as the trash document ID
        const trashDoc = doc(trashRef, originalId)
        
        await setDoc(trashDoc, {
            ...itemData,
            originalCollection,
            originalId,
            deletedBy,
            deletedAt: serverTimestamp(),
            expiresAt: expiryDate,
            size: JSON.stringify(itemData).length, // Approximate size in bytes
            name: itemData.name || itemData.alertName || 'Unnamed Item' // Ensure name is always defined
        })
        
        return { success: true, id: originalId }
    } catch (error) {
        logger.error('Error moving item to trash:', error)
        return { success: false, error: 'Failed to move item to trash' }
    }
}

export const listenToTrashItems = (callback) => {
    try {
        const trashRef = collection(firedb, 'trash')
        const q = query(trashRef, orderBy('deletedAt', 'desc'))
        
        return onSnapshot(q, {
            next: (snapshot) => {
                const items = []
                snapshot.forEach((doc) => {
                    const data = doc.data()
                    items.push({
                        id: doc.id,
                        ...data,
                        name: data.alertName || data.name || 'Unnamed Item', // Ensure name is always defined
                        deletedAt: data.deletedAt?.toDate().toISOString(),
                        expiresAt: data.expiresAt?.toDate().toISOString()
                    })
                })
                callback(items)
            },
            error: (error) => {
                logger.error('Error in trash listener:', error)
                callback([]) // Return empty array on error
            }
        })
    } catch (error) {
        logger.error('Error setting up trash listener:', error)
        callback([]) // Return empty array on error
        return () => {}
    }
}

export const restoreFromTrash = async (trashId) => {
    try {
        // Get the trash item first
        const trashRef = doc(firedb, 'trash', trashId)
        const trashDoc = await getDoc(trashRef)

        if (!trashDoc.exists()) {
            logger.error(`Trash item ${trashId} not found in Firestore.`)
            return {
                success: false,
                error: 'Item not found in trash. It may have already been restored or deleted.'
            }
        }

        const trashData = trashDoc.data()

        // Enhanced validation of required fields
        const requiredFields = ['originalCollection', 'type']
        const missingFields = requiredFields.filter(field => !trashData[field])
        
        if (missingFields.length > 0) {
            logger.error(`Missing required restoration data for trash item ${trashId}:`, {
                missingFields,
                trashData
            })
            return {
                success: false,
                error: `Missing required restoration data: ${missingFields.join(', ')}. Please contact support.`
            }
        }

        // Validate collection name to prevent injection
        const validCollections = ['alerts', 'blockedEntries', 'atipEntries', 'threatVulnerabilities', 'threatDetections']
        if (!validCollections.includes(trashData.originalCollection)) {
            logger.error(`Invalid collection name for trash item ${trashId}:`, trashData.originalCollection)
            return {
                success: false,
                error: 'Invalid collection name. Please contact support.'
            }
        }

        // Use the trash document ID as the target document ID since they are the same
        const targetCollectionRef = collection(firedb, trashData.originalCollection)
        const targetDoc = doc(targetCollectionRef, trashId)
        const existingDoc = await getDoc(targetDoc)

        if (existingDoc.exists()) {
            logger.info(`Target document already exists in ${trashData.originalCollection}, cleaning up trash entry`)
            // Clean up the trash entry since target already exists
            await deleteDoc(trashRef)
            return {
                success: false,
                error: 'Item already exists in its original location.'
            }
        }

        // Prepare the data for restoration by removing trash-specific fields
        const {
            originalCollection,
            deletedBy,
            deletedAt,
            expiresAt,
            size,
            type,
            ...restoreData
        } = trashData

        // Add restoration metadata
        const restoredData = {
            ...restoreData,
            restoredAt: serverTimestamp(),
            restoredBy: auth.currentUser?.email || 'system',
            restoredFrom: 'trash',
            lastRestoredAt: serverTimestamp(),
            restorationCount: (restoreData.restorationCount || 0) + 1
        }

        try {
            // Use a batch write to ensure both operations succeed or fail together
            const batch = writeBatch(firedb)

            // Create the restored document in its original collection using the same ID
            batch.set(targetDoc, restoredData)

            // Delete from trash
            batch.delete(trashRef)

            // Commit the batch
            await batch.commit()

            logger.info(`Successfully restored item from trash:`, {
                trashId,
                originalCollection: trashData.originalCollection,
                restoredBy: restoredData.restoredBy,
                type: trashData.type,
                restorationCount: restoredData.restorationCount
            })

            return {
                success: true,
                restoredId: trashId,
                collection: trashData.originalCollection,
                message: 'Item restored successfully',
                details: {
                    type: trashData.type,
                    name: trashData.name || trashData.alertName || 'Unnamed Item',
                    restoredBy: restoredData.restoredBy,
                    restorationCount: restoredData.restorationCount
                }
            }
        } catch (error) {
            logger.error(`Batch operation failed for trash item ${trashId}:`, error)

            if (error.code === 'permission-denied') {
                return {
                    success: false,
                    error: 'You do not have permission to restore this item.'
                }
            }

            if (error.code === 'not-found') {
                return {
                    success: false,
                    error: 'The original collection or document no longer exists.'
                }
            }

            return {
                success: false,
                error: `Failed to restore item - ${error.message}`
            }
        }
    } catch (error) {
        logger.error('Error in restoreFromTrash:', error)
        return {
            success: false,
            error: 'An unexpected error occurred while restoring the item.'
        }
    }
}

export const emptyTrash = async () => {
    try {
        const trashRef = collection(firedb, 'trash')
        const snapshot = await getDocs(trashRef)

        const batch = writeBatch(firedb)
        snapshot.forEach((doc) => {
            batch.delete(doc.ref)
        })

        await batch.commit()
        return { success: true }
    } catch (error) {
        logger.error('Error emptying trash:', error)
        return { success: false, error: 'Failed to empty trash' }
    }
}

export const getTrashItems = async () => {
    try {
        const trashRef = collection(firedb, 'trash')
        const snapshot = await getDocs(trashRef)

        const items = []
        snapshot.forEach((doc) => {
            items.push({
                id: doc.id, // Keeping the Firestore auto-generated id for reference
                ...doc.data(),
                deletedAt: doc.data().deletedAt?.toDate().toISOString(),
                expiresAt: doc.data().expiresAt?.toDate().toISOString()
            })
        })

        return items
    } catch (error) {
        logger.error('Error getting trash items:', error)
        return []
    }
}


// Threat Data Management Functions
export const addThreatVulnerability = async (data) => {
    try {
        const threatVulnRef = collection(firedb, 'threatVulnerabilities')
        const newThreatVulnRef = doc(threatVulnRef)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        await setDoc(newThreatVulnRef, {
            ...data,
            addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        
        return { success: true }
    } catch (error) {
        logger.error('Error adding threat vulnerability:', error)
        return { success: false, error: error.message }
    }
}

export const addThreatDetection = async (data) => {
    try {
        const threatDetRef = collection(firedb, 'threatDetections')
        const newThreatDetRef = doc(threatDetRef)
        
        // Get current user's email
        const currentUser = auth.currentUser
        const addedBy = currentUser ? currentUser.email : 'system'
        
        await setDoc(newThreatDetRef, {
            ...data,
            addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        
        return { success: true }
    } catch (error) {
        logger.error('Error adding threat detection:', error)
        return { success: false, error: error.message }
    }
}

export const listenToThreatVulnerabilities = (filters = {}, callback) => {
    try {
        const threatVulnRef = collection(firedb, 'threatVulnerabilities')
        let q = query(threatVulnRef, orderBy('timestamp', 'desc'))
        
        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        if (filters.startDate && filters.endDate) {
            q = query(q, 
                where('timestamp', '>=', filters.startDate),
                where('timestamp', '<=', filters.endDate)
            )
        }
        
        return onSnapshot(q, (snapshot) => {
            const threatVulns = []
            snapshot.forEach((doc) => {
                threatVulns.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            callback(threatVulns)
        })
    } catch (error) {
        logger.error('Error setting up threat vulnerabilities listener:', error)
        return () => {}
    }
}

export const listenToThreatDetections = (filters = {}, callback) => {
    try {
        const threatDetRef = collection(firedb, 'threatDetections')
        let q = query(threatDetRef, orderBy('timestamp', 'desc'))
        
        if (filters.tenant && filters.tenant !== 'all') {
            q = query(q, where('tenant', '==', filters.tenant))
        }
        
        if (filters.startDate && filters.endDate) {
            q = query(q, 
                where('timestamp', '>=', filters.startDate),
                where('timestamp', '<=', filters.endDate)
            )
        }
        
        return onSnapshot(q, (snapshot) => {
            const threatDets = []
            snapshot.forEach((doc) => {
                threatDets.push({
                    id: doc.id,
                    ...doc.data()
                })
            })
            callback(threatDets)
        })
    } catch (error) {
        logger.error('Error setting up threat detections listener:', error)
        return () => {}
    }
}

export const deleteThreatVulnerability = async (id) => {
    try {
        const threatVulnRef = doc(firedb, 'threatVulnerabilities', id)
        const threatVulnDoc = await getDoc(threatVulnRef)
        
        if (!threatVulnDoc.exists()) {
            return { success: false, error: 'Threat vulnerability not found' }
        }
        
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        const threatData = threatVulnDoc.data()
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...threatData,
            id: id,
            collection: 'threatVulnerabilities',
            type: 'threatVuln'
        })
        
        if (moveResult.success) {
            await deleteDoc(threatVulnRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error('Error deleting threat vulnerability:', error)
        return { success: false, error: error.message }
    }
}

export const deleteThreatDetection = async (id) => {
    try {
        const threatDetRef = doc(firedb, 'threatDetections', id)
        const threatDetDoc = await getDoc(threatDetRef)
        
        if (!threatDetDoc.exists()) {
            return { success: false, error: 'Threat detection not found' }
        }
        
        const currentUser = auth.currentUser
        const deletedBy = currentUser ? currentUser.email : 'system'
        const threatData = threatDetDoc.data()
        
        // Move to trash first
        const moveResult = await moveToTrash({
            ...threatData,
            id: id,
            collection: 'threatDetections',
            type: 'threatDet'
        })
        
        if (moveResult.success) {
            await deleteDoc(threatDetRef)
            return { success: true }
        }
        
        return moveResult
    } catch (error) {
        logger.error('Error deleting threat detection:', error)
        return { success: false, error: error.message }
    }
}