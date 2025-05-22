'use client'

import { useState, useEffect } from 'react'
import { auth, firedb } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import AnalystAttendance from './AnalystAttendance'
import SpecialistAttendance from './SpecialistAttendance'
import TraineeAttendance from './TraineeAttendance'
import { useAuth } from '@/contexts/AuthContext'

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

export default function Attendance() {
  const router = useRouter()
  const { user } = useAuth()
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    const checkUserRole = async () => {
      try {
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
  }, [user, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!userRole) {
    router.push('/auth/signin')
    return null
  }

  // Check if user is restricted to view-only
  const isViewOnly = userRole === 'super_admin' || userRole === 'coo' || userRole === 'ciso'

  // Render the appropriate dashboard based on user role
  switch (userRole) {
    case 'specialist':
    case 'team_leader':
      return <SpecialistAttendance />
    case 'analyst':
      return <AnalystAttendance />
    case 'trainee':
      return <TraineeAttendance />
    case 'super_admin':
    case 'coo':
    case 'ciso':
      return <SpecialistAttendance isViewOnly={true} />
    default:
      return <AnalystAttendance />
  }
}
