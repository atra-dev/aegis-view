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
import { getDoc, doc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { logger } from '@/utils/logger'

export default function SpecialistAttendance({ isViewOnly = false }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userRole, setUserRole] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDay, setSelectedDay] = useState('monday')
  const [selectedView, setSelectedView] = useState('records') // Default to records view for view-only users
  const [selectedShift, setSelectedShift] = useState('')
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [filterName, setFilterName] = useState('')
  const [filterShift, setFilterShift] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    const fetchUserRole = async () => {
      try {
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role)
        }
      } catch (error) {
        logger.error('Error fetching user role:', error)
      }
    }
    fetchUserRole()
  }, [user, router])

  // Check if user is restricted to view-only
  const isUserViewOnly = userRole === 'super_admin' || userRole === 'coo' || userRole === 'ciso'

  // Updated schedule data with day-specific schedules (all analysts for each day)
  const scheduleData = {
    monday: {
     
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    tuesday: {
     
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    wednesday: {
     
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    thursday: {
      
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    friday: {
     
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    saturday: {
     
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    },
    sunday: {
      
      teamLeaders: [
        'ENGR. Alitao, Justine Kyle D., CPE',
        'ENGR. Edianel, Calvin Rey E., CPE',
        'ENGR. Lachica, Esteban L., CPE',
        'ENGR. Morales, Allina Marie F., CPE',
        'ENGR. Tiongco, Kirshe T., CPE'
      ]
    }
  }

  // Get the date of Monday (start) of the current week in PH time
  const getStartOfWeek = (date) => {
    const phTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const day = phTime.getDay()
    const diff = phTime.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(phTime.setDate(diff))
  }

  // Get date for a specific day in the current week (PH time)
  const getDateFromDay = (dayName) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDate = new Date(selectedDate)
    const phTime = new Date(currentDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const startOfWeek = getStartOfWeek(phTime)
    const dayIndex = days.indexOf(dayName)
    const targetDate = new Date(startOfWeek)
    targetDate.setDate(startOfWeek.getDate() + (dayIndex === 0 ? 6 : dayIndex - 1))
    return targetDate.toISOString().split('T')[0]
  }

  // Get day name from date (PH time)
  const getDayFromDate = (dateString) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const phTime = new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    return days[phTime.getDay()]
  }

  // Handle day selection change
  const handleDayChange = (e) => {
    const newDay = e.target.value
    setSelectedDay(newDay)
    setSelectedDate(getDateFromDay(newDay))
  }

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    setSelectedDay(getDayFromDate(newDate))
  }

  // Get personnel for selected day
  const getPersonnel = () => {
    if (!scheduleData[selectedDay]) {
      return { analysts: [], teamLeaders: [] }
    }
    return scheduleData[selectedDay]
  }

  // Set initial day based on current date
  useEffect(() => {
    const currentDay = getDayFromDate(selectedDate)
    setSelectedDay(currentDay)
  }, [])

  const personnel = getPersonnel()

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
  const getPersonImage = (name, isTeamLeader = false) => {
    try {
      const cleanName = isTeamLeader ? name.replace('ENGR. ', '').replace(', CPE', '') : name;
      const imageName = cleanName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_');
      return `/images/${isTeamLeader ? 'team_leaders' : 'analysts'}/${imageName}.jpg`;
    } catch (error) {
      logger.error('Error getting image path:', error);
      return null;
    }
  }

  // Component for profile picture with fallback
  const ProfilePicture = ({ name, isTeamLeader }) => {
    const [showInitials, setShowInitials] = useState(false);
    const imagePath = getPersonImage(name, isTeamLeader);
    const initials = getInitials(isTeamLeader ? name.replace('ENGR. ', '') : name);
    const gradientClass = isTeamLeader ? 
      'from-yellow-500/20 to-orange-500/20' : 
      'from-cyan-500/20 to-blue-500/20';
    const textColorClass = isTeamLeader ? 'text-yellow-400' : 'text-cyan-400';

    return (
      <div className={`relative w-24 h-24 bg-gradient-to-br ${gradientClass} rounded-full mb-3 overflow-hidden`}>
        {!showInitials && (
          <div className="relative w-full h-full">
            <Image
              src={imagePath}
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
          <div className={`flex items-center justify-center w-full h-full ${textColorClass} font-bold text-xl`}>
            {initials}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!user) return

    // Use the selected date for fetching records
    const startDate = new Date(selectedDate)
    startDate.setHours(0, 0, 0, 0) // Start of day
    const endDate = new Date(selectedDate)
    endDate.setHours(23, 59, 59, 999) // End of day

    // Create a query for all records within the selected date
    const unsubscribeFn = listenToAttendanceRecords(
      '', // Pass empty string to get all records
      startDate,
      endDate,
      (records) => {
        // Sort records by name and shift
        const sortedRecords = [...records].sort((a, b) => {
          // First sort by shift
          const shiftOrder = { morning: 1, afternoon: 2, graveyard: 3 }
          const shiftCompare = shiftOrder[a.shift] - shiftOrder[b.shift]
          if (shiftCompare !== 0) return shiftCompare
          
          // Then by name if shifts are equal
          if (a.userName && b.userName) {
            return a.userName.localeCompare(b.userName)
          }
          return 0
        })
        setAttendanceRecords(sortedRecords)
      }
    )

    setUnsubscribe(() => unsubscribeFn)

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, selectedDate]) // Update when selectedDate changes

  // Function to export attendance records
  const exportAttendanceRecords = () => {
    // Create CSV content
    const headers = ['Name', 'Date', 'Clock In', 'Clock Out', 'Shift', 'Status']
    const records = getFilteredAndSortedRecords()
    const csvContent = [
      headers.join(','),
      ...records.map(record => {
        const status = getStatusText(record)
        const clockInTime = record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : ''
        const clockOutTime = record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : ''
        return [
          record.userName,
          new Date(record.date).toLocaleDateString(),
          clockInTime,
          clockOutTime,
          record.shift,
          status
        ].join(',')
      })
    ].join('\n')

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_records_${selectedDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Function to handle sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Function to filter and sort records
  const getFilteredAndSortedRecords = () => {
    return attendanceRecords
      .filter(record => {
        if (!record) return false
        
        const nameMatch = filterName === '' || 
          (record.userName && record.userName.toLowerCase().includes(filterName.toLowerCase()))
        const shiftMatch = filterShift === 'all' || record.shift === filterShift
        const statusMatch = filterStatus === 'all' || 
          (filterStatus === 'present' && record.clockIn) ||
          (filterStatus === 'absent' && !record.clockIn)
        
        // Add role filter
        const roleMatch = filterRole === 'all' || 
          (filterRole === 'specialist' && record.userName?.includes('ENGR.')) ||
          (filterRole === 'analyst' && !record.userName?.includes('ENGR.') && !record.userName?.includes('Trainee') && record.role === 'analyst') ||
          (filterRole === 'trainee' && (record.userName?.includes('Trainee') || record.role === 'trainee'))
        
        return nameMatch && shiftMatch && statusMatch && roleMatch
      })
      .sort((a, b) => {
        if (!a || !b) return 0
        
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]
        
        // Handle date comparisons
        if (sortConfig.key === 'date' || sortConfig.key === 'clockIn' || sortConfig.key === 'clockOut') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }

  // Function to get status badge color
  const getStatusBadgeClass = (record) => {
    if (record.clockIn && record.clockOut) {
      return 'bg-green-500/20 text-green-400'
    } else if (record.clockIn) {
      return 'bg-yellow-500/20 text-yellow-400'
    } else {
      return 'bg-red-500/20 text-red-400'
    }
  }

  // Function to get status text
  const getStatusText = (record) => {
    if (record.clockIn && record.clockOut) {
      return 'Completed'
    } else if (record.clockIn) {
      return 'On Duty'
    } else {
      return 'Absent'
    }
  }

  // Function to get role badge color
  const getRoleBadgeClass = (record) => {
    switch (record.role) {
      case 'specialist':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'trainee':
        return 'bg-blue-500/20 text-blue-400';
      case 'analyst':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  // Function to get role text
  const getRoleText = (record) => {
    switch (record.role) {
      case 'specialist':
        return 'Team Leader';
      case 'trainee':
        return 'SOC Trainee';
      case 'analyst':
        return 'Analyst';
      default:
        return 'Other';
    }
  }

  // Function to check if user has clocked in for a specific shift
  const hasClockedIn = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
      record.clockIn !== null
    )
  }

  // Function to check if user has clocked out for a specific shift
  const hasClockedOut = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
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

  const handleActionClick = (action, leaderName) => {
    setPendingAction({ type: action, leaderName })
    setShowConfirmModal(true)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return

    const { type, leaderName } = pendingAction
    if (type === 'clockIn') {
      await handleClockIn()
    } else {
      await handleClockOut()
    }
    setShowConfirmModal(false)
    setPendingAction(null)
  }

  // Update the shifts array with PH time
  const shifts = [
    { value: 'morning', label: 'Morning Shift (6 AM - 2 PM)' },
    { value: 'afternoon', label: 'Afternoon Shift (2 PM - 10 PM)' },
    { value: 'graveyard', label: 'Graveyard Shift (10 PM - 6 AM)' }
  ]

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-4 font-mono">
            {isViewOnly ? 'Attendance Records' : 'Team Leader Attendance Dashboard'}
          </h1>

          {/* View Toggle - Only show for non-restricted roles */}
          {!isViewOnly && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSelectedView('dashboard')}
                className={selectedView === 'dashboard'
                  ? 'px-4 py-2 rounded-lg font-mono bg-yellow-400 text-gray-900'
                  : 'px-4 py-2 rounded-lg font-mono bg-gray-800 text-yellow-400 hover:bg-gray-700'}
              >
                Dashboard View
              </button>
              <button
                onClick={() => setSelectedView('records')}
                className={selectedView === 'records'
                  ? 'px-4 py-2 rounded-lg font-mono bg-yellow-400 text-gray-900'
                  : 'px-4 py-2 rounded-lg font-mono bg-gray-800 text-yellow-400 hover:bg-gray-700'}
              >
                Attendance Records
              </button>
            </div>
          )}

          {(!isViewOnly && selectedView === 'dashboard') ? (
            <>
              {/* Existing dashboard content */}
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <select
                  value={selectedDay}
                  onChange={handleDayChange}
                  className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                />
              </div>

              {/* Current Schedule Info */}
              <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-yellow-500/20">
                <h3 className="text-yellow-400 font-mono mb-2">Current Schedule:</h3>
                <div className="text-gray-300 font-mono space-y-1">
                  <p>Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Team Leaders Section */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-yellow-400 mb-4 font-mono">Team Leaders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {personnel.teamLeaders.map((leader, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
                      <div className="flex flex-col items-center">
                        <ProfilePicture name={leader} isTeamLeader={true} />
                        <h3 className="text-gray-300 font-mono text-center mb-2">{leader}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleActionClick('clockIn', leader)}
                            disabled={loading}
                            className="px-3 py-1 text-sm font-mono rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Clock In
                          </button>
                          <button
                            onClick={() => handleActionClick('clockOut', leader)}
                            disabled={loading}
                            className="px-3 py-1 text-sm font-mono rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Clock Out
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Modal */}
              {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 p-6 rounded-lg border border-yellow-500/20 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 font-mono">
                      Confirm {pendingAction?.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                    </h3>
                    <p className="text-gray-300 mb-6 font-mono">
                      Are you sure you want to {pendingAction?.type === 'clockIn' ? 'clock in' : 'clock out'} for {pendingAction?.leaderName}?
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
            </>
          ) : (
            <>
              {/* Attendance Records View */}
              <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
                <div className="flex flex-col space-y-4 mb-6">
                  {/* Date selector and Export */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-yellow-400 font-mono block">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={exportAttendanceRecords}
                        className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-mono hover:bg-yellow-300 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Records
                      </button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-yellow-400 font-mono block">Search by Name</label>
                      <input
                        type="text"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        placeholder="Search name..."
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-yellow-400 font-mono block">Filter by Role</label>
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      >
                        <option value="all">All Roles</option>
                        <option value="specialist">Specialists</option>
                        <option value="analyst">Analysts</option>
                        <option value="trainee">Trainees</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-yellow-400 font-mono block">Filter by Shift</label>
                      <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      >
                        <option value="all">All Shifts</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="graveyard">Graveyard</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-yellow-400 font-mono block">Filter by Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      >
                        <option value="all">All Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-yellow-500/20">
                        <th 
                          className="p-4 text-yellow-400 font-mono cursor-pointer hover:bg-gray-800/50"
                          onClick={() => handleSort('userName')}
                        >
                          Name {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="p-4 text-yellow-400 font-mono cursor-pointer hover:bg-gray-800/50"
                          onClick={() => handleSort('date')}
                        >
                          Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="p-4 text-yellow-400 font-mono cursor-pointer hover:bg-gray-800/50"
                          onClick={() => handleSort('clockIn')}
                        >
                          Clock In {sortConfig.key === 'clockIn' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="p-4 text-yellow-400 font-mono cursor-pointer hover:bg-gray-800/50"
                          onClick={() => handleSort('clockOut')}
                        >
                          Clock Out {sortConfig.key === 'clockOut' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="p-4 text-yellow-400 font-mono cursor-pointer hover:bg-gray-800/50"
                          onClick={() => handleSort('shift')}
                        >
                          Shift {sortConfig.key === 'shift' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4 text-yellow-400 font-mono">Role</th>
                        <th className="p-4 text-yellow-400 font-mono">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAndSortedRecords().map((record, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-yellow-500/10 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="p-4 text-gray-300 font-mono">{record.userName}</td>
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
                          <td className="p-4 text-gray-300 font-mono capitalize">{record.shift}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-mono ${getRoleBadgeClass(record)}`}>
                              {getRoleText(record)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-mono ${getStatusBadgeClass(record)}`}>
                              {getStatusText(record)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 