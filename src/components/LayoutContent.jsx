'use client'

import React, { useEffect } from 'react'
import Navigation from "@/components/Navigation";
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import SessionManager from './SessionManager'


export default function LayoutContent({ children }) {
  const { user, userStatus } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If user is pending and not already on pending-approval page, redirect
    if (user && userStatus === 'pending' && pathname !== '/pending-approval') {
      router.push('/pending-approval')
    }
  }, [user, userStatus, router, pathname])


  // Always render the content - the useEffect will handle redirects
  return (
    <div className="flex h-screen">
      {/* Only show Navigation if user is approved and not on home page */}
      {(!user || userStatus !== 'pending') && pathname !== '/' && <Navigation />}
      <main className="flex-1 overflow-auto">
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </main>
      {/* Add session management */}
      {user && <SessionManager />}
    </div>
  )
} 