import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    orderBy
} from 'firebase/firestore';
import { firedb } from './firebase';
import { auth } from './firebase';
import { logger } from '@/utils/logger';

// Create a new notification
export const createNotification = async (notificationData) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const currentUser = auth.currentUser;
        
        const notification = {
            ...notificationData,
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: currentUser?.uid || 'system'
        };

        const docRef = await addDoc(notificationsRef, notification);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
};

// Get notifications for a specific user
export const getUserNotifications = async (userId, filters = {}) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        let q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        // Apply filters
        if (filters.read !== undefined) {
            q = query(q, where('read', '==', filters.read));
        }

        if (filters.type) {
            q = query(q, where('type', '==', filters.type));
        }

        const snapshot = await getDocs(q);
        const notifications = [];

        snapshot.forEach((doc) => {
            notifications.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString()
            });
        });

        return notifications;
    } catch (error) {
        logger.error('Error getting user notifications:', error);
        return [];
    }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
    try {
        const notificationRef = doc(firedb, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            read: true,
            readAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(firedb);

        snapshot.forEach((doc) => {
            batch.update(doc.ref, {
                read: true,
                readAt: serverTimestamp()
            });
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
    }
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
    try {
        await deleteDoc(doc(firedb, 'notifications', notificationId));
        return { success: true };
    } catch (error) {
        logger.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
};

// Create system notification
export const createSystemNotification = async (message, type = 'system', link = null) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const currentUser = auth.currentUser;

        const notification = {
            title: 'System Notification',
            message,
            type,
            link,
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: 'system' // System notifications are for all users
        };

        const docRef = await addDoc(notificationsRef, notification);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating system notification:', error);
        return { success: false, error: error.message };
    }
};

// Create alert notification
export const createAlertNotification = async (alertData) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const currentUser = auth.currentUser;

        const notification = {
            title: 'Security Alert',
            message: alertData.description || 'New security alert detected',
            type: 'alert',
            link: alertData.link,
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: 'system', // Alert notifications are for all users
            alertData: {
                severity: alertData.severity,
                category: alertData.category,
                source: alertData.source,
                timestamp: alertData.timestamp
            }
        };

        const docRef = await addDoc(notificationsRef, notification);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating alert notification:', error);
        return { success: false, error: error.message };
    }
};

// Create security notification
export const createSecurityNotification = async (securityData) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const currentUser = auth.currentUser;

        const notification = {
            title: 'Security Update',
            message: securityData.message || 'New security update available',
            type: 'security',
            link: securityData.link,
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: 'system', // Security notifications are for all users
            securityData: {
                type: securityData.type,
                priority: securityData.priority,
                affectedSystems: securityData.affectedSystems
            }
        };

        const docRef = await addDoc(notificationsRef, notification);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating security notification:', error);
        return { success: false, error: error.message };
    }
};

// Create activity notification
export const createActivityNotification = async (activityData) => {
    try {
        const notificationsRef = collection(firedb, 'notifications');
        const currentUser = auth.currentUser;

        const notification = {
            title: 'Activity Update',
            message: activityData.message || 'New activity detected',
            type: 'activity',
            link: activityData.link,
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'system',
            userId: activityData.userId || 'system',
            activityData: {
                action: activityData.action,
                target: activityData.target,
                timestamp: activityData.timestamp
            }
        };

        const docRef = await addDoc(notificationsRef, notification);
        return { success: true, id: docRef.id };
    } catch (error) {
        logger.error('Error creating activity notification:', error);
        return { success: false, error: error.message };
    }
}; 