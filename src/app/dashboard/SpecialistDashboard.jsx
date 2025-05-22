"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/services/firebase"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import ChartDataLabels from "chartjs-plugin-datalabels"
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
  Filler,
} from "chart.js"
import {
  listenToAlerts,
  addLogIngestionData,
  listenToLogIngestion,
  deleteLogIngestionData,
} from "@/services/management"
import { toast } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"
import { logger } from "@/utils/logger"

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
  ChartDataLabels,
)

export default function SpecialistDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("1D")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  })
  const [selectedTenant, setSelectedTenant] = useState("All")
  const [alerts, setAlerts] = useState([])
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [showLogIngestionForm, setShowLogIngestionForm] = useState(false)
  const [newLogData, setNewLogData] = useState({
    tenant: "",
    ingestionSize: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [logIngestionData, setLogIngestionData] = useState([])
  const [logIngestionUnsubscribe, setLogIngestionUnsubscribe] = useState(null)
  const [showLogTable, setShowLogTable] = useState(false)
  const [isAddingLog, setIsAddingLog] = useState(false)
  const [isDeletingLog, setIsDeletingLog] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [logToDelete, setLogToDelete] = useState(null)
  const [fullscreenChart, setFullscreenChart] = useState(null)

  // Process verification status trends
  const processVerificationTrends = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Filter alerts within date range
    const filteredAlerts = alerts.filter((alert) => {
      const alertDate = new Date(alert.timestamp)
      return alertDate >= start && alertDate <= end
    })

    // Create maps to store counts
    const truePositiveCounts = {}
    const falsePositiveCounts = {}
    const labels = []

    switch (timeRange) {
      case "1D":
        // Hourly data for one day
        for (let hour = 0; hour < 24; hour++) {
          const date = new Date(start)
          date.setHours(hour, 0, 0, 0)
          const hourKey = date.toISOString()
          truePositiveCounts[hourKey] = 0
          falsePositiveCounts[hourKey] = 0
          labels.push(date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }))
        }

        // Count by hour
        filteredAlerts.forEach((alert) => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setMinutes(0, 0, 0)
          const hourKey = alertDate.toISOString()
          if (alert.verificationStatus === "True Positive") {
            truePositiveCounts[hourKey] = (truePositiveCounts[hourKey] || 0) + 1
          } else if (alert.verificationStatus === "False Positive") {
            falsePositiveCounts[hourKey] = (falsePositiveCounts[hourKey] || 0) + 1
          }
        })
        break

      case "7D":
        // Daily data for a week
        for (let i = 0; i < 7; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          date.setHours(0, 0, 0, 0)
          const dayKey = date.toISOString()
          truePositiveCounts[dayKey] = 0
          falsePositiveCounts[dayKey] = 0
          labels.push(date.toLocaleDateString("en-US", { weekday: "short" }))
        }

        // Count by day
        filteredAlerts.forEach((alert) => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setHours(0, 0, 0, 0)
          const dayKey = alertDate.toISOString()
          if (alert.verificationStatus === "True Positive") {
            truePositiveCounts[dayKey] = (truePositiveCounts[dayKey] || 0) + 1
          } else if (alert.verificationStatus === "False Positive") {
            falsePositiveCounts[dayKey] = (falsePositiveCounts[dayKey] || 0) + 1
          }
        })
        break

      case "30D":
      case "1M":
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        for (let i = 0; i < days; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          date.setHours(0, 0, 0, 0)
          const dayKey = date.toISOString()
          truePositiveCounts[dayKey] = 0
          falsePositiveCounts[dayKey] = 0
          labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
        }

        // Count by day
        filteredAlerts.forEach((alert) => {
          const alertDate = new Date(alert.timestamp)
          alertDate.setHours(0, 0, 0, 0)
          const dayKey = alertDate.toISOString()
          if (alert.verificationStatus === "True Positive") {
            truePositiveCounts[dayKey] = (truePositiveCounts[dayKey] || 0) + 1
          } else if (alert.verificationStatus === "False Positive") {
            falsePositiveCounts[dayKey] = (falsePositiveCounts[dayKey] || 0) + 1
          }
        })
        break
    }

    return {
      labels,
      datasets: [
        {
          label: "True Positives",
          data: Object.values(truePositiveCounts),
          backgroundColor: "rgba(34, 197, 94, 0.8)", // green
          borderColor: "rgb(34, 197, 94)",
          tension: 0,
        },
        {
          label: "False Positives",
          data: Object.values(falsePositiveCounts),
          backgroundColor: "rgba(239, 68, 68, 0.8)", // red
          borderColor: "rgb(239, 68, 68)",
          tension: 0,
        },
      ],
    }
  }

  // Process alerts data for tenant distribution
  const processAlertsByTenant = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Filter alerts within the date range
    const filteredAlerts = alerts.filter((alert) => {
      const alertDate = new Date(alert.timestamp)
      return alertDate >= start && alertDate <= end
    })

    const tenantCounts = {}
    filteredAlerts.forEach((alert) => {
      const tenant = alert.tenant || "Unknown"
      tenantCounts[tenant] = (tenantCounts[tenant] || 0) + 1
    })

    // Get unique tenants and sort them alphabetically
    const tenants = Object.keys(tenantCounts).sort()

    return {
      labels: tenants.map((tenant) =>
        tenant === "NIKI"
          ? "Project NIKI"
          : tenant === "SiyCha Group of Companies"
            ? "Project Orion"
            : tenant === "MPIW"
              ? "Project Hunt"
              : tenant === "MWELL"
                ? "Project Chiron"
                : tenant === "Cantilan"
                  ? "Project Atlas"
                  : tenant === "MLHUILLER"
                    ? "Project Midas"
                  : tenant
      ),
      datasets: [
        {
          label: "Alerts by Project",
          data: tenants.map((tenant) => tenantCounts[tenant]),
          backgroundColor: [
            "rgba(6, 182, 212, 0.8)", // cyan
            "rgba(251, 191, 36, 0.8)", // amber
            "rgba(239, 68, 68, 0.8)", // red
            "rgba(34, 197, 94, 0.8)", // green
            "rgba(147, 51, 234, 0.8)", // purple
            "rgba(236, 72, 153, 0.8)", // pink
            "rgba(16, 185, 129, 0.8)", // emerald
            "rgba(245, 158, 11, 0.8)", // yellow
          ],
        },
      ],
    }
  }

  // Process log ingestion data based on time range
  const processLogIngestionData = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    const allData = []
    const allLabels = []
    const allDifferences = []
    const allTrendlineData = []

    // Filter logs within the date range
    const filteredLogs = logIngestionData.filter((log) => {
      const logDate = new Date(log.timestamp)
      return logDate >= start && logDate <= end
    })

    // Group logs by date and tenant
    const logsByDate = {}
    filteredLogs.forEach((log) => {
      const date = new Date(log.timestamp)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString()

      if (!logsByDate[dateKey]) {
        logsByDate[dateKey] = {
          total: 0,
          byTenant: {},
        }
      }

      logsByDate[dateKey].total += log.ingestionSize
      if (!logsByDate[dateKey].byTenant[log.tenant]) {
        logsByDate[dateKey].byTenant[log.tenant] = 0
      }
      logsByDate[dateKey].byTenant[log.tenant] += log.ingestionSize
    })

    // Create data points for each hour in the selected day
    if (timeRange === "1D") {
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
        allData.push(hourTotal)
        allLabels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }))
        
        // Calculate difference from previous hour
        const prevHour = hour > 0 ? allData[hour - 1] : 0
        allDifferences.push(hourTotal - prevHour)
        allTrendlineData.push(hourTotal)
      }
    } else {
      // For weekly and monthly views, use daily aggregation
      const sortedDates = Object.keys(logsByDate).sort()
      if (sortedDates.length === 0) {
        // If no data, add two zero points
        const today = new Date(start)
        const tomorrow = new Date(start)
        tomorrow.setDate(tomorrow.getDate() + 1)

        allData.push(0, 0)
        allDifferences.push(0, 0)
        allTrendlineData.push(0, 0)
        allLabels.push(
          today.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
          tomorrow.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
        )
      } else {
        // Calculate differences and prepare data
        let previousTotal = 0
        sortedDates.forEach((dateKey, index) => {
          const currentTotal = logsByDate[dateKey].total
          const difference = previousTotal > 0 ? currentTotal - previousTotal : 0
          allData.push(currentTotal)
          allDifferences.push(difference)
          allTrendlineData.push(currentTotal)
          const date = new Date(dateKey)
          allLabels.push(date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }))
          previousTotal = currentTotal
        })

        // If only one point, duplicate it
        if (sortedDates.length === 1) {
          allData.push(allData[0])
          allDifferences.push(0)
          allTrendlineData.push(allData[0])
          const nextDate = new Date(sortedDates[0])
          nextDate.setDate(nextDate.getDate() + 1)
          allLabels.push(nextDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }))
        }
      }
    }

    return {
      labels: allLabels,
      datasets: [
        {
          type: "bar",
          label: "Total Ingestion",
          data: allData,
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          borderColor: "rgb(53, 162, 235)",
          borderWidth: 1,
          yAxisID: "y",
          order: 2,
        },
        {
          type: "line",
          label: "Trendline for Total Ingestion",
          data: allTrendlineData,
          borderColor: "rgba(128, 128, 128, 0.5)",
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          yAxisID: "y",
          pointRadius: 0,
          order: 1,
        },
        {
          type: "line",
          label: "Difference",
          data: allDifferences,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderWidth: 2,
          fill: false,
          tension: 0,
          yAxisID: "y1",
          pointRadius: 0,
          order: 0,
        },
      ],
      totalPages: Math.ceil(allData.length / 5),
      currentPage,
    }
  }

  // Get date range based on selected time range
  const getDateRange = () => {
    const today = new Date()

    switch (timeRange) {
      case "1D":
        const selectedDateObj = new Date(selectedDate)
        selectedDateObj.setHours(0, 0, 0, 0)
        const nextDay = new Date(selectedDateObj)
        nextDay.setDate(selectedDateObj.getDate() + 1)
        return {
          startDate: selectedDateObj.toISOString(),
          endDate: nextDay.toISOString(),
        }
      case "7D":
        const weekAgo = new Date()
        weekAgo.setDate(today.getDate() - 6)
        weekAgo.setHours(0, 0, 0, 0)
        today.setHours(23, 59, 59, 999)
        return {
          startDate: weekAgo.toISOString(),
          endDate: today.toISOString(),
        }
      case "1M":
        const [year, month] = selectedMonth.split("-")
        const startOfMonth = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
        const endOfMonth = new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999)
        return {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
        }
      default:
        const defaultDate = new Date()
        defaultDate.setHours(0, 0, 0, 0)
        const defaultEnd = new Date()
        defaultEnd.setHours(23, 59, 59, 999)
        return {
          startDate: defaultDate.toISOString(),
          endDate: defaultEnd.toISOString(),
        }
    }
  }

  // Set up real-time listener
  useEffect(() => {
    let unsubscribeAlerts = () => {}

    try {
      setLoading(true)

      // Set up real-time listener for alerts
      const { startDate, endDate } = getDateRange()
      unsubscribeAlerts = listenToAlerts(
        {
          tenant: selectedTenant === "All" ? null : selectedTenant,
          startDate,
          endDate,
          month: timeRange === "1M" ? selectedMonth : undefined,
        },
        (newAlerts) => {
          setAlerts(newAlerts)
          setLoading(false)
        },
      )

      setUnsubscribe(() => unsubscribeAlerts)
    } catch (error) {
      logger.error("Error setting up alerts listener:", error)
      setLoading(false)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, selectedTenant])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/auth/signin")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Add this function to handle log data submission
  const handleLogDataSubmit = async (e) => {
    e.preventDefault()
    setIsAddingLog(true)
    try {
      await addLogIngestionData({
        tenant: newLogData.tenant,
        ingestionSize: Number.parseFloat(newLogData.ingestionSize),
        timestamp: new Date(newLogData.date).toISOString(),
      })

      // Reset form
      setNewLogData({
        tenant: "",
        ingestionSize: "",
        date: new Date().toISOString().split("T")[0],
      })
      setShowLogIngestionForm(false)
      toast.success("Log data added successfully")
    } catch (error) {
      logger.error("Error adding log data:", error)
      toast.error("Failed to add log data")
    } finally {
      setIsAddingLog(false)
    }
  }

  // Add useEffect for log ingestion data
  useEffect(() => {
    let unsubscribeLogIngestion = () => {}

    try {
      const { startDate, endDate } = getDateRange()
      unsubscribeLogIngestion = listenToLogIngestion(
        {
          tenant: selectedTenant === "All" ? null : selectedTenant,
          startDate,
          endDate,
        },
        (newLogs) => {
          setLogIngestionData(newLogs)
        },
      )

      setLogIngestionUnsubscribe(() => unsubscribeLogIngestion)
    } catch (error) {
      logger.error("Error setting up log ingestion listener:", error)
    }

    return () => {
      if (logIngestionUnsubscribe) logIngestionUnsubscribe()
    }
  }, [timeRange, selectedDate, selectedMonth, selectedTenant])

  // Add handleDeleteLogData function after handleLogDataSubmit
  const handleDeleteLogData = async (logId) => {
    const log = logIngestionData.find(l => l.id === logId)
    setLogToDelete(log)
    setShowDeleteConfirmModal(true)
  }

  const confirmDeleteLogData = async () => {
    if (!logToDelete) return
    setIsDeletingLog(true)
    try {
      const result = await deleteLogIngestionData(logToDelete.id)
      if (result.success) {
        toast.success("Log data deleted successfully")
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error deleting log data:", error)
      toast.error("Failed to delete log data")
    } finally {
      setIsDeletingLog(false)
      setShowDeleteConfirmModal(false)
      setLogToDelete(null)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-mono">
            Security Specialist Dashboard
          </h1>
          <div className="flex gap-4">
            {/*<button
              onClick={() => router.push("/dashboard/data-sensors")}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
            >
              View Sensors
            </button> */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
            >
              <option value="1D">Daily View</option>
              <option value="7D">Weekly View</option>
              <option value="1M">Monthly View</option>
            </select>

            {timeRange === "1D" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
              />
            )}

            {timeRange === "1M" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
              />
            )}

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
            >
              <option>All</option>
              <option value="NIKI">Project NIKI</option>
              <option value="SiyCha Group of Companies">Project Orion</option>
              <option value="MPIW">Project Hunt</option>
              <option value="MWELL">Project Chiron</option>
              <option value="Cantilan">Project Atlas</option>
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
            const filteredAlerts = alerts.filter((alert) => {
              const alertDate = new Date(alert.timestamp)
              return alertDate >= start && alertDate <= end
            })

            // Get alerts from previous period for comparison
            const previousStart = new Date(start)
            const previousEnd = new Date(end)
            const timeDiff = end.getTime() - start.getTime()
            previousStart.setTime(previousStart.getTime() - timeDiff)
            previousEnd.setTime(previousEnd.getTime() - timeDiff)

            const previousAlerts = alerts.filter((alert) => {
              const alertDate = new Date(alert.timestamp)
              return alertDate >= previousStart && alertDate < start
            })

            // Calculate critical incidents
            const criticalIncidents = filteredAlerts.filter(
              (alert) => alert.status?.toLowerCase() === "critical" || alert.verificationStatus === "True Positive",
            ).length

            const previousCriticalIncidents = previousAlerts.filter(
              (alert) => alert.status?.toLowerCase() === "critical" || alert.verificationStatus === "True Positive",
            ).length

            // Calculate resolution rate
            const resolvedAlerts = filteredAlerts.filter((alert) => alert.status?.toLowerCase() === "closed").length
            const resolutionRate =
              filteredAlerts.length > 0 ? Math.round((resolvedAlerts / filteredAlerts.length) * 100) : 0

            const previousResolvedAlerts = previousAlerts.filter(
              (alert) => alert.status?.toLowerCase() === "closed",
            ).length
            const previousResolutionRate =
              previousAlerts.length > 0 ? Math.round((previousResolvedAlerts / previousAlerts.length) * 100) : 0

            // Calculate percentage changes
            const alertsChange =
              previousAlerts.length > 0
                ? Math.round(((filteredAlerts.length - previousAlerts.length) / previousAlerts.length) * 100)
                : 0

            const criticalChange =
              previousCriticalIncidents > 0
                ? Math.round(((criticalIncidents - previousCriticalIncidents) / previousCriticalIncidents) * 100)
                : 0

            const resolutionChange = previousResolutionRate > 0 ? resolutionRate - previousResolutionRate : 0

            const stats = [
              {
                title: "Total Alerts",
                value: filteredAlerts.length.toLocaleString(),
                change: `${alertsChange >= 0 ? "+" : ""}${alertsChange}%`,
                color: "yellow",
              },
              {
                title: "Critical Incidents",
                value: criticalIncidents.toLocaleString(),
                change: `${criticalChange >= 0 ? "+" : ""}${criticalChange}%`,
                color: "red",
              },
              {
                title: "Resolution Rate",
                value: `${resolutionRate}%`,
                change: `${resolutionChange >= 0 ? "+" : ""}${resolutionChange}%`,
                color: "green",
              },
            ]

            return stats.map((stat, index) => (
              <div key={index} className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
                <h3 className="text-gray-400 font-mono text-sm mb-2">{stat.title}</h3>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
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
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold font-mono">Total Log Ingestion</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setFullscreenChart("total-ingestion")}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowLogTable(!showLogTable)}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
                >
                  {showLogTable ? "Show Chart" : "Show Table"}
                </button>
                <button
                  onClick={() => setShowLogIngestionForm(!showLogIngestionForm)}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
                >
                  Add Log Data
                </button>
              </div>
            </div>

            {showLogIngestionForm && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <form onSubmit={handleLogDataSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Project</label>
                      <select
                        value={newLogData.tenant}
                        onChange={(e) => setNewLogData({ ...newLogData, tenant: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono text-sm"
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
                      <label className="block text-sm font-mono mb-1 text-gray-400">Ingestion Size (GB)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newLogData.ingestionSize}
                        onChange={(e) => setNewLogData({ ...newLogData, ingestionSize: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-mono mb-1 text-gray-400">Date</label>
                      <input
                        type="date"
                        value={newLogData.date}
                        onChange={(e) => setNewLogData({ ...newLogData, date: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogIngestionForm(false)}
                      className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/70 transition-colors font-mono text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingLog}
                      className={`px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm flex items-center gap-2 ${
                        isAddingLog ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isAddingLog ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-yellow-400"
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
                          Adding...
                        </>
                      ) : (
                        "Add Data"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="h-[300px]">
              {showLogTable ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="pb-3 font-mono">Date</th>
                        <th className="pb-3 font-mono">Project</th>
                        <th className="pb-3 font-mono">Ingestion Size (GB)</th>
                        <th className="pb-3 font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {logIngestionData
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(currentPage * 5, (currentPage + 1) * 5)
                        .map((log) => {
                          const timestamp = new Date(log.timestamp)
                          const dateString = timestamp.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })

                          return (
                            <tr key={log.id} className="border-t border-gray-700">
                              <td className="py-2 font-mono">{dateString}</td>
                              <td className="py-2 font-mono">
                                {log.tenant === "NIKI"
                                  ? "Project NIKI"
                                  : log.tenant === "SiyCha Group of Companies"
                                    ? "Project Orion"
                                    : log.tenant === "MPIW"
                                      ? "Project Hunt"
                                      : log.tenant === "MWELL"
                                        ? "Project Chiron"
                                        : log.tenant}
                              </td>
                              <td className="py-2 font-mono">{log.ingestionSize.toFixed(2)}</td>
                              <td className="py-2">
                                <button
                                  onClick={() => handleDeleteLogData(log.id)}
                                  disabled={isDeletingLog}
                                  className={`px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors font-mono text-xs flex items-center gap-1 ${
                                    isDeletingLog ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                >
                                  {isDeletingLog ? (
                                    <>
                                      <svg
                                        className="animate-spin h-3 w-3 text-red-400"
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
                                    "Delete"
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
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors font-mono text-sm ${
                        currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-gray-400 font-mono text-sm">
                      Page {currentPage + 1} of {Math.ceil(logIngestionData.length / 5)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(Math.ceil(logIngestionData.length / 5) - 1, prev + 1))
                      }
                      disabled={currentPage >= Math.ceil(logIngestionData.length / 5) - 1}
                      className={`px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors font-mono text-sm ${
                        currentPage >= Math.ceil(logIngestionData.length / 5) - 1 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="h-[250px]">
                    <Line
                      data={processLogIngestionData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: "index",
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
                            type: "linear",
                            display: true,
                            position: "left",
                            beginAtZero: true,
                            grid: {
                              color: "rgba(255, 255, 255, 0.1)",
                            },
                            ticks: {
                              color: "#9CA3AF",
                              callback: (value) => `${typeof value === "number" ? value.toFixed(2) : 0} GB`,
                            },
                          },
                          y1: {
                            type: "linear",
                            display: true,
                            position: "right",
                            beginAtZero: true,
                            grid: {
                              drawOnChartArea: false,
                            },
                            ticks: {
                              color: "#9CA3AF",
                              callback: (value) =>
                                `${value > 0 ? "+" : ""}${typeof value === "number" ? value.toFixed(2) : 0} GB`,
                            },
                          },
                          x: {
                            grid: {
                              color: "rgba(255, 255, 255, 0.1)",
                            },
                            ticks: {
                              color: "#9CA3AF",
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            labels: { color: "#9CA3AF" },
                          },
                          tooltip: {
                            enabled: true,
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                              label: (context) => {
                                const label = context.dataset.label || ""
                                const value = context.parsed.y
                                if (label === "Difference") {
                                  return `${label}: ${value > 0 ? "+" : ""}${typeof value === "number" ? value.toFixed(2) : 0} GB`
                                }
                                return `${label}: ${typeof value === "number" ? value.toFixed(2) : 0} GB`
                              },
                            },
                          },
                          datalabels: {
                            display: (context) => context.dataset.type === "bar",
                            color: "#9CA3AF",
                            anchor: "end",
                            align: "top",
                            offset: 5,
                            font: {
                              weight: "bold",
                              size: 11,
                            },
                            formatter: (value) => {
                              return `${typeof value === "number" ? value.toFixed(2) : 0} GB`
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Log Ingestion Breakdown per Project */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold font-mono">Log Ingestion per Project</h3>
              <button
                onClick={() => setFullscreenChart("project-breakdown")}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="h-[400px]">
              <Bar
                data={(() => {
                  const { startDate, endDate } = getDateRange()
                  const start = new Date(startDate)
                  const end = new Date(endDate)

                  // Filter logs within date range
                  const filteredLogs = logIngestionData.filter((log) => {
                    const logDate = new Date(log.timestamp)
                    return logDate >= start && logDate <= end
                  })

                  // Group logs by date and tenant
                  const logsByDate = {}
                  filteredLogs.forEach((log) => {
                    const date = new Date(log.timestamp)
                    date.setHours(0, 0, 0, 0)
                    const dateKey = date.toISOString()

                    if (!logsByDate[dateKey]) {
                      logsByDate[dateKey] = {
                        MWELL: 0,
                        Cantilan: 0,
                        NIKI: 0,
                        MPIW: 0,
                        "SiyCha Group of Companies": 0
                      }
                    }
                    logsByDate[dateKey][log.tenant] += log.ingestionSize
                  })

                  // Sort dates
                  const sortedDates = Object.keys(logsByDate).sort()

                  // Format labels based on time range
                  const labels = sortedDates.map(dateKey => {
                    const date = new Date(dateKey)
                    if (timeRange === "1D") {
                      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                    } else if (timeRange === "7D") {
                      return date.toLocaleDateString('en-US', { weekday: 'short' })
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                    }
                  })

                  // Create datasets
                  const datasets = [
                    {
                      label: "Project Chiron",
                      data: sortedDates.map(date => logsByDate[date].MWELL),
                      backgroundColor: "rgb(239, 68, 68)",
                    },
                    {
                      label: "Project Atlas",
                      data: sortedDates.map(date => logsByDate[date].Cantilan),
                      backgroundColor: "rgb(34, 197, 94)",
                    },
                    {
                      label: "Project NIKI",
                      data: sortedDates.map(date => logsByDate[date].NIKI),
                      backgroundColor: "rgb(251, 191, 36)",
                    },
                    {
                      label: "Project Hunt",
                      data: sortedDates.map(date => logsByDate[date].MPIW),
                      backgroundColor: "rgb(6, 182, 212)",
                    },
                    {
                      label: "Project Orion",
                      data: sortedDates.map(date => logsByDate[date]["SiyCha Group of Companies"]),
                      backgroundColor: "rgb(147, 51, 234)",
                    }
                  ]

                  return { labels, datasets }
                })()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      stacked: true,
                      grid: {
                        color: "rgba(255, 255, 255, 0.1)",
                      },
                      ticks: { 
                        color: "#9CA3AF",
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      stacked: true,
                      grid: {
                        color: "rgba(255, 255, 255, 0.1)",
                      },
                      ticks: {
                        color: "#9CA3AF",
                        callback: (value) => `${value.toFixed(2)} GB`
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { 
                        color: "#9CA3AF",
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
                    },
                    tooltip: {
                      enabled: true,
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      titleColor: "#fff",
                      bodyColor: "#fff",
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || ''
                          const value = context.parsed.y
                          return `${label}: ${value.toFixed(2)} GB`
                        }
                      }
                    },
                    datalabels: {
                      display: function(context) {
                        // Only show if value is significant enough (greater than 0.1)
                        return context.dataset.data[context.dataIndex] > 0.1
                      },
                      color: '#fff',
                      // Adjust anchor and alignment based on position in stack
                      anchor: function(context) {
                        const value = context.dataset.data[context.dataIndex]
                        const meta = context.chart.getDatasetMeta(context.datasetIndex)
                        const total = meta.total
                        // If value is small relative to total, show label outside
                        return value < total / 10 ? 'end' : 'center'
                      },
                      align: function(context) {
                        const value = context.dataset.data[context.dataIndex]
                        const meta = context.chart.getDatasetMeta(context.datasetIndex)
                        const total = meta.total
                        // If value is small relative to total, show label outside
                        return value < total / 10 ? 'end' : 'center'
                      },
                      offset: function(context) {
                        const value = context.dataset.data[context.dataIndex]
                        const meta = context.chart.getDatasetMeta(context.datasetIndex)
                        const total = meta.total
                        // Add offset for outside labels
                        return value < total / 10 ? 4 : 0
                      },
                      formatter: (value) => {
                        // Format with different precision based on value size
                        if (value >= 10) {
                          return value.toFixed(1)
                        } else if (value >= 1) {
                          return value.toFixed(2)
                        }
                        return value.toFixed(2)
                      },
                      font: function(context) {
                        const value = context.dataset.data[context.dataIndex]
                        const meta = context.chart.getDatasetMeta(context.datasetIndex)
                        const total = meta.total
                        // Adjust font size based on value significance
                        const size = value < total / 10 ? 10 : 11
                        return {
                          weight: 'bold',
                          size: size
                        }
                      },
                      textStrokeColor: 'rgba(0, 0, 0, 0.75)',
                      textStrokeWidth: 3,
                      textShadowBlur: 5,
                      textShadowColor: 'rgba(0, 0, 0, 0.75)',
                      padding: {
                        top: 2,
                        bottom: 2,
                        left: 4,
                        right: 4
                      },
                      listeners: {
                        // Prevent labels from overlapping
                        beforeDraw: function(context) {
                          const chart = context.chart
                          const meta = chart.getDatasetMeta(context.datasetIndex)
                          const element = meta.data[context.dataIndex]
                          const position = element.tooltipPosition()
                          const dataset = context.dataset
                          const value = dataset.data[context.dataIndex]
                          
                          // Skip small values or if position is undefined
                          if (value < 0.1 || !position) {
                            return false
                          }
                          return true
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Alerts by Tenant */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold font-mono">Alerts by Project</h3>
              <button
                onClick={() => setFullscreenChart("alerts-by-tenant")}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="h-[300px] flex justify-center">
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
                      textShadowColor: 'rgba(0, 0, 0, 0.75)',
                      padding: {
                        top: 2,
                        bottom: 2,
                        left: 4,
                        right: 4
                      },
                      listeners: {
                        // Prevent labels from overlapping
                        beforeDraw: function(context) {
                          const chart = context.chart
                          const meta = chart.getDatasetMeta(context.datasetIndex)
                          const element = meta.data[context.dataIndex]
                          const position = element.tooltipPosition()
                          const dataset = context.dataset
                          const value = dataset.data[context.dataIndex]
                          
                          // Skip small values or if position is undefined
                          if (value < 0.1 || !position) {
                            return false
                          }
                          return true
                        }
                      }
                    }
                  },
                  layout: {
                    padding: {
                      right: 10
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Incident Trends */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold font-mono">Verification Status Trends</h3>
              <button
                onClick={() => setFullscreenChart("incident-trends")}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="h-[300px]">
              <Bar
                data={processVerificationTrends()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: "rgba(255, 255, 255, 0.1)",
                      },
                      ticks: { color: "#9CA3AF" },
                    },
                    x: {
                      grid: {
                        color: "rgba(255, 255, 255, 0.1)",
                      },
                      ticks: { color: "#9CA3AF" },
                    },
                  },
                  plugins: {
                    legend: {
                      labels: { color: "#9CA3AF" },
                    },
                    datalabels: {
                      color: "#9CA3AF",
                      anchor: "end",
                      align: "top",
                      formatter: (value) => value,
                      font: {
                        weight: "bold",
                        size: 12,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Recent Alerts Table */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <h3 className="text-xl font-bold mb-4 font-mono">Recent Alerts</h3>
            <div className="overflow-x-auto">
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
                      const dateTimeString = timestamp.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })

                      // Determine status and color based on alert status
                      let statusColor = ""
                      let statusText = alert.status || "New"

                      switch (statusText.toLowerCase()) {
                        case "closed":
                          statusColor = "green"
                          break
                        case "in progress":
                          statusColor = "yellow"
                          break
                        case "new":
                        default:
                          statusColor = "red"
                          statusText = "New"
                          break
                      }

                      return (
                        <tr key={alert.id || index} className="border-t border-gray-700">
                          <td className="py-2 font-mono">{dateTimeString}</td>
                          <td className="py-2 font-mono">
                            {alert.tenant === "NIKI"
                              ? "Project NIKI"
                              : alert.tenant === "SiyCha Group of Companies"
                                ? "Project Orion"
                                : alert.tenant === "MPIW"
                                  ? "Project Hunt"
                                  : alert.tenant === "MWELL"
                                    ? "Project Chiron"
                                    : alert.tenant || "Unknown"}
                          </td>
                          <td className="py-2 font-mono whitespace-normal max-w-[300px]">
                            {alert.alertName || alert.technique || "Unknown"}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-mono
                              ${
                                statusColor === "red"
                                  ? "bg-red-500/20 text-red-400"
                                  : statusColor === "green"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
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
                <h2 className="text-xl font-bold text-red-400">Confirm Log Data Deletion</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Log Details:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Project:</span>
                      <span className="text-red-300">
                        {logToDelete?.tenant === "NIKI"
                          ? "Project NIKI"
                          : logToDelete?.tenant === "SiyCha Group of Companies"
                            ? "Project Orion"
                            : logToDelete?.tenant === "MPIW"
                              ? "Project Hunt"
                              : logToDelete?.tenant === "MWELL"
                                ? "Project Chiron"
                                : logToDelete?.tenant}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ingestion Size:</span>
                      <span className="text-red-300">{logToDelete?.ingestionSize.toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-red-300">
                        {new Date(logToDelete?.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    Are you sure you want to delete this log data? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false)
                    setLogToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteLogData}
                  disabled={isDeletingLog}
                  className={`px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors duration-200 flex items-center gap-2 ${
                    isDeletingLog ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isDeletingLog ? (
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
                    "Delete Log Data"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Chart Modal */}
      <AnimatePresence>
        {fullscreenChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-[90vw] w-full max-h-[90vh] border border-yellow-500/20"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-100 font-mono">
                  {fullscreenChart === "total-ingestion" && "Total Log Ingestion"}
                  {fullscreenChart === "project-breakdown" && "Log Ingestion per Project"}
                  {fullscreenChart === "alerts-by-tenant" && "Alerts by Project"}
                  {fullscreenChart === "incident-trends" && "Verification Status Trends"}
                </h2>
                <button
                  onClick={() => setFullscreenChart(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[70vh]">
                {fullscreenChart === "total-ingestion" && (
                  <Line
                    data={(() => {
                      const data = processLogIngestionData()
                      // Enhance the visual properties for fullscreen
                      return {
                        ...data,
                        datasets: data.datasets.map(dataset => ({
                          ...dataset,
                          borderWidth: dataset.type === 'line' ? 3 : 2,
                          pointRadius: dataset.type === 'line' ? 4 : 0,
                          pointHoverRadius: 8,
                          pointBorderWidth: 2,
                          pointBackgroundColor: dataset.borderColor,
                          pointBorderColor: '#fff',
                          // Remove tension from here as it's causing issues
                          tension: 0
                        }))
                      }
                    })()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                      },
                      elements: {
                        line: {
                          // Set a fixed tension of 0 to prevent the error
                          tension: 0
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                            drawBorder: false
                          },
                          ticks: {
                            color: "#9CA3AF",
                            font: {
                              size: 14
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 10
                          }
                        },
                        y: {
                          type: "linear",
                          display: true,
                          position: "left",
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                            drawBorder: false
                          },
                          ticks: {
                            color: "#9CA3AF",
                            font: {
                              size: 14
                            },
                            padding: 10,
                            callback: (value) => `${value.toFixed(2)} GB`
                          },
                          border: {
                            dash: [4, 4]
                          }
                        },
                        y1: {
                          type: "linear",
                          display: true,
                          position: "right",
                          grid: {
                            drawOnChartArea: false,
                            drawBorder: false
                          },
                          ticks: {
                            color: "#9CA3AF",
                            font: {
                              size: 14
                            },
                            padding: 10,
                            callback: (value) => `${value > 0 ? "+" : ""}${value.toFixed(2)} GB`
                          },
                          border: {
                            dash: [4, 4]
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          align: 'center',
                          labels: {
                            color: "#9CA3AF",
                            font: {
                              size: 14,
                              weight: 'bold'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          titleColor: "#fff",
                          bodyColor: "#fff",
                          titleFont: {
                            size: 16,
                            weight: 'bold'
                          },
                          bodyFont: {
                            size: 14
                          },
                          padding: 12,
                          cornerRadius: 8,
                          displayColors: true,
                          borderColor: "rgba(255, 255, 255, 0.2)",
                          borderWidth: 1,
                          callbacks: {
                            title: (tooltipItems) => {
                              return tooltipItems[0].label
                            },
                            label: (context) => {
                              const label = context.dataset.label || ''
                              const value = context.parsed.y
                              if (label === "Difference") {
                                return `${label}: ${value > 0 ? "+" : ""}${value.toFixed(2)} GB`
                              }
                              return `${label}: ${value.toFixed(2)} GB`
                            }
                          }
                        },
                        datalabels: {
                          display: (context) => {
                            // Only show data labels for bar type and significant values
                            return context.dataset.type === 'bar' && context.dataset.data[context.dataIndex] > 0.1
                          },
                          color: '#fff',
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          padding: 8,
                          textStrokeColor: 'rgba(0, 0, 0, 0.75)',
                          textStrokeWidth: 4,
                          textShadowBlur: 6,
                          textShadowColor: 'rgba(0, 0, 0, 0.75)',
                          formatter: (value) => {
                            return `${value.toFixed(2)} GB`
                          },
                          anchor: 'end',
                          align: 'top',
                          offset: 4
                        }
                      }
                    }}
                  />
                )}
                {fullscreenChart === "project-breakdown" && (
                  <Bar
                    data={(() => {
                      const { startDate, endDate } = getDateRange()
                      const start = new Date(startDate)
                      const end = new Date(endDate)
 
                      // Filter logs within date range
                      const filteredLogs = logIngestionData.filter((log) => {
                        const logDate = new Date(log.timestamp)
                        return logDate >= start && logDate <= end
                      })
 
                      // Group logs by date and tenant
                      const logsByDate = {}
                      filteredLogs.forEach((log) => {
                        const date = new Date(log.timestamp)
                        date.setHours(0, 0, 0, 0)
                        const dateKey = date.toISOString()
 
                        if (!logsByDate[dateKey]) {
                          logsByDate[dateKey] = {
                            MWELL: 0,
                            Cantilan: 0,
                            NIKI: 0,
                            MPIW: 0,
                            "SiyCha Group of Companies": 0
                          }
                        }
                        logsByDate[dateKey][log.tenant] += log.ingestionSize
                      })
 
                      // Sort dates
                      const sortedDates = Object.keys(logsByDate).sort()
 
                      // Format labels based on time range
                      const labels = sortedDates.map(dateKey => {
                        const date = new Date(dateKey)
                        if (timeRange === "1D") {
                          return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                        } else if (timeRange === "7D") {
                          return date.toLocaleDateString('en-US', { weekday: 'short' })
                        } else {
                          return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                        }
                      })
 
                      // Create datasets
                      const datasets = [
                        {
                          label: "Project Chiron",
                          data: sortedDates.map(date => logsByDate[date].MWELL),
                          backgroundColor: "rgb(239, 68, 68)",
                        },
                        {
                          label: "Project Atlas",
                          data: sortedDates.map(date => logsByDate[date].Cantilan),
                          backgroundColor: "rgb(34, 197, 94)",
                        },
                        {
                          label: "Project NIKI",
                          data: sortedDates.map(date => logsByDate[date].NIKI),
                          backgroundColor: "rgb(251, 191, 36)",
                        },
                        {
                          label: "Project Hunt",
                          data: sortedDates.map(date => logsByDate[date].MPIW),
                          backgroundColor: "rgb(6, 182, 212)",
                        },
                        {
                          label: "Project Orion",
                          data: sortedDates.map(date => logsByDate[date]["SiyCha Group of Companies"]),
                          backgroundColor: "rgb(147, 51, 234)",
                        }
                      ]
 
                      return { labels, datasets }
                    })()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          stacked: true,
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: { 
                            color: "#9CA3AF",
                            maxRotation: 45,
                            minRotation: 45
                          }
                        },
                        y: {
                          stacked: true,
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: {
                            color: "#9CA3AF",
                            callback: (value) => `${value.toFixed(2)} GB`
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { 
                            color: "#9CA3AF",
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                              size: 14
                            }
                          }
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          titleColor: "#fff",
                          bodyColor: "#fff",
                          titleFont: {
                            size: 16
                          },
                          bodyFont: {
                            size: 14
                          },
                          padding: 12,
                          callbacks: {
                            label: (context) => {
                              const label = context.dataset.label || ''
                              const value = context.parsed.y
                              return `${label}: ${value.toFixed(2)} GB`
                            }
                          }
                        },
                        datalabels: {
                          display: function(context) {
                            return context.dataset.data[context.dataIndex] > 0.1
                          },
                          color: '#fff',
                          anchor: function(context) {
                            const value = context.dataset.data[context.dataIndex]
                            const meta = context.chart.getDatasetMeta(context.datasetIndex)
                            const total = meta.total
                            return value < total / 10 ? 'end' : 'center'
                          },
                          align: function(context) {
                            const value = context.dataset.data[context.dataIndex]
                            const meta = context.chart.getDatasetMeta(context.datasetIndex)
                            const total = meta.total
                            return value < total / 10 ? 'end' : 'center'
                          },
                          formatter: (value) => {
                            if (value >= 10) {
                              return value.toFixed(1)
                            } else if (value >= 1) {
                              return value.toFixed(2)
                            }
                            return value.toFixed(2)
                          },
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          textStrokeColor: 'rgba(0, 0, 0, 0.75)',
                          textStrokeWidth: 4,
                          textShadowBlur: 6,
                          textShadowColor: 'rgba(0, 0, 0, 0.75)',
                          padding: 8
                        }
                      }
                    }}
                  />
                )}
                {fullscreenChart === "alerts-by-tenant" && (
                  <Doughnut
                    data={processAlertsByTenant()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { 
                            color: "#9CA3AF",
                            font: {
                              size: 14
                            }
                          }
                        },
                        datalabels: {
                          color: '#fff',
                          font: {
                            weight: 'bold',
                            size: 16
                          }
                        }
                      }
                    }}
                  />
                )}
                {fullscreenChart === "incident-trends" && (
                  <Bar
                    data={processVerificationTrends()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { 
                            color: "#9CA3AF",
                            font: {
                              size: 14
                            }
                          }
                        },
                        datalabels: {
                          color: '#fff',
                          font: {
                            weight: 'bold',
                            size: 14
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

