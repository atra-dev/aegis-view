// Self-executing async function to handle initialization
(async () => {
  try {
    // Try to load Firebase scripts with error handling
    try {
      importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
      importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');
    } catch (e) {
      console.error('Failed to load Firebase scripts:', e);
      // Fallback to alternative CDN
      try {
        importScripts('https://firebase.googleapis.com/v9/firebase-app-compat.js');
        importScripts('https://firebase.googleapis.com/v9/firebase-messaging-compat.js');
      } catch (e2) {
        console.error('Failed to load Firebase scripts from fallback CDN:', e2);
        throw new Error('Failed to load Firebase scripts');
      }
    }

    // Firebase configuration will be injected here
    const firebaseConfig = {
      apiKey: '%%FIREBASE_API_KEY%%',
      authDomain: '%%FIREBASE_AUTH_DOMAIN%%',
      projectId: '%%FIREBASE_PROJECT_ID%%',
      storageBucket: '%%FIREBASE_STORAGE_BUCKET%%',
      messagingSenderId: '%%FIREBASE_MESSAGING_SENDER_ID%%',
      appId: '%%FIREBASE_APP_ID%%',
      vapidKey: '%%FIREBASE_VAPID_KEY%%'
    };

    try {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized in service worker');
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      throw new Error('Failed to initialize Firebase');
    }

    const messaging = firebase.messaging();

    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);

      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: payload.data
      };

      // Handle image URL if provided
      if (payload.notification.image) {
        notificationOptions.image = payload.notification.image;
      }

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    // Set up notification click handler
    self.addEventListener('notificationclick', (event) => {
      event.notification.close();

      if (event.notification.data && event.notification.data.link) {
        event.waitUntil(
          clients.openWindow(event.notification.data.link)
        );
      }
    });

    // Add fetch event handler with better error handling
    self.addEventListener('fetch', (event) => {
      // Skip handling for non-GET requests
      if (event.request.method !== 'GET') {
        return;
      }

      // Skip handling for non-image requests
      if (!event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return;
      }

      event.respondWith(
        (async () => {
          try {
            // Try to fetch the image
            const response = await fetch(event.request);
            
            // If the fetch was successful, return the response
            if (response.ok) {
              return response;
            }

            // If the fetch failed, return a fallback response
            return new Response('', {
              status: 200,
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache'
              }
            });
          } catch (error) {
            console.error('Fetch error for image:', event.request.url, error);
            
            // Return a fallback response for failed requests
            return new Response('', {
              status: 200,
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache'
              }
            });
          }
        })()
      );
    });

    // Signal that the service worker is ready
    self.skipWaiting();
    console.log('Service worker initialized successfully');
  } catch (error) {
    console.error('Service worker initialization failed:', error);
  }
})(); 