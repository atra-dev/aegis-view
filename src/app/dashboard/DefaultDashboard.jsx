'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { listenToAlerts, listenToLogIngestion } from '@/services/management'
import { logger } from '@/utils/logger'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
)

// Add this new component after the imports
const ChartSkeleton = ({ height = "300px" }) => (
  <div className="animate-pulse">
    <div className="h-[40px] bg-gray-700/50 rounded-lg mb-4"></div>
    <div className={`h-[${height}] bg-gray-700/50 rounded-lg`}></div>
  </div>
)

const HeaderSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-[32px] w-[200px] bg-gray-700/50 rounded-lg mb-4"></div>
  </div>
)

export default function DefaultDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('1D')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedTenant, setSelectedTenant] = useState('All')
  const [alerts, setAlerts] = useState([])
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [logIngestionData, setLogIngestionData] = useState([])
  const [logIngestionUnsubscribe, setLogIngestionUnsubscribe] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [logIngestionLoading, setLogIngestionLoading] = useState(true)

  // Process verification status trends
  const processVerificationTrends = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Filter alerts within date range
    const filteredAlerts = alerts.filter(alert => {
      const alertDate = new Date(alert.timestamp)
      return alertDate >= start && alertDate <= end
    })

    // Create maps to store counts
    const truePositiveCounts = {}
    const falsePositiveCounts = {}
    const labels = []

    switch (timeRange) {
      case '1D':
        // Hourly data for one day
        for (let hour = 0; hour < 24; hour++) {
          const date = new Date(start)
          date.setHours(hour, 0, 0, 0)
          const hourKey = date.toISOString()
          truePositiveCounts[hourKey] = 0
          falsePositiveCounts[hourKey] = 0
          labels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }))
        }

        // Count by hour
        filteredAlerts.forEach(alert => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setMinutes(0, 0, 0)
          const hourKey = alertDate.toISOString()
          if (alert.verificationStatus === 'True Positive') {
            truePositiveCounts[hourKey] = (truePositiveCounts[hourKey] || 0) + 1
          } else if (alert.verificationStatus === 'False Positive') {
            falsePositiveCounts[hourKey] = (falsePositiveCounts[hourKey] || 0) + 1
          }
        })
        break

      case '7D':
        // Daily data for a week
        for (let i = 0; i < 7; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          date.setHours(0, 0, 0, 0)
          const dayKey = date.toISOString()
          truePositiveCounts[dayKey] = 0
          falsePositiveCounts[dayKey] = 0
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
        }

        // Count by day
        filteredAlerts.forEach(alert => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setHours(0, 0, 0, 0)
          const dayKey = alertDate.toISOString()
          if (alert.verificationStatus === 'True Positive') {
            truePositiveCounts[dayKey] = (truePositiveCounts[dayKey] || 0) + 1
          } else if (alert.verificationStatus === 'False Positive') {
            falsePositiveCounts[dayKey] = (falsePositiveCounts[dayKey] || 0) + 1
          }
        })
        break

      case '30D':
      case '1M':
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        for (let i = 0; i < days; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          date.setHours(0, 0, 0, 0)
          const dayKey = date.toISOString()
          truePositiveCounts[dayKey] = 0
          falsePositiveCounts[dayKey] = 0
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        }

        // Count by day
        filteredAlerts.forEach(alert => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setHours(0, 0, 0, 0)
          const dayKey = alertDate.toISOString()
          if (alert.verificationStatus === 'True Positive') {
            truePositiveCounts[dayKey] = (truePositiveCounts[dayKey] || 0) + 1
          } else if (alert.verificationStatus === 'False Positive') {
            falsePositiveCounts[dayKey] = (falsePositiveCounts[dayKey] || 0) + 1
          }
        })
        break
    }

    return {
      labels,
      datasets: [
        {
          label: 'True Positives',
          data: Object.values(truePositiveCounts),
          backgroundColor: 'rgba(34, 197, 94, 0.8)', // green
          borderColor: 'rgb(34, 197, 94)',
          tension: 0
        },
        {
          label: 'False Positives',
          data: Object.values(falsePositiveCounts),
          backgroundColor: 'rgba(239, 68, 68, 0.8)', // red
          borderColor: 'rgb(239, 68, 68)',
          tension: 0
        }
      ]
    }
  }

  // Process alerts data for tenant distribution
  const processAlertsByTenant = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Filter alerts within the date range
    const filteredAlerts = alerts.filter(alert => {
      const alertDate = new Date(alert.timestamp)
      return alertDate >= start && alertDate <= end
    })

    const tenantCounts = {}
    filteredAlerts.forEach(alert => {
      const tenant = alert.tenant || 'Unknown'
      tenantCounts[tenant] = (tenantCounts[tenant] || 0) + 1
    })

    // Get unique tenants and sort them alphabetically
    const tenants = Object.keys(tenantCounts).sort()
    
    return {
      labels: tenants.map(tenant => 
        tenant === 'NIKI' ? 'Project NIKI' :
        tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
        tenant === 'MPIW' ? 'Project Hunt' :
        tenant === 'MWELL' ? 'Project Chiron' :
        tenant === 'Cantilan' ? 'Project Atlas' :
        tenant
      ),
      datasets: [{
        label: 'Alerts by Project',
        data: tenants.map(tenant => tenantCounts[tenant]),
        backgroundColor: [
          'rgba(6, 182, 212, 0.8)',    // cyan
          'rgba(251, 191, 36, 0.8)',   // amber
          'rgba(239, 68, 68, 0.8)',    // red
          'rgba(34, 197, 94, 0.8)',    // green
          'rgba(147, 51, 234, 0.8)',   // purple
          'rgba(236, 72, 153, 0.8)',   // pink
          'rgba(16, 185, 129, 0.8)',   // emerald
          'rgba(245, 158, 11, 0.8)'    // yellow
        ]
      }]
    }
  }

  // Process log ingestion data based on time range
  const processLogIngestionData = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    const data = []
    const labels = []
    const differences = []
    const trendlineData = []

    // Filter logs within the date range
    const filteredLogs = logIngestionData.filter(log => {
      const logDate = new Date(log.timestamp)
      return logDate >= start && logDate <= end
    })

    // Group logs by date and tenant
    const logsByDate = {}
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString()
      
      if (!logsByDate[dateKey]) {
        logsByDate[dateKey] = {
          total: 0,
          byTenant: {}
        }
      }
      
      logsByDate[dateKey].total += log.ingestionSize
      if (!logsByDate[dateKey].byTenant[log.tenant]) {
        logsByDate[dateKey].byTenant[log.tenant] = 0
      }
      logsByDate[dateKey].byTenant[log.tenant] += log.ingestionSize
    })

    // Create data points for each hour in the selected day
    if (timeRange === '1D') {
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date(start)
        date.setHours(hour, 0, 0, 0)
        const hourKey = date.toISOString()
        
        // Find logs for this hour
        const hourLogs = filteredLogs.filter(log => {
          const logDate = new Date(log.timestamp)
          return logDate.getHours() === hour
        })
        
        const hourTotal = hourLogs.reduce((sum, log) => sum + log.ingestionSize, 0)
        data.push(hourTotal)
        labels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }))
        
        // Calculate difference from previous hour
        const prevHour = hour > 0 ? data[hour - 1] : 0
        differences.push(hourTotal - prevHour)
        trendlineData.push(hourTotal)
      }
    } else {
      // For weekly and monthly views, use daily aggregation
      const sortedDates = Object.keys(logsByDate).sort()
      if (sortedDates.length === 0) {
        // If no data, add two zero points
        const today = new Date(start)
        const tomorrow = new Date(start)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        data.push(0, 0)
        differences.push(0, 0)
        trendlineData.push(0, 0)
        labels.push(
          today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          tomorrow.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
        )
      } else {
        // Calculate differences and prepare data
        let previousTotal = 0
        sortedDates.forEach((dateKey, index) => {
          const currentTotal = logsByDate[dateKey].total
          const difference = previousTotal > 0 ? currentTotal - previousTotal : 0
          data.push(currentTotal)
          differences.push(difference)
          trendlineData.push(currentTotal)
          const date = new Date(dateKey)
          labels.push(date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }))
          previousTotal = currentTotal
        })

        // If only one point, duplicate it
        if (sortedDates.length === 1) {
          data.push(data[0])
          differences.push(0)
          trendlineData.push(data[0])
          const nextDate = new Date(sortedDates[0])
          nextDate.setDate(nextDate.getDate() + 1)
          labels.push(nextDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }))
        }
      }
    }

    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Total Ingestion',
          data,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgb(53, 162, 235)',
          borderWidth: 1,
          yAxisID: 'y',
          order: 2
        },
        {
          type: 'line',
          label: 'Trendline for Total Ingestion',
          data: trendlineData,
          borderColor: 'rgba(128, 128, 128, 0.5)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          yAxisID: 'y',
          pointRadius: 0,
          order: 1
        },
        {
          type: 'line',
          label: 'Difference',
          data: differences,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderWidth: 2,
          fill: false,
          tension: 0,
          yAxisID: 'y1',
          pointRadius: 0,
          order: 0
        }
      ]
    }
  }

  // Get date range based on selected time range
  const getDateRange = () => {
    const today = new Date()
    
    switch (timeRange) {
      case '1D':
        const selectedDateObj = new Date(selectedDate)
        selectedDateObj.setHours(0, 0, 0, 0)
        const nextDay = new Date(selectedDateObj)
        nextDay.setDate(selectedDateObj.getDate() + 1)
        return {
          startDate: selectedDateObj.toISOString(),
          endDate: nextDay.toISOString()
        }
      case '7D':
        const weekAgo = new Date()
        weekAgo.setDate(today.getDate() - 6)
        weekAgo.setHours(0, 0, 0, 0)
        today.setHours(23, 59, 59, 999)
        return {
          startDate: weekAgo.toISOString(),
          endDate: today.toISOString()
        }
      case '1M':
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

  // Set up real-time listener
  useEffect(() => {
    let unsubscribeAlerts = () => {}
    
    try {
      setAlertsLoading(true)
      
      // Set up real-time listener for alerts
      const { startDate, endDate } = getDateRange()
      unsubscribeAlerts = listenToAlerts(
        { 
          tenant: selectedTenant === 'All' ? null : selectedTenant,
          startDate,
          endDate,
          month: timeRange === '1M' ? selectedMonth : undefined
        },
        (newAlerts) => {
          setAlerts(newAlerts)
          setAlertsLoading(false)
        }
      )

      setUnsubscribe(() => unsubscribeAlerts)
    } catch (error) {
      logger.error('Error setting up alerts listener:', error)
      setAlertsLoading(false)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, selectedTenant])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/signin')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Add useEffect for log ingestion data
  useEffect(() => {
    let unsubscribeLogIngestion = () => {}
    
    try {
      setLogIngestionLoading(true)
      const { startDate, endDate } = getDateRange()
      unsubscribeLogIngestion = listenToLogIngestion(
        {
          tenant: selectedTenant === 'All' ? null : selectedTenant,
          startDate,
          endDate
        },
        (newLogs) => {
          setLogIngestionData(newLogs)
          setLogIngestionLoading(false)
        }
      )

      setLogIngestionUnsubscribe(() => unsubscribeLogIngestion)
    } catch (error) {
      logger.error('Error setting up log ingestion listener:', error)
      setLogIngestionLoading(false)
    }

    return () => {
      if (logIngestionUnsubscribe) logIngestionUnsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, selectedTenant])

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">
            Security Dashboard
          </h1>
          <div className="flex gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
            >
              <option value="1D">Daily View</option>
              <option value="7D">Weekly View</option>
              <option value="1M">Monthly View</option>
            </select>

            {timeRange === '1D' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
              />
            )}

            {timeRange === '1M' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
              />
            )}

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2 font-mono"
            >
              <option>All</option>
              <option value="NIKI">Project NIKI</option>
              <option value="SiyCha Group of Companies">Project Orion</option>
              <option value="MPIW">Project Hunt</option>
              <option value="MWELL">Project Chiron</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {(() => {
            const { startDate, endDate } = getDateRange()
            const start = new Date(startDate)
            const end = new Date(endDate)

            // Filter alerts by date range
            const filteredAlerts = alerts.filter(alert => {
              const alertDate = new Date(alert.timestamp)
              return alertDate >= start && alertDate <= end
            })

            // Get alerts from previous period for comparison
            const previousStart = new Date(start)
            const previousEnd = new Date(end)
            const timeDiff = end.getTime() - start.getTime()
            previousStart.setTime(previousStart.getTime() - timeDiff)
            previousEnd.setTime(previousEnd.getTime() - timeDiff)

            const previousAlerts = alerts.filter(alert => {
              const alertDate = new Date(alert.timestamp)
              return alertDate >= previousStart && alertDate < start
            })

            // Calculate critical incidents
            const criticalIncidents = filteredAlerts.filter(alert => 
              alert.status?.toLowerCase() === 'critical' || 
              alert.verificationStatus === 'True Positive'
            ).length

            const previousCriticalIncidents = previousAlerts.filter(alert => 
              alert.status?.toLowerCase() === 'critical' || 
              alert.verificationStatus === 'True Positive'
            ).length

            // Calculate resolution rate
            const resolvedAlerts = filteredAlerts.filter(alert => 
              alert.status?.toLowerCase() === 'closed'
            ).length
            const resolutionRate = filteredAlerts.length > 0 
              ? Math.round((resolvedAlerts / filteredAlerts.length) * 100)
              : 0

            const previousResolvedAlerts = previousAlerts.filter(alert => 
              alert.status?.toLowerCase() === 'closed'
            ).length
            const previousResolutionRate = previousAlerts.length > 0
              ? Math.round((previousResolvedAlerts / previousAlerts.length) * 100)
              : 0

            // Calculate percentage changes
            const alertsChange = previousAlerts.length > 0
              ? Math.round(((filteredAlerts.length - previousAlerts.length) / previousAlerts.length) * 100)
              : 0

            const criticalChange = previousCriticalIncidents > 0
              ? Math.round(((criticalIncidents - previousCriticalIncidents) / previousCriticalIncidents) * 100)
              : 0

            const resolutionChange = previousResolutionRate > 0
              ? resolutionRate - previousResolutionRate
              : 0

            const stats = [
              { 
                title: 'Total Alerts', 
                value: filteredAlerts.length.toLocaleString(),
                change: `${alertsChange >= 0 ? '+' : ''}${alertsChange}%`, 
                color: 'cyan' 
              },
              { 
                title: 'Critical Incidents', 
                value: criticalIncidents.toLocaleString(),
                change: `${criticalChange >= 0 ? '+' : ''}${criticalChange}%`,
                color: 'red' 
              },
              { 
                title: 'Resolution Rate', 
                value: `${resolutionRate}%`,
                change: `${resolutionChange >= 0 ? '+' : ''}${resolutionChange}%`,
                color: 'yellow' 
              }
            ]

            return stats.map((stat, index) => (
              <div key={index} className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
                <h3 className="text-gray-400 font-mono text-sm mb-2">{stat.title}</h3>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </p>
                </div>
              </div>
            ))
          })()}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Log Ingestion Chart */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            {logIngestionLoading ? (
              <HeaderSkeleton />
            ) : (
              <h3 className="text-xl font-bold mb-4 font-mono">Total Log Ingestion</h3>
            )}
            <div className="h-[300px]">
              {logIngestionLoading ? (
                <ChartSkeleton height="250px" />
              ) : (
                <div>
                  <div className="h-[250px]">
                    <Line
                      data={processLogIngestionData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index',
                          intersect: false,
                        },
                        elements: {
                          line: {
                            tension: 0,
                            borderWidth: 2
                          },
                          point: {
                            radius: 0,
                            hitRadius: 10,
                            hoverRadius: 5
                          }
                        },
                        scales: {
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { 
                              color: '#9CA3AF',
                              callback: (value) => `${typeof value === 'number' ? value.toFixed(2) : 0} GB`
                            }
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                              drawOnChartArea: false
                            },
                            ticks: { 
                              color: '#9CA3AF',
                              callback: (value) => `${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(2) : 0} GB`
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { 
                              color: '#9CA3AF',
                              maxRotation: 45,
                              minRotation: 45
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            labels: { color: '#9CA3AF' }
                          },
                          tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                              label: (context) => {
                                const label = context.dataset.label || ''
                                const value = context.parsed.y
                                if (label === 'Difference') {
                                  return `${label}: ${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(2) : 0} GB`
                                }
                                return `${label}: ${typeof value === 'number' ? value.toFixed(2) : 0} GB`
                              }
                            }
                          },
                          datalabels: {
                            display: (context) => context.dataset.type === 'bar',
                            color: '#9CA3AF',
                            anchor: 'end',
                            align: 'top',
                            offset: 5,
                            font: {
                              weight: 'bold',
                              size: 11
                            },
                            formatter: (value) => {
                              return `${typeof value === 'number' ? value.toFixed(2) : 0} GB`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts by Tenant */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            {alertsLoading ? (
              <HeaderSkeleton />
            ) : (
              <h3 className="text-xl font-bold mb-4 font-mono">Alerts by Project</h3>
            )}
            <div className="h-[300px] flex justify-center">
              {alertsLoading ? (
                <ChartSkeleton height="250px" />
              ) : (
                <Doughnut
                  data={processAlertsByTenant()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                      legend: {
                        position: 'right',
                        align: 'center',
                        labels: { 
                          color: '#9CA3AF',
                          padding: 10,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      datalabels: {
                        color: '#fff',
                        formatter: (value, ctx) => {
                          const label = ctx.chart.data.labels[ctx.dataIndex]
                          return `${label}\n${value}`
                        },
                        font: {
                          weight: 'bold',
                          size: 12
                        },
                        textStrokeColor: 'rgba(0, 0, 0, 0.75)',
                        textStrokeWidth: 3,
                        textShadowBlur: 5,
                        textShadowColor: 'rgba(0, 0, 0, 0.75)'
                      }
                    },
                    layout: {
                      padding: {
                        right: 10
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Incident Trends */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            {alertsLoading ? (
              <HeaderSkeleton />
            ) : (
              <h3 className="text-xl font-bold mb-4 font-mono">Verification Status Trends</h3>
            )}
            <div className="h-[300px]">
              {alertsLoading ? (
                <ChartSkeleton height="250px" />
              ) : (
                <Bar
                  data={processVerificationTrends()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: { color: '#9CA3AF' }
                      },
                      x: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: { color: '#9CA3AF' }
                      }
                    },
                    plugins: {
                      legend: {
                        labels: { color: '#9CA3AF' }
                      },
                      datalabels: {
                        color: '#9CA3AF',
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value,
                        font: {
                          weight: 'bold',
                          size: 12
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Recent Alerts Table */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20">
            {alertsLoading ? (
              <HeaderSkeleton />
            ) : (
              <h3 className="text-xl font-bold mb-4 font-mono">Recent Alerts</h3>
            )}
            <div className="overflow-x-auto">
              {alertsLoading ? (
                <div className="animate-pulse">
                  <div className="h-[40px] bg-gray-700/50 rounded-lg mb-4"></div>
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-[40px] bg-gray-700/50 rounded-lg mb-2"></div>
                  ))}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="pb-3 font-mono">Time</th>
                      <th className="pb-3 font-mono">Tenant</th>
                      <th className="pb-3 font-mono">Type</th>
                      <th className="pb-3 font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {alerts
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .slice(0, 4)
                      .map((alert, index) => {
                        const timestamp = new Date(alert.timestamp)
                        const dateTimeString = timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })

                        // Determine status and color based on alert status
                        let statusColor = ''
                        let statusText = alert.status || 'New'
                        
                        switch (statusText.toLowerCase()) {
                          case 'closed':
                            statusColor = 'green'
                            break
                          case 'in progress':
                            statusColor = 'yellow'
                            break
                          case 'new':
                          default:
                            statusColor = 'red'
                            statusText = 'New'
                            break
                        }

                        return (
                          <tr key={alert.id || index} className="border-t border-gray-700">
                            <td className="py-2 font-mono">{dateTimeString}</td>
                            <td className="py-2 font-mono">
                              {alert.tenant === 'NIKI' ? 'Project NIKI' :
                               alert.tenant === 'SiyCha Group of Companies' ? 'Project Orion' :
                               alert.tenant === 'MPIW' ? 'Project Hunt' :
                               alert.tenant === 'MWELL' ? 'Project Chiron' :
                               alert.tenant === 'Cantilan' ? 'Project Atlas' :
                               alert.tenant || 'Unknown'}
                            </td>
                            <td className="py-2 font-mono whitespace-normal max-w-[300px]">{alert.alertName || alert.technique || 'Unknown'}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-mono
                                ${statusColor === 'red' ? 'bg-red-500/20 text-red-400' :
                                  statusColor === 'green' ? 'bg-green-500/20 text-green-400' :
                                  'bg-yellow-500/20 text-yellow-400'}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 