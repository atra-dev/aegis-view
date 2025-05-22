/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Schedule function to run at midnight PH time (16:00 UTC previous day)
exports.resetDailyUsage = onSchedule({
  schedule: "0 16 * * *",
  timeZone: "Asia/Manila"
}, async (event) => {
  const db = admin.firestore();
  const apiKeysRef = db.collection("apiKeys");
  const snapshot = await apiKeysRef.get();
  
  const batch = db.batch();
  const today = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).split(",")[0];

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      dailyUsage: 0,
      lastReset: today
    });
  });

  await batch.commit();
  console.log("Daily usage reset completed");
  return null;
});

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Helper function to get PH time
const getPHTime = () => {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  // Get the time string in PH time
  const phTimeString = now.toLocaleString('en-US', options);
  
  // Parse the string back to a Date object
  const [datePart, timePart] = phTimeString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  // Create a new Date object with the PH time components
  return new Date(year, month - 1, day, hours, minutes, seconds);
};

// Helper function to check if it's a specific time in PH with consistent window
const isSpecificTime = (hour, minute) => {
  const phTime = getPHTime();
  const currentHour = phTime.getHours();
  const currentMinute = phTime.getMinutes();
  
  // More lenient 15-minute window (7 minutes before and after)
  const isWithinTimeWindow = 
    currentHour === hour && 
    currentMinute >= Math.max(0, minute - 7) && 
    currentMinute <= Math.min(59, minute + 7);
  
  logger.info(`Time check: Current PH time is ${currentHour}:${currentMinute} against target ${hour}:${minute}. Within window: ${isWithinTimeWindow}`);
  return isWithinTimeWindow;
};

// Helper function to check if notifications were already created today
const checkNotificationsCreatedToday = async (notificationType, role = null, timeSlot = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  logger.info(`Checking for ${notificationType} notifications between ${today.toISOString()} and ${tomorrow.toISOString()}`);

  let query = admin.firestore()
    .collection('notifications')
    .where('createdAt', '>=', today)
    .where('createdAt', '<', tomorrow)
    .where('type', '==', notificationType);

  if (role) {
    query = query.where('role', '==', role);
  }

  if (timeSlot) {
    query = query.where('timeSlot', '==', timeSlot);
  }

  const snapshot = await query.get();

  const exists = !snapshot.empty;
  logger.info(`Found ${snapshot.size} ${notificationType} notifications for today. Already exists: ${exists}`);
  
  return exists;
};

