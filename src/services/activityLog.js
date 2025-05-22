import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    startAfter,
    Timestamp
} from 'firebase/firestore';
import { firedb } from './firebase';
import { auth } from './firebase';
import { logger } from '@/utils/logger';

// Create a new activity log entry
export const createActivityLog = async (activityData) => {
    try {
        // Only log specific important activities
        const allowedCategories = ['authentication', 'attendance', 'navigation'];
        const allowedActions = ['login', 'logout', 'clockIn', 'clockOut', 'pageView', 'security_alert'];

        // Check if this activity should be logged
        if (!allowedCategories.includes(activityData.category) || !allowedActions.includes(activityData.action)) {
            return { success: true }; // Silently succeed for non-logged activities
        }

        const activityLogRef = collection(firedb, 'activityLogs');
        const currentUser = auth.currentUser;
        
        // Clean the activity data by removing undefined values recursively
        const cleanActivityData = (data) => {
            if (Array.isArray(data)) {
                return data.map(item => cleanActivityData(item));
            }
            if (data && typeof data === 'object') {
                return Object.entries(data).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                        acc[key] = cleanActivityData(value);
                    }
                    return acc;
                }, {});
            }
            return data;
        };

        const logEntry = {
            ...cleanActivityData(activityData),
            timestamp: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: currentUser?.uid || 'system'
        };

        const docRef = await addDoc(activityLogRef, logEntry);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating activity log:', error);
        return { success: false, error: error.message };
    }
};

// Get activity logs with filters
export const getActivityLogs = async (filters = {}) => {
    try {
        const activityLogRef = collection(firedb, 'activityLogs');
        let q = query(
            activityLogRef,
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        // Apply filters
        if (filters.action) {
            q = query(q, where('action', '==', filters.action));
        }

        if (filters.category) {
            q = query(q, where('category', '==', filters.category));
        }

        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            q = query(q, where('timestamp', '>=', Timestamp.fromDate(startDate)));
        }

        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            q = query(q, where('timestamp', '<=', Timestamp.fromDate(endDate)));
        }

        // Add pagination
        if (filters.lastDoc) {
            q = query(q, startAfter(filters.lastDoc));
        }

        const snapshot = await getDocs(q);
        const logs = [];
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        snapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate().toISOString()
            });
        });

        return {
            logs,
            lastDoc,
            hasMore: snapshot.docs.length === 20
        };
    } catch (error) {
        logger.error('Error getting activity logs:', error);
        return {
            logs: [],
            lastDoc: null,
            hasMore: false
        };
    }
};

// Activity categories
export const ACTIVITY_CATEGORIES = {
    AUTH: 'authentication',
    ATTENDANCE: 'attendance',
    NAVIGATION: 'navigation'
};

// Activity actions
export const ACTIVITY_ACTIONS = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CLOCK_IN: 'clockIn',
    CLOCK_OUT: 'clockOut',
    PAGE_VIEW: 'pageView',
    SECURITY_ALERT: 'security_alert'
};

// Helper function to normalize category and action values
export const normalizeActivityValues = (value) => {
    if (!value) return '';
    return value.toLowerCase();
}; 