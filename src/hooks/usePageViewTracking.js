"use client"
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createActivityLog } from '@/services/activityLog';
import { ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from '@/services/activityLog';
import { auth, firedb } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '@/utils/logger';

// Map of paths to readable page names
const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/statistics': 'Statistics',
  '/monitoring': 'SOC Monitoring Overview',
  '/monitoring/alerts': 'Alerts Management',
  '/monitoring/blocked-ips': 'Blocked IPs and DNS',
  '/monitoring/atip-consolidated': 'ATIP Consolidated',
  '/monitoring/reports': 'Monitoring Reports',
  '/monitoring/manual-alert': 'Manual Alert Creation',
  '/database': 'Database Management',
  '/activity-log': 'Activity Logs',
  '/team': 'Team Overview',
  '/attendance': 'Attendance Management',
  '/notifications': 'Notifications Center',
  '/checker': 'VirusTotal Checker',
  '/settings': 'Settings',
  '/trash': 'Trash',
  '/help': 'Help Center'
};

// Get section name based on path
const getSectionName = (path) => {
  if (path.startsWith('/monitoring')) return 'ATRA Monitoring';
  if (path.startsWith('/admin')) return 'Administration';
  if (path.startsWith('/settings')) return 'Settings';
  if (path.startsWith('/database')) return 'Database Management';
  return 'Main Navigation';
};

export const usePageViewTracking = () => {
  const pathname = usePathname();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          logger.info('No user logged in, skipping page view tracking');
          return;
        }

        // Get user role from Firestore
        const userDoc = await getDoc(doc(firedb, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          logger.warn('User document not found for page view tracking');
          return;
        }

        const userRole = userDoc.data()?.role;
        logger.info(`User role for page view tracking: ${userRole}`);

        // Only track page views for analysts and trainees
        if (userRole === 'analyst' || userRole === 'trainee') {
          const pageName = PAGE_NAMES[pathname] || pathname;
          const section = getSectionName(pathname);
          
          logger.info(`Tracking page view: ${pageName} in section ${section}`);
          
          await createActivityLog({
            category: ACTIVITY_CATEGORIES.NAVIGATION,
            action: ACTIVITY_ACTIONS.PAGE_VIEW,
            details: {
              path: pathname,
              pageName: pageName,
              section: section,
              role: userRole,
              timestamp: new Date().toISOString(),
              userEmail: currentUser.email,
              displayName: currentUser.displayName || 'Unknown User'
            }
          });
          
          logger.info('Page view tracked successfully');
        } else {
          logger.info(`Skipping page view tracking for role: ${userRole}`);
        }
      } catch (error) {
        logger.error('Error tracking page view:', error);
      }
    };

    // Only track if it's not an auth page
    if (!pathname.startsWith('/auth/')) {
      trackPageView();
    }
  }, [pathname]);
}; 