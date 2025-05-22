'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  clockIn, 
  clockOut, 
  listenToAttendanceRecords 
} from '@/services/management'
import { toast } from 'react-hot-toast'
import { doc, getDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { logger } from '@/utils/logger'

export default function TraineeAttendance() {
  const router = useRouter()
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [userData, setUserData] = useState(null)

  // Fetch user data from Firestore
  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data())
        }
      } catch (error) {
        logger.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [user])

  // Function to generate initials from name
  const getInitials = (name) => {
    return name
      .split(',')[0]
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  // Function to get image path for a person
  const getPersonImage = (name) => {
    try {
      const cleanName = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
      return `/images/trainees/${cleanName}.jpg`
    } catch (error) {
      logger.error('Error getting image path:', error)
      return null
    }
  }

  // Component for profile picture with fallback
  const ProfilePicture = ({ name }) => {
    const [showInitials, setShowInitials] = useState(false)
    const imagePath = getPersonImage(name)
    const initials = getInitials(name)

    return (
      <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full mb-3 overflow-hidden">
        {!showInitials && userData?.photoURL && (
          <div className="relative w-full h-full">
            <Image
              src={userData.photoURL}
              alt={name}
              fill
              sizes="96px"
              className="object-cover"
              onError={() => setShowInitials(true)}
              unoptimized
            />
          </div>
        )}
        {showInitials && (
          <div className="flex items-center justify-center w-full h-full text-cyan-400 font-bold text-xl">
            {initials}
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!user) return

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days
    const endDate = new Date()

    const unsubscribeFn = listenToAttendanceRecords(
      user.uid,
      startDate,
      endDate,
      (records) => {
        setAttendanceRecords(records)
      }
    )

    setUnsubscribe(() => unsubscribeFn)

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user])

  // Function to check if user has clocked in for today
  const hasClockedIn = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
      record.clockIn !== null
    )
  }

  // Function to check if user has clocked out for today
  const hasClockedOut = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
      record.clockIn !== null &&
      record.clockOut !== null
    )
  }

  const handleClockIn = async () => {
    setLoading(true)
    try {
      const result = await clockIn(user.uid, user.displayName, 'daily')
      if (result.success) {
        toast.success('Successfully clocked in')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to clock in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    setLoading(true)
    try {
      const result = await clockOut(user.uid, user.displayName, 'daily')
      if (result.success) {
        toast.success('Successfully clocked out')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to clock out')
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = (action) => {
    setPendingAction({ type: action })
    setShowConfirmModal(true)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return

    const { type } = pendingAction
    if (type === 'clockIn') {
      await handleClockIn()
    } else {
      await handleClockOut()
    }
    setShowConfirmModal(false)
    setPendingAction(null)
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4 font-mono">
            Trainee Attendance
          </h1>

          {/* Current Schedule Info */}
          <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-cyan-500/20">
            <h3 className="text-cyan-400 font-mono mb-2">Current Schedule:</h3>
            <div className="text-gray-300 font-mono space-y-1">
              <p>Date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Shift: Daily (8 AM - 5 PM)</p>
            </div>
          </div>

          {/* Trainee Profile Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 font-mono">Your Profile</h2>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
              <div className="flex flex-col items-center">
                <ProfilePicture name={user?.displayName || ''} />
                <h3 className="text-gray-300 font-mono text-center mb-2">{user?.displayName}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionClick('clockIn')}
                    disabled={loading || hasClockedIn()}
                    className="px-3 py-1 text-sm font-mono rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasClockedIn() ? 'Clocked In' : 'Clock In'}
                  </button>
                  <button
                    onClick={() => handleActionClick('clockOut')}
                    disabled={loading || !hasClockedIn() || hasClockedOut()}
                    className="px-3 py-1 text-sm font-mono rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasClockedOut() ? 'Clocked Out' : 'Clock Out'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance Records */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 font-mono">Recent Attendance</h2>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-cyan-500/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-cyan-500/20">
                      <th className="p-4 text-cyan-400 font-mono">Date</th>
                      <th className="p-4 text-cyan-400 font-mono">Clock In</th>
                      <th className="p-4 text-cyan-400 font-mono">Clock Out</th>
                      <th className="p-4 text-cyan-400 font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.slice(0, 7).map((record, index) => (
                      <tr key={index} className="border-b border-cyan-500/10 hover:bg-gray-800/30 transition-colors">
                        <td className="p-4 text-gray-300 font-mono">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="p-4 text-gray-300 font-mono">
                          {record.clockIn ? new Date(record.clockIn).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="p-4 text-gray-300 font-mono">
                          {record.clockOut ? new Date(record.clockOut).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono ${
                            record.clockIn && record.clockOut
                              ? 'bg-green-500/20 text-green-400'
                              : record.clockIn
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {record.clockIn && record.clockOut
                              ? 'Completed'
                              : record.clockIn
                              ? 'On Duty'
                              : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-cyan-500/20 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 font-mono">
              Confirm {pendingAction?.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
            </h3>
            <p className="text-gray-300 mb-6 font-mono">
              Are you sure you want to {pendingAction?.type === 'clockIn' ? 'clock in' : 'clock out'}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingAction(null)
                }}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg font-mono ${
                  pendingAction?.type === 'clockIn'
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 