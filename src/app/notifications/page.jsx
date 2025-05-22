'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { collection, query, orderBy, onSnapshot, where, getDocs, doc, updateDoc, serverTimestamp, deleteDoc, addDoc, getDoc, writeBatch, limit, setDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { Bell, Check, X, AlertCircle, Shield, Server, Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { logger } from '@/utils/logger'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState([])
  const [allNotificationsCount, setAllNotificationsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const [userRole, setUserRole] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const NOTIFICATIONS_PER_PAGE = 20
  const [userSettings, setUserSettings] = useState(null)
  
  // Initialize sound preferences with defaults
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.5)
  const audioRef = useRef(null)

  // Load user preferences from Firebase
  const loadUserPreferences = async (userId) => {
    try {
      const userPrefsRef = doc(firedb, 'userPreferences', userId)
      const userPrefsDoc = await getDoc(userPrefsRef)
      
      if (userPrefsDoc.exists()) {
        const prefs = userPrefsDoc.data()
        setIsSoundEnabled(prefs.notificationSoundEnabled ?? true)
        setSoundVolume(prefs.notificationSoundVolume ?? 0.5)
      } else {
        // Create default preferences if they don't exist
        await setDoc(userPrefsRef, {
          notificationSoundEnabled: true,
          notificationSoundVolume: 0.5,
          updatedAt: serverTimestamp()
        })
      }
    } catch (error) {
      logger.error('Error loading user preferences:', error)
      toast.error('Failed to load sound preferences')
    }
  }

  // Save sound preferences to Firebase
  const saveSoundPreferences = async (userId) => {
    try {
      const userPrefsRef = doc(firedb, 'userPreferences', userId)
      await updateDoc(userPrefsRef, {
        notificationSoundEnabled: isSoundEnabled,
        notificationSoundVolume: soundVolume,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      logger.error('Error saving sound preferences:', error)
      toast.error('Failed to save sound preferences')
    }
  }

  const registerServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers are not supported in this browser');
      }

      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      if (existingRegistration) {
        logger.info('Service worker already registered:', existingRegistration);
        return existingRegistration;
      }

      // Register new service worker with the correct scope
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      logger.info('Service Worker registered successfully:', registration);

      // Wait for the service worker to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service worker activation timeout'));
        }, 10000);

        if (registration.active) {
          clearTimeout(timeout);
          resolve(registration);
        } else {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                clearTimeout(timeout);
                resolve(registration);
              }
            });
          });
        }
      });

      return registration;
    } catch (error) {
      logger.error('Error registering service worker:', error);
      throw error;
    }
  };

  // Load user settings
  const loadUserSettings = async (userId) => {
    try {
      const userPrefsRef = doc(firedb, 'userPreferences', userId)
      const userPrefsDoc = await getDoc(userPrefsRef)
      
      if (userPrefsDoc.exists()) {
        setUserSettings(userPrefsDoc.data())
      }
    } catch (error) {
      logger.error('Error loading user settings:', error)
    }
  }

  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeNotifications = null;

    const setupNotifications = async (user) => {
      try {
        if (!user) {
          setLoading(false)
          router.push('/auth/signin')
          return
        }

        // Get user role and load preferences and settings
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserRole(userData.role)
          
          // Load user preferences
          await loadUserPreferences(user.uid)
          
          // Load user settings
          await loadUserSettings(user.uid)
          
          // Load notifications only after user role is set
          if (userData.role) {
            unsubscribeNotifications = await loadNotifications(userData.role)
          } else {
            setLoading(false)
            toast.error('User role not found')
          }
        } else {
          setLoading(false)
          router.push('/auth/signin')
        }

        // Request notification permission and get FCM token
        try {
          const messaging = getMessaging()
          const permission = await Notification.requestPermission()
          
          if (permission === 'granted') {
            try {
              const registration = await registerServiceWorker()
              const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration
              })

              if (token) {
                // Check if token has changed
                const currentToken = userDoc.data().fcmToken
                if (currentToken !== token) {
                  await updateDoc(doc(firedb, 'users', user.uid), {
                    fcmToken: token,
                    fcmTokenUpdatedAt: serverTimestamp()
                  })
                  logger.info('FCM token updated successfully')
                  toast.success('Notifications enabled successfully')
                }
              } else {
                logger.warn('No FCM token received')
                toast.error('Failed to get notification token')
              }

              // Handle incoming messages
              onMessage(messaging, (payload) => {
                logger.log('Received foreground message:', payload)
                playNotificationSound()
                toast.custom((t) => (
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-yellow-500/20">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(payload.data?.type || 'default')}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-200">{payload.notification?.title}</h3>
                        <p className="text-gray-300 mt-1">{payload.notification?.body}</p>
                        {payload.data?.link && (
                          <a
                            href={payload.data.link}
                            className="text-yellow-400 hover:text-yellow-300 text-sm mt-2 inline-block"
                          >
                            View Details →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ), {
                  duration: 6000,
                  position: 'top-right'
                })
              })
            } catch (error) {
              logger.error('Error in FCM setup:', error)
            }
          } else {
            logger.warn('Notification permission denied')
            toast.error('Please enable notifications to receive alerts')
          }
        } catch (error) {
          logger.error('Error in notification setup:', error)
          setLoading(false)
        }
      } catch (error) {
        logger.error('Error in auth state changed:', error)
        setLoading(false)
        toast.error('Failed to load user data: ' + error.message)
      }
    }

    unsubscribeAuth = auth.onAuthStateChanged(setupNotifications)

    return () => {
      if (unsubscribeAuth) unsubscribeAuth()
      if (unsubscribeNotifications) unsubscribeNotifications()
    }
  }, [router])

  // Save preferences when they change
  useEffect(() => {
    const user = auth.currentUser
    if (user) {
      saveSoundPreferences(user.uid)
    }
  }, [isSoundEnabled, soundVolume])

  const loadNotifications = async (role) => {
    if (!role) {
      setLoading(false)
      return null
    }

    try {
      const notificationsRef = collection(firedb, 'notifications')
      const q = query(
        notificationsRef,
        where('role', '==', role),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
          const notificationMap = new Map()
          let unread = 0
          let readCount = 0
          const notificationsArray = []
          const userId = auth.currentUser?.uid

          // Get all notification IDs
          const notificationIds = snapshot.docs.map(doc => doc.id)
          console.log('Notification IDs:', notificationIds)
          console.log('Notifications snapshot:', snapshot.docs.map(doc => doc.data()))

          // Batch Firestore 'in' queries (max 10 per batch)
          let readStatusMap = new Map()
          if (notificationIds.length > 0) {
            const batchSize = 10
            for (let i = 0; i < notificationIds.length; i += batchSize) {
              const batchIds = notificationIds.slice(i, i + batchSize)
              const readStatusQuery = query(
                collection(firedb, 'notificationReadStatus'),
                where('userId', '==', userId),
                where('notificationId', 'in', batchIds)
              )
              const readStatusSnapshot = await getDocs(readStatusQuery)
              readStatusSnapshot.forEach(doc => {
                const data = doc.data()
                readStatusMap.set(data.notificationId, data.read)
              })
            }
          }
          console.log('Read status map:', readStatusMap)

          snapshot.forEach((doc) => {
            const data = doc.data()
            if (data.createdAt) {
              const isRead = readStatusMap.get(doc.id) || false
              const notification = {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate().toISOString(),
                read: isRead
              }
              // Count read/unread
              if (isRead) {
                readCount++
              } else {
                unread++
              }
              notificationsArray.push(notification)
            }
          })

          // Sort notifications by date
          notificationsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

          // Update state
          setNotifications(notificationsArray)
          setUnreadCount(unread)
          setAllNotificationsCount(notificationsArray.length)
          // Calculate total pages
          const total = Math.ceil(notificationsArray.length / NOTIFICATIONS_PER_PAGE)
          setTotalPages(total)
          setLoading(false)
        } catch (error) {
          setLoading(false)
        }
      })

      return unsubscribe
    } catch (error) {
      setLoading(false)
      return null
    }
  }

  // Initialize audio on component mount
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/notification.mp3')
      
      // Handle audio loading errors
      audioRef.current.onerror = (e) => {
        logger.error('Error loading notification sound:', e)
        toast.error('Failed to load notification sound')
      }
    } catch (error) {
      logger.error('Error initializing audio:', error)
    }
  }, [])

  // Update volume when settings change
  useEffect(() => {
    if (audioRef.current && userSettings?.notifications?.sound) {
      audioRef.current.volume = userSettings.notifications.sound.volume ?? 0.5
    }
  }, [userSettings?.notifications?.sound])

  const playNotificationSound = async () => {
    if (!userSettings?.notifications?.sound?.enabled || !audioRef.current) return

    try {
      // Reset the audio to the beginning
      audioRef.current.currentTime = 0
      
      // Play the sound
      await audioRef.current.play()
    } catch (error) {
      logger.error('Error playing notification sound:', error)
      // Don't show toast for user-initiated errors (like when browser blocks autoplay)
      if (error.name !== 'NotAllowedError') {
        toast.error('Failed to play notification sound')
      }
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'security':
        return <Shield className="w-5 h-5 text-blue-400" />
      case 'system':
        return <Server className="w-5 h-5 text-yellow-400" />
      case 'activity':
        return <Activity className="w-5 h-5 text-green-400" />
      default:
        return <Bell className="w-5 h-5 text-gray-400" />
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        toast.error('User not authenticated')
        return
      }

      // Check if already marked as read
      const readStatusRef = doc(firedb, 'notificationReadStatus', `${userId}_${notificationId}`)
      const readStatusDoc = await getDoc(readStatusRef)
      
      if (readStatusDoc.exists() && readStatusDoc.data().read) {
        toast.info('Notification already marked as read')
        return
      }

      // Update or create read status
      await setDoc(readStatusRef, {
        userId,
        notificationId,
        read: true,
        readAt: serverTimestamp()
      })

      // Update local state
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true, readAt: new Date().toISOString() }
          : notification
      ))
      
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Notification marked as read')
    } catch (error) {
      logger.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firedb, 'notifications', notificationId))
      toast.success('Notification deleted')
    } catch (error) {
      logger.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  const getFilteredNotifications = () => {
    const filtered = notifications.filter(notification => {
      switch (filter) {
        case 'unread':
          return !notification.read;
        case 'read':
          return notification.read === true;
        default:
          return true;
      }
    });

    // Get paginated results
    const start = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const end = start + NOTIFICATIONS_PER_PAGE;
    return filtered.slice(start, end);
  }

  const getFilterButtonClass = (buttonFilter) => {
    const baseClass = "px-6 py-2.5 rounded-lg font-mono text-sm transition-all duration-200 ";
    const activeClass = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-inner";
    const inactiveClass = "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30";
    
    return baseClass + (filter === buttonFilter ? activeClass : inactiveClass);
  };

  // Add pagination controls
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  // Update notifications when page changes
  useEffect(() => {
    if (userRole) {
      loadNotifications(userRole)
    }
  }, [currentPage])

  // Add cleanup function for notifications
  useEffect(() => {
    return () => {
      // Clear notifications when component unmounts
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          <p className="text-yellow-400 font-mono">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 py-8">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-mono">
            Notifications
          </h1>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-yellow-500/20 p-6 mb-8 shadow-lg">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                setFilter('all');
                setCurrentPage(1); // Reset to first page on filter change
              }}
              className={getFilterButtonClass('all')}
            >
              All ({allNotificationsCount})
            </button>
            <button
              onClick={() => {
                setFilter('unread');
                setCurrentPage(1);
              }}
              className={getFilterButtonClass('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => {
                setFilter('read');
                setCurrentPage(1);
              }}
              className={getFilterButtonClass('read')}
            >
              Read ({allNotificationsCount - unreadCount})
            </button>
          </div>
        </div>

        {/* Debug Info - Remove in production */}
        <div className="mb-4 text-xs text-gray-500">
          Filter: {filter} | Page: {currentPage} | Total: {allNotificationsCount} | Unread: {unreadCount} | Read: {allNotificationsCount - unreadCount}
        </div>

        {/* Notifications List */}
        <div className="space-y-6">
          {getFilteredNotifications().length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-yellow-500/20 shadow-lg">
              <p className="text-gray-400 font-mono text-center text-lg">
                {filter === 'all' 
                  ? 'No notifications found.'
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            <>
              {getFilteredNotifications().map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border 
                    ${notification.read 
                      ? 'border-gray-700/50 opacity-75' 
                      : 'border-yellow-500/20'
                    } p-6 transition-all duration-200 hover:shadow-lg hover:border-yellow-500/30 hover:opacity-100`}
                >
                  <div className="flex items-start gap-6">
                    <div className={`mt-1 p-2.5 rounded-lg ${notification.read ? 'bg-gray-700/20' : 'bg-gray-700/30'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className={`font-semibold text-lg ${notification.read ? 'text-gray-400' : 'text-gray-200'}`}>
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className={`mt-2 leading-relaxed ${notification.read ? 'text-gray-500' : 'text-gray-300'}`}>
                        {notification.message}
                      </p>
                      {notification.link && (
                        <a
                          href={notification.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm mt-3 inline-flex items-center gap-1 transition-colors
                            ${notification.read ? 'text-yellow-600 hover:text-yellow-500' : 'text-yellow-400 hover:text-yellow-300'}`}
                        >
                          View Details 
                          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                        </a>
                      )}
                    </div>
                    <div className="flex gap-3 ml-4">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-yellow-400 transition-colors bg-gray-700/30 rounded-lg hover:bg-yellow-500/10"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-700/30 rounded-lg hover:bg-red-500/10"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-6 mt-8 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-yellow-500/10 p-4">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    currentPage === 1
                      ? 'text-gray-600 cursor-not-allowed bg-gray-800/30'
                      : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-400 font-mono text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'text-gray-600 cursor-not-allowed bg-gray-800/30'
                      : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 