// Function to create notification in Firestore
const createNotification = async (title, message, type, link, role, priority = 'normal', actionRequired = false, timeSlot = null) => {
  try {
    // Create notification in Firestore
    const notificationRef = await admin.firestore().collection('notifications').add({
      title,
      message,
      type,
      link,
      role,
      priority,
      actionRequired,
      read: false,
      timeSlot,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    });
    logger.info(`Created notification: ${notificationRef.id} for role ${role} at ${timeSlot}`);

    // Get users with matching role and FCM token
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', role)
      .where('fcmToken', '!=', null)
      .get();

    const tokens = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length > 0) {
      // Prepare the FCM message
      const fcmMessage = {
        notification: {
          title,
          body: message
        },
        data: {
          type,
          link: link || '',
          notificationId: notificationRef.id,
          priority,
          actionRequired: actionRequired.toString(),
          timeSlot: timeSlot || ''
        },
        tokens: tokens
      };

      // Send the message
      const response = await admin.messaging().sendMulticast(fcmMessage);
      logger.info(`Successfully sent notification to ${response.successCount} devices`);
      if (response.failureCount > 0) {
        logger.warn(`Failed to send notification to ${response.failureCount} devices`);
      }
    }

    return notificationRef.id;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

// Scheduled function to check and create notifications
exports.checkAndCreateNotifications = onSchedule({
  schedule: "every 5 minutes"
}, async (event) => {
  try {
    const phTime = getPHTime();
    logger.info('Starting notification check at PH time:', phTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

    // Get all users with their FCM tokens
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    logger.info(`Found ${users.length} total users`);

    // Check for specialist notifications (4:30 PM)
    if (isSpecificTime(16, 30)) {
      const timeSlot = '16:30';
      const specialistNotificationsCreated = await checkNotificationsCreatedToday('system', 'specialist', timeSlot);
      if (!specialistNotificationsCreated) {
        const specialists = users.filter(user => user.role === 'specialist');
        logger.info(`Found ${specialists.length} specialists to notify`);
        for (const specialist of specialists) {
          if (specialist.fcmToken) {
            await createNotification(
              'Log Ingestion Update Required',
              'Please update the log ingestion system to include new data sources and formats.',
              'system',
              '/dashboard',
              'specialist',
              'high',
              true,
              timeSlot
            );
          } else {
            logger.warn(`Specialist ${specialist.id} has no FCM token`);
          }
        }
      }
    }

    // Check for graveyard shift notifications (2 AM and 4 AM)
    if (isSpecificTime(2, 0) || isSpecificTime(4, 0)) {
      const hour = phTime.getHours();
      const timeSlot = `${hour}:00`;
      const graveyardNotificationsCreated = await checkNotificationsCreatedToday('alert', null, timeSlot);
      
      if (!graveyardNotificationsCreated) {
        const timeString = hour === 2 ? '2 AM' : '4 AM';
        const analystsAndTrainees = users.filter(user => 
          user.role === 'analyst' || user.role === 'trainee'
        );
        
        for (const user of analystsAndTrainees) {
          if (user.fcmToken) {
            await createNotification(
              `Graveyard Shift Check - ${timeString}`,
              `This is your ${timeString} graveyard shift check. Stay vigilant and maintain high alertness.`,
              'alert',
              '/monitoring/alerts',
              user.role,
              'high',
              true,
              timeSlot
            );
          }
        }
      }
    }

    // Check for report preparation notifications (5 AM, 1 PM, 9 PM)
    if (isSpecificTime(5, 0) || isSpecificTime(13, 0) || isSpecificTime(21, 0)) {
      const hour = phTime.getHours();
      const timeSlot = `${hour}:00`;
      const reportNotificationsCreated = await checkNotificationsCreatedToday('report', null, timeSlot);

      if (!reportNotificationsCreated) {
        let timeString = '';
        let shiftType = '';

        if (hour === 5) {
          timeString = '5 AM';
          shiftType = 'morning';
        } else if (hour === 13) {
          timeString = '1 PM';
          shiftType = 'afternoon';
        } else if (hour === 21) {
          timeString = '9 PM';
          shiftType = 'evening';
        }

        const analystsAndTrainees = users.filter(user => 
          user.role === 'analyst' || user.role === 'trainee'
        );

        for (const user of analystsAndTrainees) {
          if (user.fcmToken) {
            await createNotification(
              `Report Preparation - ${timeString} Shift`,
              `Prepare your ${shiftType} shift reports for SOC and ATIP.`,
              'report',
              '/monitoring/reports',
              user.role,
              'high',
              true,
              timeSlot
            );
          }
        }
      }
    }

    // Check for maintenance check notifications (6:10 AM, 2:10 PM, 10:10 PM)
    if (isSpecificTime(6, 10) || isSpecificTime(14, 10) || isSpecificTime(22, 10)) {
      const hour = phTime.getHours();
      const timeSlot = `${hour}:10`;
      const maintenanceNotificationsCreated = await checkNotificationsCreatedToday('system', 'super_admin', timeSlot);

      if (!maintenanceNotificationsCreated) {
        let timeString = '';
        let shiftType = '';

        if (hour === 6) {
          timeString = '6:10 AM';
          shiftType = 'morning';
        } else if (hour === 14) {
          timeString = '2:10 PM';
          shiftType = 'afternoon';
        } else if (hour === 22) {
          timeString = '10:10 PM';
          shiftType = 'evening';
        }

        const superAdmins = users.filter(user => user.role === 'super_admin');
        for (const superAdmin of superAdmins) {
          if (superAdmin.fcmToken) {
            await createNotification(
              `System Maintenance Check - ${timeString} Shift`,
              `Please perform end-of-shift system maintenance check. Review system logs, check for any anomalies, and ensure all services are running properly.`,
              'system',
              '/dashboard',
              'super_admin',
              'high',
              true,
              timeSlot
            );
          }
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Error in notification check:', error);
    return null;
  }
});

// Add this new function after the existing functions
exports.cleanupDuplicateNotifications = onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    logger.info('Starting duplicate notifications cleanup');

    // Get all notifications ordered by creation time
    const notificationsRef = db.collection('notifications');
    const snapshot = await notificationsRef.orderBy('createdAt', 'desc').get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || null
      });
    });

    logger.info(`Total notifications found: ${notifications.length}`);

    // Create a map to track unique notifications
    const uniqueMap = new Map();
    const duplicateIds = [];
    const keepIds = new Set();

    // Group notifications by their content
    notifications.forEach(notification => {
      // Create a unique key based on notification properties
      const key = `${notification.title}-${notification.message}-${notification.type}-${notification.role}-${
        notification.createdAt?.split('T')[0]  // Use just the date part
      }`;

      if (!uniqueMap.has(key)) {
        // Keep the first occurrence (most recent due to ordering)
        uniqueMap.set(key, notification.id);
        keepIds.add(notification.id);
      } else {
        // Mark as duplicate
        duplicateIds.push(notification.id);
      }
    });

    logger.info(`Found ${duplicateIds.length} duplicate notifications to remove`);

    // Delete duplicates in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = db.batch();
      const chunk = duplicateIds.slice(i, i + batchSize);
      
      chunk.forEach(id => {
        const docRef = notificationsRef.doc(id);
        batch.delete(docRef);
      });
      
      batches.push(batch.commit());
    }

    // Execute all batches
    await Promise.all(batches);

    const result = {
      totalNotifications: notifications.length,
      uniqueNotifications: keepIds.size,
      duplicatesRemoved: duplicateIds.length,
      batchesProcessed: batches.length
    };

    logger.info('Cleanup completed successfully', result);
    res.status(200).json({
      success: true,
      message: 'Duplicate notifications cleanup completed',
      ...result
    });

  } catch (error) {
    logger.error('Error cleaning up duplicate notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup duplicate notifications',
      details: error.message
    });
  }
});

