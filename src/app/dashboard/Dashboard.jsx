'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, firedb } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import SpecialistDashboard from './SpecialistDashboard'

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex flex-col items-center justify-center gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 right-0 bottom-0">
        <div className="w-16 h-16 rounded-full border-4 border-cyan-400/20 animate-[spin_1.5s_linear_infinite]" />
      </div>
      <div className="absolute top-0 left-0 right-0 bottom-0">
        <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-cyan-400 animate-[spin_1s_ease-in-out_infinite]" />
      </div>
    </div>
    <div className="text-cyan-400 font-mono text-xl animate-pulse">Loading...</div>
  </div>
)

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Get user role from Firestore
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role)
        }
    } catch (error) {
        console.error('Error checking user role:', error)
      } finally {
      setLoading(false)
    }
    }

    checkUserRole()
  }, [router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!userRole) {
    router.push('/auth/signin')
    return null
  }

  // Import DefaultDashboard outside switch statement
  const DefaultDashboard = require('./DefaultDashboard').default

  // Render the appropriate dashboard based on user role
  switch (userRole) {
    case 'specialist':
    case 'coo':
    case 'ciso':
    case 'super_admin':
      return <SpecialistDashboard />
    case 'analyst':
    case 'trainee':
      return <DefaultDashboard />
    default:
      return <DefaultDashboard />
  }
}
