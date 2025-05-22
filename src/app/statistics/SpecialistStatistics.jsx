"use client"
import { useState, useEffect, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { listenToAlerts, listenToATIPEntries, getATIPStats, addThreatVulnerability, addThreatDetection, listenToThreatVulnerabilities, listenToThreatDetections, deleteThreatVulnerability, deleteThreatDetection } from '@/services/management'
import { toast } from 'react-hot-toast'
import { AnimatePresence, motion } from "framer-motion"
import { logger } from '@/utils/logger'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
)

export default function SpecialistStatistics() {
  const [tenant, setTenant] = useState('all')
  const [timeRange, setTimeRange] = useState('1 Day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [entries, setEntries] = useState([])
  const [isFirebaseError, setIsFirebaseError] = useState(false)
  const [showThreatVulnTable, setShowThreatVulnTable] = useState(false)
  const [showThreatDetTable, setShowThreatDetTable] = useState(false)
  const [showThreatVulnForm, setShowThreatVulnForm] = useState(false)
  const [showThreatDetForm, setShowThreatDetForm] = useState(false)
  const [newThreatVulnData, setNewThreatVulnData] = useState({
    tenant: '',
    count: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [newThreatDetData, setNewThreatDetData] = useState({
    tenant: '',
    count: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [isAddingThreatVuln, setIsAddingThreatVuln] = useState(false)
  const [isAddingThreatDet, setIsAddingThreatDet] = useState(false)
  const [deletingThreatVulnIds, setDeletingThreatVulnIds] = useState(new Set())
  const [deletingThreatDetIds, setDeletingThreatDetIds] = useState(new Set())
  const [threatVulnCurrentPage, setThreatVulnCurrentPage] = useState(0)
  const [threatDetCurrentPage, setThreatDetCurrentPage] = useState(0)
  const [threatVulnData, setThreatVulnData] = useState([])
  const [threatDetData, setThreatDetData] = useState([])
  const [threatVulnUnsubscribe, setThreatVulnUnsubscribe] = useState(null)
  const [threatDetUnsubscribe, setThreatDetUnsubscribe] = useState(null)
  const [stats, setStats] = useState({
    totalAlerts: 0,
    truePositives: 0,
    falsePositives: 0,
    toBeConfirmed: 0,
    atipDetections: 0,
    threatVulnerabilities: 0,
    threatDetections: 0
  })
  const [showDeleteThreatVulnModal, setShowDeleteThreatVulnModal] = useState(false)
  const [showDeleteThreatDetModal, setShowDeleteThreatDetModal] = useState(false)
  const [threatVulnToDelete, setThreatVulnToDelete] = useState(null)
  const [threatDetToDelete, setThreatDetToDelete] = useState(null)
  const [isDeletingThreatVuln, setIsDeletingThreatVuln] = useState(false)
  const [isDeletingThreatDet, setIsDeletingThreatDet] = useState(false)
  const [threatVulnLoading, setThreatVulnLoading] = useState(true)
  const [threatDetLoading, setThreatDetLoading] = useState(true)
  const [showFullScreenChart, setShowFullScreenChart] = useState(null)
  const [fullScreenChartData, setFullScreenChartData] = useState(null)
  const [fullScreenChartTitle, setFullScreenChartTitle] = useState('')

  // Get unique tenants from alerts
  const tenants = useMemo(() => {
    const uniqueTenants = new Set(alerts.map(alert => alert.tenant).filter(Boolean))
    return Array.from(uniqueTenants)
  }, [alerts])

  // Get date range based on selected time range
  const getDateRange = () => {
    const today = new Date()
    
    switch (timeRange) {
      case '1 Day':
        const selectedDateObj = new Date(selectedDate)
        selectedDateObj.setHours(0, 0, 0, 0)
        const endOfDay = new Date(selectedDateObj)
        endOfDay.setHours(23, 59, 59, 999)
        return {
          startDate: selectedDateObj.toISOString(),
          endDate: endOfDay.toISOString()
        }
      case 'Weekly':
        const weekAgo = new Date()
        weekAgo.setDate(today.getDate() - 6)
        weekAgo.setHours(0, 0, 0, 0)
        today.setHours(23, 59, 59, 999)
        return {
          startDate: weekAgo.toISOString(),
          endDate: today.toISOString()
        }
      case '1 Month':
        const [year, month] = selectedMonth.split('-')
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        return {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }
      default:
        const defaultDate = new Date()
        defaultDate.setHours(0, 0, 0, 0)
        const defaultEnd = new Date()
        defaultEnd.setHours(23, 59, 59, 999)
        return {
          startDate: defaultDate.toISOString(),
          endDate: defaultEnd.toISOString()
        }
    }
  }

  // Create empty chart data for other charts
  const createEmptyChartData = () => {
    const { startDate, endDate } = getDateRange()
    const dates = []
    const currentDate = new Date(startDate)
    
    while (currentDate < new Date(endDate)) {
      dates.push(currentDate.toLocaleDateString())
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // If no data points, add today's date
    if (dates.length === 0) {
      const today = new Date(startDate)
      dates.push(today.toLocaleDateString())
    }

    return {
      labels: dates,
      datasets: [
        {
          label: 'No Data Available',
          data: dates.map(() => 0),
          borderColor: 'rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          pointBackgroundColor: 'rgba(255, 255, 255, 0.2)',
          fill: false,
          spanGaps: true
        }
      ]
    }
  }

  // Process alerts data for charts with improved date handling
  const processChartData = () => {
    const { startDate, endDate } = getDateRange()
    
    const filteredAlerts = alerts.filter(alert => {
      if (!alert.timestamp) return false
      const alertDate = new Date(alert.timestamp)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return alertDate >= start && alertDate <= end
    })

    // Create a map of all dates in the range
    const dateMap = {}
    const currentDate = new Date(startDate)
    const endDateTime = new Date(endDate)
    
    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = { total: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in the actual data
    filteredAlerts.forEach(alert => {
      const date = new Date(alert.timestamp).toLocaleDateString()
      if (dateMap[date]) {
        dateMap[date].total++
      }
    })

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = { total: 0 }
    }

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Total Alerts',
          data: sortedDates.map(date => dateMap[date]?.total || 0),
          borderColor: 'rgb(34, 211, 238)',
          backgroundColor: 'rgba(34, 211, 238, 0.5)',
          pointBackgroundColor: 'rgb(34, 211, 238)',
          fill: false,
          spanGaps: true
        }
      ]
    }
  }

  // Calculate total stats
  const calculateStats = () => {
    const { startDate, endDate } = getDateRange()
    logger.info('Calculating stats for range:', { startDate: startDate, endDate: endDate })
    
    const filteredAlerts = alerts.filter(alert => {
      if (!alert.timestamp) return false
      const alertDate = new Date(alert.timestamp)
      return alertDate >= new Date(startDate) && alertDate <= new Date(endDate)
    })

    logger.info('Stats - Filtered Alerts:', filteredAlerts.length)

    // Calculate SOC detections (total alerts)
    const totalAlerts = filteredAlerts.length

    // Calculate verification status counts
    const truePositives = filteredAlerts.filter(alert => alert.verificationStatus === 'True Positive').length
    const falsePositives = filteredAlerts.filter(alert => alert.verificationStatus === 'False Positive').length
    const toBeConfirmed = filteredAlerts.filter(alert => 
      !alert.verificationStatus || alert.verificationStatus === 'To Be Confirmed'
    ).length

    // Helper function to map display names to stored tenant names
    const mapTenantName = (displayName) => {
      switch (displayName) {
        case 'SiyCha Group of Companies': return 'SiyCha';
        case 'Project Chiron': return 'MWELL';
        case 'Project Hunt': return 'MPIW';
        case 'Project NIKI': return 'NIKI';
        case 'Project Atlas': return 'Cantilan';
        default: return displayName;
      }
    }

    // Calculate total connection attempts from malicious traffic data
    const totalConnectionAttempts = entries.reduce((sum, entry) => {
      const entryDate = new Date(entry.date)
      logger.info('Processing entry:', {
        date: entry.date,
        attempts: entry.attempts,
        entryDate: entryDate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isInRange: entryDate >= new Date(startDate) && entryDate <= new Date(endDate)
      });
      if (entryDate >= new Date(startDate) && entryDate <= new Date(endDate)) {
        // Check if entry matches the tenant filter
        const matchesTenant = tenant === 'all' || entry.tenant === mapTenantName(tenant);
        if (matchesTenant) {
          return sum + (parseInt(entry.attempts) || 0);
        }
      }
      return sum;
    }, 0);

    logger.info('Total Connection Attempts:', totalConnectionAttempts);
    logger.info('Entries data:', entries);

    const stats = {
      totalAlerts,
      truePositives,
      falsePositives,
      toBeConfirmed,
      atipDetections: totalConnectionAttempts,
      threatVulnerabilities: 'N/A',
      threatDetections: 'N/A'
    }
    
    logger.info('Calculated Stats:', stats)
    return stats
  }

  // Process verification status data for charts with improved date handling
  const processVerificationData = () => {
    const { startDate, endDate } = getDateRange()
    
    const filteredAlerts = alerts.filter(alert => {
      if (!alert.timestamp) return false
      const alertDate = new Date(alert.timestamp)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return alertDate >= start && alertDate <= end
    })

    const dateMap = {}
    const currentDate = new Date(startDate)
    const endDateTime = new Date(endDate)
    
    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = {
        truePositive: 0,
        falsePositive: 0,
        toBeConfirmed: 0
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    filteredAlerts.forEach(alert => {
      const date = new Date(alert.timestamp).toLocaleDateString()
      if (dateMap[date]) {
        if (alert.verificationStatus === 'True Positive') {
          dateMap[date].truePositive++
        } else if (alert.verificationStatus === 'False Positive') {
          dateMap[date].falsePositive++
        } else {
          dateMap[date].toBeConfirmed++
        }
      }
    })

    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = {
        truePositive: 0,
        falsePositive: 0,
        toBeConfirmed: 0
      }
    }

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'True Positives',
          data: sortedDates.map(date => dateMap[date]?.truePositive || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          pointBackgroundColor: 'rgb(34, 197, 94)',
          fill: false,
          spanGaps: true
        },
        {
          label: 'False Positives',
          data: sortedDates.map(date => dateMap[date]?.falsePositive || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          pointBackgroundColor: 'rgb(239, 68, 68)',
          fill: false,
          spanGaps: true
        },
        {
          label: 'To Be Confirmed',
          data: sortedDates.map(date => dateMap[date]?.toBeConfirmed || 0),
          borderColor: 'rgb(234, 179, 8)',
          backgroundColor: 'rgba(234, 179, 8, 0.5)',
          pointBackgroundColor: 'rgb(234, 179, 8)',
          fill: false,
          spanGaps: true
        }
      ]
    }
  }

  // Process malicious domains data for charts
  const processMaliciousDomainsData = () => {
    const { startDate, endDate } = getDateRange()
    
    // Filter entries by date range and tenant
    const filteredEntries = entries.filter(entry => {
      if (!entry || !entry.date) return false
      try {
        const entryDate = new Date(entry.date)
        if (isNaN(entryDate.getTime())) return false
        const start = new Date(startDate)
        const end = new Date(endDate)
        const isInDateRange = entryDate >= start && entryDate <= end
        
        // Improved tenant matching with variations
        const matchesTenant = tenant === 'all' || 
          (entry.tenant && (
            entry.tenant === tenant ||
            (tenant === 'MWELL' && entry.tenant === 'Project Chiron') ||
            (tenant === 'SiyCha Group of Companies' && (entry.tenant === 'Project Orion' || entry.tenant === 'SiyCha')) ||
            (tenant === 'MPIW' && entry.tenant === 'Project Hunt') ||
            (tenant === 'NIKI' && entry.tenant === 'Project NIKI') ||
            (tenant === 'Cantilan' && entry.tenant === 'Project Atlas')
          ))
        return isInDateRange && matchesTenant
      } catch (error) {
        logger.error('Error processing entry:', error)
        return false
      }
    })

    // Create a map of all dates in the range
    const dateMap = {}
    const currentDate = new Date(startDate)
    const endDateTime = new Date(endDate)
    
    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = { maliciousDomains: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in the actual data
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString()
      if (dateMap[date]) {
        dateMap[date].maliciousDomains++
      }
    })

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = { maliciousDomains: 0 }
    }

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Malicious Domains',
          data: sortedDates.map(date => dateMap[date].maliciousDomains),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.5)',
          borderWidth: 2,
          fill: false,
          spanGaps: true,
          pointBackgroundColor: 'rgb(147, 51, 234)'
        }
      ]
    }
  }

  // Process malicious traffic data for charts
  const processMaliciousTrafficData = () => {
    const { startDate, endDate } = getDateRange()
    
    // Filter entries by date range and tenant
    const filteredEntries = entries.filter(entry => {
      if (!entry || !entry.date) return false
      try {
        const entryDate = new Date(entry.date)
        if (isNaN(entryDate.getTime())) return false
        const start = new Date(startDate)
        const end = new Date(endDate)
        const isInDateRange = entryDate >= start && entryDate <= end
        
        // Improved tenant matching with variations
        const matchesTenant = tenant === 'all' || 
          (entry.tenant && (
            entry.tenant === tenant ||
            (tenant === 'MWELL' && entry.tenant === 'Project Chiron') ||
            (tenant === 'SiyCha Group of Companies' && (entry.tenant === 'Project Orion' || entry.tenant === 'SiyCha')) ||
            (tenant === 'MPIW' && entry.tenant === 'Project Hunt') ||
            (tenant === 'NIKI' && entry.tenant === 'Project NIKI') ||
            (tenant === 'Cantilan' && entry.tenant === 'Project Atlas')
          ))
        return isInDateRange && matchesTenant
      } catch (error) {
        logger.error('Error processing entry:', error)
        return false
      }
    })

    // Create a map of all dates in the range
    const dateMap = {}
    const currentDate = new Date(startDate)
    const endDateTime = new Date(endDate)
    
    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = { connectionAttempts: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in the actual data
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString()
      if (dateMap[date]) {
        dateMap[date].connectionAttempts += parseInt(entry.attempts || 0)
      }
    })

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = { connectionAttempts: 0 }
    }

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Connection Attempts',
          data: sortedDates.map(date => dateMap[date].connectionAttempts),
          borderColor: 'rgb(234, 179, 8)',
          backgroundColor: 'rgba(234, 179, 8, 0.5)',
          borderWidth: 2,
          fill: false,
          spanGaps: true,
          pointBackgroundColor: 'rgb(234, 179, 8)'
        }
      ]
    }
  }

  // Set up real-time listener
  useEffect(() => {
    let unsubscribeEntries = () => {}
    let unsubscribeAlerts = () => {}
    
    try {
      setLoading(true)
      
      // Set up real-time listener for entries
      unsubscribeEntries = listenToATIPEntries(
        { 
          dateRange: timeRange, 
          date: timeRange === '1 Day' ? selectedDate : undefined,
          month: timeRange === '1 Month' ? selectedMonth : undefined
        },
        (newEntries) => {
          setEntries(newEntries)
          setIsFirebaseError(false)
        },
        (error) => {
          logger.error('Error fetching entries:', error)
          setIsFirebaseError(true)
          toast.error('Error fetching entries. Please check your connection.')
        }
      )

      // Set up real-time listener for alerts
      const { startDate, endDate } = getDateRange()
      unsubscribeAlerts = listenToAlerts(
        { 
          tenant: tenant === 'all' ? null : tenant,
          startDate,
          endDate,
          month: timeRange === '1 Month' ? selectedMonth : undefined
        },
        (newAlerts) => {
          setAlerts(newAlerts)
          // Calculate stats based on the filtered alerts
          const filteredAlerts = newAlerts.filter(alert => {
            if (!alert.timestamp) return false
            const alertDate = new Date(alert.timestamp)
            return alertDate >= new Date(startDate) && alertDate <= new Date(endDate)
          })

          setStats(prevStats => ({
            ...prevStats,
            totalAlerts: filteredAlerts.length,
            truePositives: filteredAlerts.filter(alert => alert.verificationStatus === 'True Positive').length,
            falsePositives: filteredAlerts.filter(alert => alert.verificationStatus === 'False Positive').length,
            toBeConfirmed: filteredAlerts.filter(alert => 
              !alert.verificationStatus || alert.verificationStatus === 'To Be Confirmed'
            ).length
          }))
          setLoading(false)
        }
      )

      // Fetch initial stats
      const fetchStats = async () => {
        const newStats = await getATIPStats({ 
          dateRange: timeRange, 
          date: timeRange === '1 Day' ? selectedDate : undefined,
          month: timeRange === '1 Month' ? selectedMonth : undefined,
          startDate,
          endDate
        })
        setStats(prevStats => ({
          ...prevStats,
          ...newStats
        }))
      }
      fetchStats()
    } catch (error) {
      logger.error('Error setting up listeners:', error)
      setIsFirebaseError(true)
      setLoading(false)
    }

    return () => {
      unsubscribeEntries()
      unsubscribeAlerts()
    }
  }, [timeRange, selectedDate, selectedMonth, tenant])

  // Combine all stats updates into a single useEffect
  useEffect(() => {
    if (entries.length > 0 || alerts.length > 0 || threatVulnData.length > 0 || threatDetData.length > 0) {
      const { startDate, endDate } = getDateRange()
      
      // Helper function to map display names to stored tenant names
      const mapTenantName = (displayName) => {
        switch (displayName) {
          case 'SiyCha Group of Companies': return 'SiyCha';
          case 'Project Chiron': return 'MWELL';
          case 'Project Hunt': return 'MPIW';
          case 'Project NIKI': return 'NIKI';
          case 'Project Atlas': return 'Cantilan';
          default: return displayName;
        }
      }

      // Calculate alerts stats
      const filteredAlerts = alerts.filter(alert => {
        if (!alert.timestamp) return false
        const alertDate = new Date(alert.timestamp)
        return alertDate >= new Date(startDate) && alertDate <= new Date(endDate)
      })

      // Calculate connection attempts
      const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date)
        const isInDateRange = entryDate >= new Date(startDate) && entryDate <= new Date(endDate)
        const matchesTenant = tenant === 'all' || entry.tenant === mapTenantName(tenant)
        return isInDateRange && matchesTenant
      })

      const totalAttempts = filteredEntries.reduce((sum, entry) => 
        sum + (parseInt(entry.attempts) || 0), 0
      )

      // Calculate threat vulnerabilities
      const filteredVulns = threatVulnData.filter(data => {
        const dataDate = new Date(data.timestamp)
        return dataDate >= new Date(startDate) && dataDate <= new Date(endDate)
      })

      // Calculate threat detections
      const filteredDets = threatDetData.filter(data => {
        const dataDate = new Date(data.timestamp)
        return dataDate >= new Date(startDate) && dataDate <= new Date(endDate)
      })

      const totalVulns = filteredVulns.reduce((sum, item) => 
        sum + (parseInt(item.count) || 0), 0
      )

      const totalDets = filteredDets.reduce((sum, item) => 
        sum + (parseInt(item.count) || 0), 0
      )

      setStats({
        totalAlerts: filteredAlerts.length,
        truePositives: filteredAlerts.filter(alert => alert.verificationStatus === 'True Positive').length,
        falsePositives: filteredAlerts.filter(alert => alert.verificationStatus === 'False Positive').length,
        toBeConfirmed: filteredAlerts.filter(alert => 
          !alert.verificationStatus || alert.verificationStatus === 'To Be Confirmed'
        ).length,
        atipDetections: totalAttempts,
        threatVulnerabilities: totalVulns,
        threatDetections: totalDets
      })
    }
  }, [entries, alerts, threatVulnData, threatDetData, timeRange, selectedDate, selectedMonth, tenant])

  // Add useEffect for threat vulnerabilities listener
  useEffect(() => {
    const { startDate, endDate } = getDateRange()
    
    setThreatVulnLoading(true)
    const unsubscribe = listenToThreatVulnerabilities(
      {
        tenant: tenant === 'all' ? null : tenant,
        startDate,
        endDate
      },
      (data) => {
        setThreatVulnData(data)
        setStats(prev => ({
          ...prev,
          threatVulnerabilities: data.reduce((sum, item) => sum + item.count, 0)
        }))
        setThreatVulnLoading(false)
      }
    )
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, tenant])

  // Add useEffect for threat detections listener
  useEffect(() => {
    const { startDate, endDate } = getDateRange()
    
    setThreatDetLoading(true)
    const unsubscribe = listenToThreatDetections(
      {
        tenant: tenant === 'all' ? null : tenant,
        startDate,
        endDate
      },
      (data) => {
        setThreatDetData(data)
        setStats(prev => ({
          ...prev,
          threatDetections: data.reduce((sum, item) => sum + item.count, 0)
        }))
        setThreatDetLoading(false)
      }
    )
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, tenant])

  const chartData = processChartData()
  const verificationData = processVerificationData()
  const maliciousTrafficData = processMaliciousTrafficData()
  const maliciousDomainsData = processMaliciousDomainsData()
  const emptyChartData = createEmptyChartData()

  // Common chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      bar: {
        borderWidth: 2,
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.8)',
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { 
          color: 'rgba(255, 255, 255, 0.8)',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 12,
        cornerRadius: 4
      },
      datalabels: {
        display: function(context) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: 'rgba(255, 255, 255, 0.8)',
        anchor: 'end',
        align: 'top',
        offset: 5,
        font: {
          weight: 'bold',
          size: 11
        },
        padding: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        formatter: (value) => value.toLocaleString()
      }
    }
  }

  // Add handlers for threat vulnerabilities
  const handleThreatVulnSubmit = async (e) => {
    e.preventDefault()
    setIsAddingThreatVuln(true)
    try {
      const result = await addThreatVulnerability({
        tenant: newThreatVulnData.tenant,
        count: parseInt(newThreatVulnData.count),
        timestamp: new Date(newThreatVulnData.date).toISOString()
      })
      
      if (result.success) {
        // Reset form
        setNewThreatVulnData({
          tenant: '',
          count: '',
          date: new Date().toISOString().split('T')[0]
        })
        setShowThreatVulnForm(false)
        toast.success('Threat vulnerability data added successfully')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error('Error adding threat vulnerability data:', error)
      toast.error('Failed to add threat vulnerability data')
    } finally {
      setIsAddingThreatVuln(false)
    }
  }

  // Add handlers for threat detections
  const handleThreatDetSubmit = async (e) => {
    e.preventDefault()
    setIsAddingThreatDet(true)
    try {
      const result = await addThreatDetection({
        tenant: newThreatDetData.tenant,
        count: parseInt(newThreatDetData.count),
        timestamp: new Date(newThreatDetData.date).toISOString()
      })
      
      if (result.success) {
        // Reset form
        setNewThreatDetData({
          tenant: '',
          count: '',
          date: new Date().toISOString().split('T')[0]
        })
        setShowThreatDetForm(false)
        toast.success('Threat detection data added successfully')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error('Error adding threat detection data:', error)
      toast.error('Failed to add threat detection data')
    } finally {
      setIsAddingThreatDet(false)
    }
  }

  // Add handlers for deleting threat data
  const handleDeleteThreatVuln = async (id) => {
    const threatVuln = threatVulnData.find(t => t.id === id)
    setThreatVulnToDelete(threatVuln)
    setShowDeleteThreatVulnModal(true)
  }

  const confirmDeleteThreatVuln = async () => {
    if (!threatVulnToDelete) return
    setIsDeletingThreatVuln(true)
    try {
      const result = await deleteThreatVulnerability(threatVulnToDelete.id)
      if (result.success) {
        toast.success("Threat vulnerability deleted successfully")
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error deleting threat vulnerability:", error)
      toast.error("Failed to delete threat vulnerability")
    } finally {
      setIsDeletingThreatVuln(false)
      setShowDeleteThreatVulnModal(false)
      setThreatVulnToDelete(null)
    }
  }

  const handleDeleteThreatDet = async (id) => {
    const threatDet = threatDetData.find(t => t.id === id)
    setThreatDetToDelete(threatDet)
    setShowDeleteThreatDetModal(true)
  }

  const confirmDeleteThreatDet = async () => {
    if (!threatDetToDelete) return
    setIsDeletingThreatDet(true)
    try {
      const result = await deleteThreatDetection(threatDetToDelete.id)
      if (result.success) {
        toast.success("Threat detection deleted successfully")
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error deleting threat detection:", error)
      toast.error("Failed to delete threat detection")
    } finally {
      setIsDeletingThreatDet(false)
      setShowDeleteThreatDetModal(false)
      setThreatDetToDelete(null)
    }
  }

  // Process threat vulnerabilities data for chart
  const processThreatVulnData = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Filter data within date range
    const filteredData = threatVulnData.filter(data => {
      if (!data.timestamp) return false
      const dataDate = new Date(data.timestamp)
      return dataDate >= start && dataDate < end
    })

    // Create a map of all dates in the range
    const dateMap = {}
    const currentDate = new Date(start)
    
    while (currentDate < end) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = { total: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in the actual data
    filteredData.forEach(data => {
      const date = new Date(data.timestamp).toLocaleDateString()
      if (dateMap[date]) {
        dateMap[date].total += parseInt(data.count || 0)
      }
    })

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = { total: 0 }
    }

    return {
      labels: sortedDates,
      datasets: [{
        label: 'Threat Vulnerabilities',
        data: sortedDates.map(date => dateMap[date].total),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.1
      }]
    }
  }

  // Process threat detections data for chart
  const processThreatDetData = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Filter data within date range
    const filteredData = threatDetData.filter(data => {
      if (!data.timestamp) return false
      const dataDate = new Date(data.timestamp)
      return dataDate >= start && dataDate < end
    })

    // Create a map of all dates in the range
    const dateMap = {}
    const currentDate = new Date(start)
    
    while (currentDate < end) {
      const dateStr = currentDate.toLocaleDateString()
      dateMap[dateStr] = { total: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in the actual data
    filteredData.forEach(data => {
      const date = new Date(data.timestamp).toLocaleDateString()
      if (dateMap[date]) {
        dateMap[date].total += parseInt(data.count || 0)
      }
    })

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
      new Date(a) - new Date(b)
    )

    // If no data points, add today's date
    if (sortedDates.length === 0) {
      const today = new Date(startDate)
      const todayStr = today.toLocaleDateString()
      sortedDates.push(todayStr)
      dateMap[todayStr] = { total: 0 }
    }

    return {
      labels: sortedDates,
      datasets: [{
        label: 'Threat Detections',
        data: sortedDates.map(date => dateMap[date].total),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1
      }]
    }
  }

  // Add this function before the return statement
  const handleFullScreenChart = (chartData, title) => {
    setFullScreenChartData(chartData)
    setFullScreenChartTitle(title)
    setShowFullScreenChart(true)
  }

  return (
    <div className="min-h-screen bg-[#0B1120] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with filters */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 font-mono">Statistics Dashboard</h1>
          <div className="flex gap-4">
            <select 
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              className="bg-gray-800 text-gray-100 px-4 py-2 rounded-md border border-gray-700"
            >
              <option value="all">All Projects</option>
              {tenants.map(t => {
                const projectName = {
                  'NIKI': 'Project NIKI',
                  'MWELL': 'Project Chiron',
                  'MPIW': 'Project Hunt',
                  'SiyCha Group of Companies': 'Project Orion',
                  'Cantilan': 'Project Atlas'
                }[t] || t;
                return (
                  <option key={t} value={t}>{projectName}</option>
                )
              })}
            </select>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
              >
                <option value="1 Day">Daily View</option>
                <option value="Weekly">Weekly View</option>
                <option value="1 Month">Monthly View</option>
              </select>

              {timeRange === '1 Day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
                />
              )}

              {timeRange === '1 Month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
                />
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl">🔍</span>
              <h3 className="text-lg font-semibold text-gray-300">Total SOC Detections</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.totalAlerts?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl">🖥️</span>
              <h3 className="text-lg font-semibold text-gray-300">Total ATIP Detections</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.atipDetections?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-lg font-semibold text-gray-300">Total Threat Vulnerabilities</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.threatVulnerabilities?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-semibold text-gray-300">Total Threat Detections</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.threatDetections?.toLocaleString() || '0'}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SOC Detections */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">SOC Detections</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Sort by {timeRange}</div>
                <button
                  onClick={() => handleFullScreenChart(chartData, 'SOC Detections')}
                  className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-cyan-400 font-mono text-sm">Loading data...</div>
                </div>
              ) : (
                <Bar data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* True/False Positives */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">True/False Positives</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Sort by {timeRange}</div>
                <button
                  onClick={() => handleFullScreenChart(verificationData, 'True/False Positives')}
                  className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-cyan-400 font-mono text-sm">Loading data...</div>
                </div>
              ) : (
                <Bar data={verificationData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Malicious Domains */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Malicious Domains</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Sort by {timeRange}</div>
                <button
                  onClick={() => handleFullScreenChart(maliciousDomainsData, 'Malicious Domains')}
                  className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-cyan-400 font-mono text-sm">Loading data...</div>
                </div>
              ) : (
                <Bar data={maliciousDomainsData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Malicious Traffic */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Malicious Traffic</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Sort by {timeRange}</div>
                <button
                  onClick={() => handleFullScreenChart(maliciousTrafficData, 'Malicious Traffic')}
                  className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-cyan-400 font-mono text-sm">Loading data...</div>
                </div>
              ) : (
                <Bar data={maliciousTrafficData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Total Threat Vulnerabilities */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Total Threat Vulnerabilities</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowThreatVulnTable(!showThreatVulnTable)}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm"
                >
                  {showThreatVulnTable ? 'Show Chart' : 'Show Table'}
                </button>
                <button
                  onClick={() => setShowThreatVulnForm(!showThreatVulnForm)}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm"
                >
                  Add Data
                </button>
                {!showThreatVulnTable && (
                  <button
                    onClick={() => handleFullScreenChart(processThreatVulnData(), 'Total Threat Vulnerabilities')}
                    className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {showThreatVulnForm && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <form onSubmit={handleThreatVulnSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Project</label>
                      <select
                        value={newThreatVulnData.tenant}
                        onChange={(e) => setNewThreatVulnData({ ...newThreatVulnData, tenant: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      >
                        <option value="">Select Project</option>
                        <option value="MPIW">Project Hunt</option>
                        <option value="MWELL">Project Chiron</option>
                        <option value="NIKI">Project NIKI</option>
                        <option value="SiyCha Group of Companies">Project Orion</option>
                        <option value="Cantilan">Project Atlas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Count</label>
                      <input
                        type="number"
                        value={newThreatVulnData.count}
                        onChange={(e) => setNewThreatVulnData({ ...newThreatVulnData, count: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Date</label>
                      <input
                        type="date"
                        value={newThreatVulnData.date}
                        onChange={(e) => setNewThreatVulnData({ ...newThreatVulnData, date: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowThreatVulnForm(false)}
                      className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/70 transition-colors font-mono text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingThreatVuln}
                      className={`px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm flex items-center gap-2 ${
                        isAddingThreatVuln ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isAddingThreatVuln ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        'Add Data'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="h-[400px]">
              {showThreatVulnTable ? (
                threatVulnLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-cyan-400 font-mono text-sm">Loading threat vulnerabilities...</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-300">
                          <th className="pb-3 font-mono text-cyan-400">Date</th>
                          <th className="pb-3 font-mono text-cyan-400">Project</th>
                          <th className="pb-3 font-mono text-cyan-400">Count</th>
                          <th className="pb-3 font-mono text-cyan-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {threatVulnData
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .slice(threatVulnCurrentPage * 5, (threatVulnCurrentPage + 1) * 5)
                          .map((data) => {
                            const timestamp = new Date(data.timestamp)
                            const dateString = timestamp.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })

                            return (
                              <tr key={data.id} className="border-t border-gray-700">
                                <td className="py-2 font-mono text-gray-200">{dateString}</td>
                                <td className="py-2 font-mono text-gray-200">
                                  {data.tenant === 'NIKI' ? 'Project NIKI' :
                                   data.tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
                                   data.tenant === 'MPIW' ? 'Project Hunt' :
                                   data.tenant === 'MWELL' ? 'Project Chiron' :
                                   data.tenant === 'Cantilan' ? 'Project Atlas' :
                                   data.tenant}
                                </td>
                                <td className="py-2 font-mono text-gray-200">{data.count}</td>
                                <td className="py-2">
                                  <button
                                    onClick={() => handleDeleteThreatVuln(data.id)}
                                    disabled={deletingThreatVulnIds.has(data.id)}
                                    className={`px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors font-mono text-xs flex items-center gap-1 ${
                                      deletingThreatVulnIds.has(data.id) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {deletingThreatVulnIds.has(data.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        onClick={() => setThreatVulnCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={threatVulnCurrentPage === 0}
                        className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                          threatVulnCurrentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Previous
                      </button>
                      <span className="text-gray-200 font-mono text-sm">
                        Page {threatVulnCurrentPage + 1} of {Math.ceil(threatVulnData.length / 5)}
                      </span>
                      <button
                        onClick={() => setThreatVulnCurrentPage(prev => Math.min(Math.ceil(threatVulnData.length / 5) - 1, prev + 1))}
                        disabled={threatVulnCurrentPage >= Math.ceil(threatVulnData.length / 5) - 1}
                        className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                          threatVulnCurrentPage >= Math.ceil(threatVulnData.length / 5) - 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )
              ) : (
                threatVulnLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-cyan-400 font-mono text-sm">Loading threat vulnerabilities...</div>
                  </div>
                ) : (
                  <Bar data={processThreatVulnData()} options={chartOptions} />
                )
              )}
            </div>
          </div>

          {/* Total Threat Detections */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Total Threat Detections</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowThreatDetTable(!showThreatDetTable)}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm"
                >
                  {showThreatDetTable ? 'Show Chart' : 'Show Table'}
                </button>
                <button
                  onClick={() => setShowThreatDetForm(!showThreatDetForm)}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm"
                >
                  Add Data
                </button>
                {!showThreatDetTable && (
                  <button
                    onClick={() => handleFullScreenChart(processThreatDetData(), 'Total Threat Detections')}
                    className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {showThreatDetForm && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <form onSubmit={handleThreatDetSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Project</label>
                      <select
                        value={newThreatDetData.tenant}
                        onChange={(e) => setNewThreatDetData({ ...newThreatDetData, tenant: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      >
                        <option value="">Select Project</option>
                        <option value="MPIW">Project Hunt</option>
                        <option value="MWELL">Project Chiron</option>
                        <option value="NIKI">Project NIKI</option>
                        <option value="SiyCha Group of Companies">Project Orion</option>
                        <option value="Cantilan">Project Atlas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Count</label>
                      <input
                        type="number"
                        value={newThreatDetData.count}
                        onChange={(e) => setNewThreatDetData({ ...newThreatDetData, count: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Date</label>
                      <input
                        type="date"
                        value={newThreatDetData.date}
                        onChange={(e) => setNewThreatDetData({ ...newThreatDetData, date: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowThreatDetForm(false)}
                      className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/70 transition-colors font-mono text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingThreatDet}
                      className={`px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono text-sm flex items-center gap-2 ${
                        isAddingThreatDet ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isAddingThreatDet ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        'Add Data'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="h-[400px]">
              {showThreatDetTable ? (
                threatDetLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-cyan-400 font-mono text-sm">Loading threat detections...</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-300">
                          <th className="pb-3 font-mono text-cyan-400">Date</th>
                          <th className="pb-3 font-mono text-cyan-400">Project</th>
                          <th className="pb-3 font-mono text-cyan-400">Count</th>
                          <th className="pb-3 font-mono text-cyan-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {threatDetData
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .slice(threatDetCurrentPage * 5, (threatDetCurrentPage + 1) * 5)
                          .map((data) => {
                            const timestamp = new Date(data.timestamp)
                            const dateString = timestamp.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })

                            return (
                              <tr key={data.id} className="border-t border-gray-700">
                                <td className="py-2 font-mono text-gray-200">{dateString}</td>
                                <td className="py-2 font-mono text-gray-200">
                                  {data.tenant === 'NIKI' ? 'Project NIKI' :
                                   data.tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
                                   data.tenant === 'MPIW' ? 'Project Hunt' :
                                   data.tenant === 'MWELL' ? 'Project Chiron' :
                                   data.tenant === 'Cantilan' ? 'Project Atlas' :
                                   data.tenant}
                                </td>
                                <td className="py-2 font-mono text-gray-200">{data.count}</td>
                                <td className="py-2">
                                  <button
                                    onClick={() => handleDeleteThreatDet(data.id)}
                                    disabled={deletingThreatDetIds.has(data.id)}
                                    className={`px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors font-mono text-xs flex items-center gap-1 ${
                                      deletingThreatDetIds.has(data.id) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {deletingThreatDetIds.has(data.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <button
                        onClick={() => setThreatDetCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={threatDetCurrentPage === 0}
                        className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                          threatDetCurrentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Previous
                      </button>
                      <span className="text-gray-200 font-mono text-sm">
                        Page {threatDetCurrentPage + 1} of {Math.ceil(threatDetData.length / 5)}
                      </span>
                      <button
                        onClick={() => setThreatDetCurrentPage(prev => Math.min(Math.ceil(threatDetData.length / 5) - 1, prev + 1))}
                        disabled={threatDetCurrentPage >= Math.ceil(threatDetData.length / 5) - 1}
                        className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                          threatDetCurrentPage >= Math.ceil(threatDetData.length / 5) - 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )
              ) : (
                threatDetLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-cyan-400 font-mono text-sm">Loading threat detections...</div>
                  </div>
                ) : (
                  <Bar data={processThreatDetData()} options={chartOptions} />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Delete Confirmation Modals */}
      <AnimatePresence>
        {showDeleteThreatVulnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-red-500/30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-400">Confirm Threat Vulnerability Deletion</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Details:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Project:</span>
                      <span className="text-red-300">
                        {threatVulnToDelete?.tenant === 'NIKI' ? 'Project NIKI' :
                         threatVulnToDelete?.tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
                         threatVulnToDelete?.tenant === 'MPIW' ? 'Project Hunt' :
                         threatVulnToDelete?.tenant === 'MWELL' ? 'Project Chiron' :
                         threatVulnToDelete?.tenant === 'Cantilan' ? 'Project Atlas' :
                         threatVulnToDelete?.tenant}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Count:</span>
                      <span className="text-red-300">{threatVulnToDelete?.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-red-300">
                        {threatVulnToDelete?.timestamp ? new Date(threatVulnToDelete.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        }) : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    Are you sure you want to delete this threat vulnerability data? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteThreatVulnModal(false)
                    setThreatVulnToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteThreatVuln}
                  disabled={isDeletingThreatVuln}
                  className={`px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors duration-200 flex items-center gap-2 ${
                    isDeletingThreatVuln ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isDeletingThreatVuln ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-red-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete Threat Vulnerability"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteThreatDetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-red-500/30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-400">Confirm Threat Detection Deletion</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Details:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Project:</span>
                      <span className="text-red-300">
                        {threatDetToDelete?.tenant === 'NIKI' ? 'Project NIKI' :
                         threatDetToDelete?.tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
                         threatDetToDelete?.tenant === 'MPIW' ? 'Project Hunt' :
                         threatDetToDelete?.tenant === 'MWELL' ? 'Project Chiron' :
                         threatDetToDelete?.tenant === 'Cantilan' ? 'Project Atlas' :
                         threatDetToDelete?.tenant}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Count:</span>
                      <span className="text-red-300">{threatDetToDelete?.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-red-300">
                        {threatDetToDelete?.timestamp ? new Date(threatDetToDelete.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        }) : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    Are you sure you want to delete this threat detection data? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteThreatDetModal(false)
                    setThreatDetToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteThreatDet}
                  disabled={isDeletingThreatDet}
                  className={`px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors duration-200 flex items-center gap-2 ${
                    isDeletingThreatDet ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isDeletingThreatDet ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-red-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete Threat Detection"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add this before the closing </div> of the main container */}
      <AnimatePresence>
        {showFullScreenChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 w-full h-full max-w-[90vw] max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-cyan-400">{fullScreenChartTitle}</h2>
                <button
                  onClick={() => setShowFullScreenChart(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <Bar data={fullScreenChartData} options={{
                  ...chartOptions,
                  maintainAspectRatio: false,
                  plugins: {
                    ...chartOptions.plugins,
                    datalabels: {
                      ...chartOptions.plugins.datalabels,
                      font: {
                        ...chartOptions.plugins.datalabels.font,
                        size: 14
                      }
                    }
                  }
                }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}