// Add a scheduled version that runs daily to prevent accumulation
exports.scheduledCleanupDuplicateNotifications = onSchedule({
  schedule: "0 0 * * *", // Run at midnight every day
  timeZone: "Asia/Manila"
}, async (event) => {
  try {
    const db = admin.firestore();
    logger.info('Starting scheduled duplicate notifications cleanup');

    // Get notifications from the last 30 days only
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const notificationsRef = db.collection('notifications');
    const snapshot = await notificationsRef
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc')
      .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || null
      });
    });

    logger.info(`Total recent notifications found: ${notifications.length}`);

    // Create a map to track unique notifications
    const uniqueMap = new Map();
    const duplicateIds = [];
    const keepIds = new Set();

    // Group notifications by their content
    notifications.forEach(notification => {
      const key = `${notification.title}-${notification.message}-${notification.type}-${notification.role}-${
        notification.createdAt?.split('T')[0]
      }`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, notification.id);
        keepIds.add(notification.id);
      } else {
        duplicateIds.push(notification.id);
      }
    });

    logger.info(`Found ${duplicateIds.length} duplicate notifications to remove`);

    // Delete duplicates in batches
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = db.batch();
      const chunk = duplicateIds.slice(i, i + batchSize);
      
      chunk.forEach(id => {
        const docRef = notificationsRef.doc(id);
        batch.delete(docRef);
      });
      
      batches.push(batch.commit());
    }

    // Execute all batches
    await Promise.all(batches);

    logger.info('Scheduled cleanup completed', {
      totalNotifications: notifications.length,
      uniqueNotifications: keepIds.size,
      duplicatesRemoved: duplicateIds.length,
      batchesProcessed: batches.length
    });

    return null;
  } catch (error) {
    logger.error('Error in scheduled cleanup:', error);
    return null;
  }
});

