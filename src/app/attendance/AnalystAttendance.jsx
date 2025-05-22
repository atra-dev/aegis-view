'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { auth, firedb } from '@/services/firebase'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { 
  clockIn, 
  clockOut, 
  listenToAttendanceRecords 
} from '@/services/management'
import { toast } from 'react-hot-toast'
import { logger } from '@/utils/logger'

export default function AnalystAttendance() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDay, setSelectedDay] = useState('monday')
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  // Updated schedule data with day-specific schedules
  const scheduleData = {
    monday: {
      morning: {
        analysts: [
          'Alcontin, Joshua M.',
          'Diaz, Relyn Ann L.',
          'Dusaran, John Paul E.',
          'Angcos, Mark Joseph E.',
          'Manrique, Jeanne Leigh F.',
          'Diano, Hitler B.',
          'Esteban John Mark',
          'Jories Anton V. Condat'
        ]
      },
      afternoon: {
        analysts: [
          'Daquila, Eric John M.',
          'Marmolejo, Noel Pio N.',
          'Miranda, Jaylord M.',
          'Balauro, Bernard P.',
          'Borce, Prince Ariel',
          'Cunanan, Kim Gerard',
          'Vetriolo, Daniel Jr.'
        ]
      },
      graveyard: {
        analysts: [
          'Chua, Hillary Gabriel G.',
          'Cayao, Leomyr D.',
          'Martinez, Mart Angelo G.',
          'Uson, John Clifford B.'
        ]
      }
    },
    tuesday: {
      morning: {
        analysts: [
          'Alcontin, Joshua M.',
          'Dusaran, John Paul E.',
          'Escamilla, Jan Denise J.',
          'Manrique, Jeanne Leigh F.',
          'Fernandez, Joanalyn Y.',
          'Jories Anton V. Condat'
        ]
      },
      afternoon: {
        analysts: [
          'Lape, Mary Rose O.',
          'Balauro, Bernard P.',
          'Miranda, Jaylord M.',
          'Suplico, Adrian D.',
          'Borce, Prince Ariel',
          'Cunanan, Kim Gerard'
        ]
      },
      graveyard: {
        analysts: [
          'Daquila, Eric John M.',
          'Marmolejo, Noel Pio N.',
          'Vetriolo, Daniel Jr.'
        ]
      }
    },
    wednesday: {
        morning: {
          analysts: [
            'Diaz, Relyn Ann L.',
            'Chua, Hillary Gabriel G.',
            'Cayao, Leomyr D.',
            'Angcos, Mark Joseph E.',
            'Martinez, Mart Angelo G.',
            'Uson, John Clifford B.'
          ]
        },
        afternoon: {
          analysts: [
            'Lape, Mary Rose O.',
            'Escamilla, Jan Denise J.',
            'Fernandez, Jonalyn Y.',
            'Diano, Hitler B.',
            'Esteban, John Mark'
          ]
        },
        graveyard: {
          analysts: [
            'Balauro, Bernard P.',
            'Miranda, Jaylord M.',
            'Borce, Prince Arial',
            'Cunanan, Kim Gerard'
          ]
        }
    },
    thursday: {
        morning: {
          analysts: [
            'Daquila, Eric John M.',
            'Manrique, Jeanne Leigh F.',
            'Cayao, Leomyr D.',
            'Marmolejo, Noel Pio N.',
            'Martinez, Mart Angelo G.',
            'Uson, John Clifford B.',
            'Vetriolo, Daniel Jr.'
          ]
        },
        afternoon: {
          analysts: [
            'Alcontin, Joshua M.',
            'Diaz, Relyn Ann L.',
            'Dusaran, John Paul E.',
            'Angcos, Mark Joseph E.',
            'Suplico, Adrian D.',
            'Diano, Hitler B.',
            'Esteban, John Mark',
            'Jories Anton V. Condat'
          ]
        },
        graveyard: {
          analysts: [
            'Lape, Mary Rose O.',
            'Escamilla, Jan Denise J.',
            'Chua, Hillary Gabriel G.'
          ]
        }
    },
    friday: {
        morning: {
          analysts: [
            'Daquila, Eric John M.',
            'Balauro, Bernard P.',
            'Marmolejo, Noel Pio N.',
            'Miranda, Jaylord M.',
            'Borce, Prince Ariel',
            'Cunanan, Kim Gerard',
            'Vetriolo, Daniel Jr.',
            'Diano, Hitler B.'
          ]
        },
        afternoon: {
          analysts: [
            'Alcontin, Joshua M.',
            'Dusaran, John Paul E.',
            'Manrique, Jeanne Leigh F.',
            'Jories Anton V. Condat',
            'Fernandez, Joanalyn Y.'
          ]
        },
        graveyard: {
          analysts: [
            'Diaz, Relyn Ann L.',
            'Angcos, Mark Joseph E.',
            'Suplico, Adrian D.',
            'Esteban, John Mark'
          ]
        }
    },
    saturday: {
        morning: {
          analysts: [
            'Lape, Mary Rose O.',
            'Balauro, Bernard P.',
            'Escamilla, Jan Denise J.',
            'Miranda, Jaylord M.',
            'Borce, Prince Ariel',
            'Cunanan, Kim Gerard'
          ]
        },
        afternoon: {
          analysts: [
            'Chua, Hillary Gabriel G.',
            'Fernandez, Joanalyn Y.',
            'Cayao, Leomyr D.',
            'Suplico, Adrian D.',
            'Martinez, Mart Angelo G.',
            'Uson, John Clifford B.'
          ]
        },
        graveyard: {
          analysts: [
            'Alcontin, Joshua M.',
            'Dusaran, John Paul E.',
            'Manrique, Jeanne Leigh F.',
            'Jories Anton V. Condat'
          ]  
        }
    },
    sunday: {
        morning: {
          analysts: [
            'Diaz, Relyn Ann L.',
            'Angcos, Mark Joseph E.',
            'Diano, Hitler B.',
            'Esteban, John Mark'
          ],
        
        },
        afternoon: {
          analysts: [
            'Chua, Hillary Gabriel G.',
            'Daquila, Eric John M.',
            'Cayao, Leomyr D.',
            'Marmolejo, Noel Pio N.',
            'Suplico, Adrian D.',
            'Martinez, Mart Angelo G.',
            'Uson, John Clifford B.',
            'Vetriolo, Daniel Jr.'
          ]
        },
        graveyard: {
          analysts: [
            'Fernandez, Joanalyn Y.',
            'Lape, Mary Rose O.',
            'Escamilla, Jan Denise J.'
          ]  
        }
    }
  }

  // Function to get current shift based on PH time
  const getCurrentShift = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const hour = phTime.getHours()
    if (hour >= 6 && hour < 14) return 'morning'
    if (hour >= 14 && hour < 22) return 'afternoon'
    return 'graveyard'
  }

  // Get the date of Monday (start) of the current week in PH time
  const getStartOfWeek = (date) => {
    const phTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const day = phTime.getDay()
    const diff = phTime.getDate() - day + (day === 0 ? -6 : 1) // Adjust when Sunday
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

  // Filter analysts and team leaders based on selected shift and day
  const getFilteredPersonnel = () => {
    if (!scheduleData[selectedDay]) {
      return { analysts: [] }
    }

    if (selectedShift === 'all') {
      return {
        analysts: [...new Set([
          ...(scheduleData[selectedDay].morning?.analysts || []),
          ...(scheduleData[selectedDay].afternoon?.analysts || []),
          ...(scheduleData[selectedDay].graveyard?.analysts || [])
        ])]
      }
    }

    // Map the selected shift to the correct key in scheduleData
    const shiftMapping = {
      'morning': 'morning',
      'afternoon': 'afternoon',
      'graveyard': 'graveyard'
    }

    const mappedShift = shiftMapping[selectedShift]
    if (!mappedShift || !scheduleData[selectedDay][mappedShift]) {
      return { analysts: [] }
    }

    return {
      analysts: scheduleData[selectedDay][mappedShift].analysts || []
    }
  }

  // Set initial shift and day based on current time and date
  useEffect(() => {
    const currentDay = getDayFromDate(selectedDate)
    setSelectedShift(getCurrentShift())
    setSelectedDay(currentDay)
  }, [])

  const filteredPersonnel = getFilteredPersonnel()

  // Function to generate initials from name
  const getInitials = (name) => {
    return name
      .split(',')[0] // Take only the last name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  // Function to get image path for a person
  const getPersonImage = (name, isTeamLeader = false) => {
    try {
      // Remove ENGR. prefix and CPE suffix for team leaders
      const cleanName = isTeamLeader ? name.replace('ENGR. ', '').replace(', CPE', '') : name;
      // Convert name to URL-friendly format (single underscore, no extra spaces)
      const imageName = cleanName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_') // Replace one or more spaces with single underscore
        .replace(/[^a-z0-9_]/g, '') // Remove any character that's not a letter, number or underscore
        .replace(/_+/g, '_'); // Replace multiple underscores with single underscore
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

  // Function to get the attendance dates for graveyard shift
  const getGraveyardShiftDates = () => {
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const hour = phTime.getHours()
    
    // If time is between 12 AM to 6 AM, use previous day's date
    if (hour >= 0 && hour < 6) {
      const prevDay = new Date(phTime)
      prevDay.setDate(phTime.getDate() - 1)
      return {
        startDate: prevDay.toISOString().split('T')[0],
        endDate: phTime.toISOString().split('T')[0]
      }
    }
    
    // If time is between 10 PM to 11:59 PM, use current date
    return {
      startDate: phTime.toISOString().split('T')[0],
      endDate: phTime.toISOString().split('T')[0]
    }
  }

  // Function to check if user has clocked in for a specific shift
  const hasClockedIn = () => {
    if (!selectedShift) return false
    
    if (selectedShift === 'graveyard') {
      const { startDate, endDate } = getGraveyardShiftDates()
      return attendanceRecords.some(record => 
        (record.date === startDate || record.date === endDate) && 
        record.userId === user?.uid &&
        record.shift === 'graveyard' &&
        record.clockIn !== null
      )
    }
    
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
      record.shift === selectedShift &&
      record.clockIn !== null
    )
  }

  // Function to check if user has clocked out for a specific shift
  const hasClockedOut = () => {
    if (!selectedShift) return false
    
    if (selectedShift === 'graveyard') {
      const { startDate, endDate } = getGraveyardShiftDates()
      return attendanceRecords.some(record => 
        (record.date === startDate || record.date === endDate) && 
        record.userId === user?.uid &&
        record.shift === 'graveyard' &&
        record.clockOut !== null
      )
    }
    
    const phTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const today = phTime.toISOString().split('T')[0]
    return attendanceRecords.some(record => 
      record.date === today && 
      record.userId === user?.uid &&
      record.shift === selectedShift &&
      record.clockOut !== null
    )
  }

  // Function to normalize names for comparison
  const normalizeNames = (name1, name2) => {
    logger.info('=== Name Matching Debug ===');
    logger.info('Display Name:', name1);
    logger.info('Analyst Name:', name2);

    // Helper function to clean and standardize a name
    const cleanName = (name) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.,]/g, '')
        .trim();
    };

    // Helper function to remove middle initials
    const removeMiddleInitials = (name) => {
      return name.split(' ')
        .filter(part => part.length > 1)
        .join(' ');
    };

    // Clean both names
    const clean1 = cleanName(name1);
    const clean2 = cleanName(name2);
    
    logger.info('Cleaned names:', { clean1, clean2 });

    // Direct match check
    if (clean1 === clean2) {
      logger.info('Direct match found!');
      return true;
    }

    // Handle "Lastname, Firstname Middle" format
    if (name2.includes(',')) {
      const [lastName, firstMiddle] = name2.split(',').map(part => cleanName(part));
      const [firstName, ...middleParts] = firstMiddle.trim().split(' ');
      const middleName = middleParts.join(' ');
      
      logger.info('Parsed name parts:', {
        lastName,
        firstName,
        middleName
      });

      // Create different combinations to test, including versions without middle initials
      const combinations = [
        `${firstName} ${middleName} ${lastName}`,
        `${firstName} ${lastName}`,
        `${lastName} ${firstName} ${middleName}`,
        `${firstName} ${removeMiddleInitials(middleName)} ${lastName}`,
        `${lastName} ${firstName} ${removeMiddleInitials(middleName)}`
      ].map(cleanName);

      // Also add combinations without middle name
      if (middleName) {
        combinations.push(
          cleanName(`${firstName} ${lastName}`),
          cleanName(`${lastName} ${firstName}`)
        );
      }

      logger.info('Testing combinations:', combinations);

      // Check if any combination matches the display name or its version without middle initials
      const displayNameWithoutMiddle = removeMiddleInitials(clean1);
      const match = combinations.some(combo => {
        const comboWithoutMiddle = removeMiddleInitials(combo);
        logger.info(`Comparing "${combo}" with "${clean1}"`);
        logger.info(`Also comparing without middle: "${comboWithoutMiddle}" with "${displayNameWithoutMiddle}"`);
        return combo === clean1 || comboWithoutMiddle === displayNameWithoutMiddle;
      });

      logger.info('Match found?', match);
      return match;
    }

    // If no comma in name2, try reverse check
    if (name1.includes(',')) {
      return normalizeNames(name2, name1);
    }

    logger.info('No match found');
    return false;
  };

  const handleClockIn = async (analystName) => {
    logger.info('=== Clock In Attempt ===');
    logger.info('User:', user);
    logger.info('Selected Shift:', selectedShift);
    logger.info('Analyst Name:', analystName);

    if (!selectedShift) {
      toast.error('Please select a shift')
      return
    }

    const isMatch = normalizeNames(user?.displayName || '', analystName);
    logger.info('Name match result:', isMatch);

    if (!isMatch) {
      toast.error('You can only clock in for yourself')
      return
    }

    setLoading(true)
    try {
      const result = await clockIn(user.uid, analystName, selectedShift)
      logger.info('Clock in result:', result);
      if (result.success) {
        toast.success('Successfully clocked in')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      logger.error('Clock in error:', error);
      toast.error('Failed to clock in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async (analystName) => {
    logger.info('=== Clock Out Attempt ===');
    logger.info('User:', user);
    logger.info('Selected Shift:', selectedShift);
    logger.info('Analyst Name:', analystName);

    if (!selectedShift) {
      toast.error('Please select a shift')
      return
    }

    const isMatch = normalizeNames(user?.displayName || '', analystName);
    logger.info('Name match result:', isMatch);

    if (!isMatch) {
      toast.error('You can only clock out for yourself')
      return
    }

    setLoading(true)
    try {
      const result = await clockOut(user.uid, analystName, selectedShift)
      logger.info('Clock out result:', result);
      if (result.success) {
        toast.success('Successfully clocked out')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      logger.error('Clock out error:', error);
      toast.error('Failed to clock out')
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = (action, analystName) => {
    setPendingAction({ type: action, analystName })
    setShowConfirmModal(true)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return

    const { type, analystName } = pendingAction
    if (type === 'clockIn') {
      await handleClockIn(analystName)
    } else {
      await handleClockOut(analystName)
    }
    setShowConfirmModal(false)
    setPendingAction(null)
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4 font-mono">
            SOC Analyst Attendance
          </h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <select
              value={selectedDay}
              onChange={handleDayChange}
              className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning (6AM-2PM)</option>
              <option value="afternoon">Afternoon (2PM-10PM)</option>
              <option value="graveyard">Graveyard (10PM-6AM)</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
            />
          </div>

          {/* Current Schedule Info */}
          <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-cyan-500/20">
            <h3 className="text-yellow-400 font-mono mb-2">Current Schedule:</h3>
            <div className="text-gray-300 font-mono space-y-1">
              <p>Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Shift: {
                selectedShift === 'all' ? 'All Shifts' :
                selectedShift === 'morning' ? 'Morning (6AM-2PM)' :
                selectedShift === 'afternoon' ? 'Afternoon (2PM-10PM)' :
                'Graveyard (10PM-6AM)'
              }</p>
            </div>
          </div>

          {/* SOC Analysts Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-yellow-400 mb-4 font-mono">SOC Analysts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPersonnel.analysts.map((analyst, index) => {
                const isUserMatch = normalizeNames(user?.displayName || '', analyst)
                return (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
                    <div className="flex flex-col items-center">
                      <ProfilePicture name={analyst} isTeamLeader={false} />
                      <h3 className="text-gray-300 font-mono text-center mb-2">{analyst}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActionClick('clockIn', analyst)}
                          className={`px-3 py-1 text-sm font-mono rounded-full ${
                            isUserMatch 
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!isUserMatch}
                        >
                          Clock In
                        </button>
                        <button
                          onClick={() => handleActionClick('clockOut', analyst)}
                          className={`px-3 py-1 text-sm font-mono rounded-full ${
                            isUserMatch 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!isUserMatch}
                        >
                          Clock Out
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-cyan-500/20 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 font-mono">
              Confirm {pendingAction?.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
            </h3>
            <p className="text-gray-300 mb-6 font-mono">
              Are you sure you want to {pendingAction?.type === 'clockIn' ? 'clock in' : 'clock out'} for {pendingAction?.analystName}?
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
