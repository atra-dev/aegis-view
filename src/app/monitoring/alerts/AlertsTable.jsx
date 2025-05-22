"use client"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { listenToAlerts, updateAlert, deleteAlert, saveAlert } from "@/services/management"
import { auth, firedb } from "@/services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { logger } from '@/utils/logger'


// Add ConfirmationModal component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, itemCount = 1, type = "delete" }) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case "delete":
        return (
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case "update":
        return (
          <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case "edit":
        return (
          <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        )
      default:
        return null
    }
  }

  const getButtonColor = () => {
    switch (type) {
      case "delete":
        return "bg-red-500/20 text-red-300 hover:bg-red-500/30"
      case "update":
        return "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
      case "edit":
        return "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30"
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"></div>
        </div>

        <div className="inline-block transform overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-500/20 sm:mx-0 sm:h-10 sm:w-10">
              {getIcon()}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-200">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-400">{message}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${getButtonColor()}`}
              onClick={onConfirm}
            >
              {type === "delete" ? `Delete ${itemCount > 1 ? `${itemCount} items` : "item"}` : 
               type === "update" ? `Update ${itemCount > 1 ? `${itemCount} items` : "item"}` :
               type === "edit" ? "Save Changes" : "Confirm"}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Update DeleteConfirmationModal to use ConfirmationModal
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, itemCount = 1 }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      itemCount={itemCount}
      type="delete"
    />
  )
}

// Add ProgressModal component
const ProgressModal = ({ isOpen, title, message, progress, total, status, onCancel }) => {
  if (!isOpen) return null

  const percentage = Math.round((progress / total) * 100)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"></div>
        </div>

        <div className="inline-block transform overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-200">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-400">{message}</p>
              </div>
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-cyan-400">{status}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-cyan-400">{percentage}%</span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AlertsTable() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("Closed")
  const [filterVerification, setFilterVerification] = useState("all")
  const [viewType, setViewType] = useState("daily")
  const [currentPage, setCurrentPage] = useState(0)
  const [userRole, setUserRole] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Get current date in Philippine time
    const now = new Date()
    const philippineDate = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const year = philippineDate.getFullYear()
    const month = String(philippineDate.getMonth() + 1).padStart(2, "0")
    return `${year}-${month}`
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in Philippine time
    const now = new Date()
    const philippineDate = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const year = philippineDate.getFullYear()
    const month = String(philippineDate.getMonth() + 1).padStart(2, "0")
    const day = String(philippineDate.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })
  const [filterTenant, setFilterTenant] = useState("all")
  const [filterKillChain, setFilterKillChain] = useState("all")
  const [expandedAlert, setExpandedAlert] = useState(null)
  const [editingAlert, setEditingAlert] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [unsubscribe, setUnsubscribe] = useState(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState({})
  const [expandedRemarks, setExpandedRemarks] = useState({})
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvError, setCsvError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" })
  const [newAlertIds, setNewAlertIds] = useState(new Set())
  const [selectedAlerts, setSelectedAlerts] = useState(new Set())
  const [isOperationCancelled, setIsOperationCancelled] = useState(false)

  // Add state for confirmation modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    title: "",
    message: "",
    itemCount: 1,
    onConfirm: () => {},
  })

  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateModalConfig, setUpdateModalConfig] = useState({
    title: "",
    message: "",
    itemCount: 1,
    onConfirm: () => {},
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editModalConfig, setEditModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  })

  // Add state for progress modal
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [progressModalConfig, setProgressModalConfig] = useState({
    title: "",
    message: "",
    progress: 0,
    total: 0,
    status: "",
    onCancel: () => {},
  })

  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(true)

  // Get unique values for filters
  const uniqueTenants = useMemo(() => {
    const tenants = new Set(alerts.map((alert) => alert.tenant))
    return Array.from(tenants)
  }, [alerts])

  // Add tenant to project name mapping
  const getProjectName = (tenant) => {
    const tenantMap = {
      NIKI: "Project NIKI",
      MWELL: "Project Chiron",
      MPIW: "Project Hunt",
      "SiyCha Group of Companies": "Project Orion",
      Cantilan: "Project Atlas",
    }
    return tenantMap[tenant] || tenant
  }

  // Add project name to tenant mapping for filtering
  const getTenantFromProject = (projectName) => {
    const projectMap = {
      "Project Chiron": "MWELL",
      "Project Orion": "SiyCha Group of Companies",
      "Project Hunt": "MPIW",
      "Project NIKI": "NIKI",
      "Project Atlas": "Cantilan",
    }
    return projectMap[projectName] || projectName
  }

  const uniqueKillChains = useMemo(() => {
    const killChains = new Set(alerts.map((alert) => alert.killChainStage))
    return Array.from(killChains)
  }, [alerts])

  // Add requestSort function
  const requestSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }

  // Modify filteredAlerts to use simple Philippine time comparison
  const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter((alert) => {
      if (!alert) return false

      const matchesSearch =
        searchTerm === "" ||
        (alert.alertName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (alert.hostname?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (alert.sourceIp || "").includes(searchTerm) ||
        (alert.destinationIp || "").includes(searchTerm)

      const matchesStatus = alert.status === filterStatus

      // Simple date comparison using Philippine time
      const matchesDate = (() => {
        if (!alert.timestamp) return false

        // Convert timestamp to Philippine time (UTC+8)
        const date = new Date(alert.timestamp)
        // Get Philippine date string in YYYY-MM-DD format
        const phDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
        const phYear = phDate.getUTCFullYear()
        const phMonth = String(phDate.getUTCMonth() + 1).padStart(2, "0")
        const phDay = String(phDate.getUTCDate()).padStart(2, "0")
        const phDateString = `${phYear}-${phMonth}-${phDay}`

        if (viewType === "monthly") {
          return phDateString.startsWith(selectedMonth)
        }
        return phDateString === selectedDate
      })()

      const matchesTenant = filterTenant === "all" || alert.tenant === filterTenant
      const matchesKillChain = filterKillChain === "all" || alert.killChainStage === filterKillChain
      const matchesVerification = filterVerification === "all" || alert.verificationStatus === filterVerification

      return matchesSearch && matchesStatus && matchesDate && matchesTenant && matchesKillChain && matchesVerification
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (sortConfig.key === "timestamp") {
          const dateA = new Date(a.timestamp || 0)
          const dateB = new Date(b.timestamp || 0)
          return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA
        }

        const valueA = a[sortConfig.key] || ""
        const valueB = b[sortConfig.key] || ""

        if (sortConfig.direction === "asc") {
          return valueA.localeCompare(valueB)
        } else {
          return valueB.localeCompare(valueA)
        }
      })
    }

    return filtered
  }, [
    alerts,
    searchTerm,
    filterStatus,
    selectedDate,
    filterTenant,
    filterKillChain,
    filterVerification,
    sortConfig,
    viewType,
    selectedMonth,
  ])

  const itemsPerPage = 20
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage)
  const paginatedAlerts = filteredAlerts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  const getStatusColor = (status) => {
    switch (status) {
      case "New":
        return "bg-red-500/20 text-red-300 border border-red-500/30"
      case "In Progress":
        return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
      case "Closed":
        return "bg-green-500/20 text-green-300 border border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30"
    }
  }

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case "True Positive":
        return "bg-red-500/20 text-red-300 border border-red-500/30"
      case "False Positive":
        return "bg-green-500/20 text-green-300 border border-green-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
    }
  }

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case "True Positive":
        return (
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case "False Positive":
        return (
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  // Update formatDate function to be consistent
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      // Add 8 hours to convert to Philippine time
      const phDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)

      return (
        phDate.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC", // Use UTC with the +8 hours offset already applied
        }) + " (UTC+8)"
      )
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  const handleEditSave = async (alert) => {
    setEditModalConfig({
      title: "Save Changes",
      message: `Are you sure you want to save changes to the alert "${alert.alertName}"?`,
      onConfirm: async () => {
        try {
          const result = await updateAlert(alert.id, {
            status: alert.status,
            verificationStatus: alert.verificationStatus,
            remarks: alert.remarks,
          })

          if (result.success) {
            setEditingAlert(null)
            toast.success("Alert updated successfully")
          } else {
            toast.error("Failed to update alert")
          }
        } catch (error) {
          console.error("Error updating alert:", error)
          toast.error("Failed to update alert")
        } finally {
          setEditModalOpen(false)
        }
      },
    })
    setEditModalOpen(true)
  }

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "-"
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const toggleDescription = (alertId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }))
  }

  const toggleRemarks = (alertId) => {
    setExpandedRemarks((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }))
  }

  // Add useEffect for real-time alerts listener with debug logging
  useEffect(() => {
    setLoading(true)

    logger.log("Setting up alerts listener with filters:", {
      date: viewType === "monthly" ? selectedMonth : selectedDate,
      viewType,
      status: filterStatus,
      tenant: filterTenant !== "all" ? filterTenant : null,
      killChainStage: filterKillChain !== "all" ? filterKillChain : null,
    })

    // Set up real-time listener with current filters
    const unsubscribeListener = listenToAlerts(
      {
        date: viewType === "monthly" ? selectedMonth : selectedDate,
        viewType,
        status: filterStatus,
        tenant: filterTenant !== "all" ? filterTenant : null,
        killChainStage: filterKillChain !== "all" ? filterKillChain : null,
      },
      (fetchedAlerts) => {
        logger.log("Fetched alerts:", {
          count: fetchedAlerts.length,
          firstAlert: fetchedAlerts[0],
          lastAlert: fetchedAlerts[fetchedAlerts.length - 1],
        })
        setAlerts(fetchedAlerts)
        setLoading(false)
      },
    )

    // Store unsubscribe function
    setUnsubscribe(() => unsubscribeListener)

    // Cleanup on unmount or when filters change
    return () => {
      if (unsubscribeListener) {
        unsubscribeListener()
      }
    }
  }, [viewType, selectedDate, selectedMonth, filterStatus, filterTenant, filterKillChain])

  const processCSV = async (file) => {
    try {
      setCsvImporting(true)
      setCsvError(null)

      const text = await file.text()

      // Split into lines, handling potential quoted values
      const rows = text.split(/\r?\n/).filter((row) => row.trim())

      // Parse CSV line, handling quoted fields
      const parseCSVLine = (line) => {
        const result = []
        let inQuotes = false
        let currentValue = ""

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Handle escaped quotes
              currentValue += '"'
              i++
            } else {
              // Toggle quotes state
              inQuotes = !inQuotes
            }
          } else if (char === "," && !inQuotes) {
            // End of field
            result.push(currentValue.trim())
            currentValue = ""
          } else {
            currentValue += char
          }
        }

        // Add the last field
        result.push(currentValue.trim())
        return result
      }

      const headers = parseCSVLine(rows[0]).map((h) => h.trim().toLowerCase())

      // Updated column mapping to match exact CSV headers
      const columnMapping = {
        status: "status",
        "verification status": "verificationStatus",
        "alert name": "alertName",
        timestamp: "timestamp",
        tenant: "tenant",
        "kill chain stage": "killChainStage",
        technique: "technique",
        "src ip": "sourceIp",
        "src ip type": "sourceType",
        "src geo code": "sourceGeo.country",
        "destination ip": "destinationIp",
        "dst ip type": "destinationType",
        "dst geo code": "destinationGeo.country",
        "source host": "host",
        description: "description",
        remarks: "remarks",
        links: "link",
      }

      // Process each row
      const alerts = rows
        .slice(1)
        .filter((row) => row.trim())
        .map((row) => {
          const values = parseCSVLine(row)
          const alert = {
            // Initialize all required fields with default values
            status: "New",
            verificationStatus: "To Be Confirmed",
            alertName: "",
            timestamp: new Date().toISOString(),
            tenant: "",
            killChainStage: "",
            technique: "",
            sourceIp: "",
            sourceType: "",
            sourceGeo: {
              country: "",
              city: "",
            },
            destinationIp: "",
            destinationType: "",
            destinationGeo: {
              country: "",
              city: "",
            },
            host: "",
            description: "",
            remarks: "",
            link: "",
          }

          headers.forEach((header, index) => {
            let value = values[index] || ""

            // Remove surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/""/g, '"')
            }

            // Get the mapped field name
            const mappedField = columnMapping[header.toLowerCase()]
            if (!mappedField) return // Skip unmapped fields

            // Special handling for timestamp
            if (mappedField === "timestamp") {
              try {
                // Handle empty value or invalid characters
                if (!value.trim() || value.includes("#")) {
                  logger.warn(`Invalid timestamp found: "${value}". Using current time instead.`)
                  value = new Date().toISOString()
                } else {
                  // Handle date format "MM/DD/YYYY HH:mm:ss"
                  const [datePart, timePart] = value.split(" ")
                  if (!datePart) {
                    logger.warn(`Invalid date format: "${value}". Using current time instead.`)
                    value = new Date().toISOString()
                  } else {
                    const [month, day, year] = datePart.split("/")
                    let hours = 0, minutes = 0, seconds = 0
                    
                    if (timePart) {
                      [hours, minutes, seconds] = timePart.split(":").map(Number)
                    }

                    // Create date with exact time from CSV
                    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
                    
                    if (isNaN(date.getTime())) {
                      logger.warn(`Invalid date values: "${value}". Using current time instead.`, error)
                      value = new Date().toISOString()
                    } else {
                      value = date.toISOString()
                    }
                  }
                }
              } catch (error) {
                logger.warn(`Error parsing date "${value}". Using current time instead.`, error)
                value = new Date().toISOString()
              }
            }

            // Handle nested objects (sourceGeo, destinationGeo)
            if (mappedField.includes(".")) {
              const [parent, child] = mappedField.split(".")
              if (!alert[parent]) {
                alert[parent] = {}
              }
              alert[parent][child] = value
            } else {
              alert[mappedField] = value
            }
          })

          return alert
        })

      // Show progress modal for import
      setProgressModalConfig({
        title: "Importing Alerts",
        message: `Importing ${alerts.length} alerts from CSV file...`,
        progress: 0,
        total: alerts.length,
        status: "Starting import...",
      })
      setProgressModalOpen(true)

      // Save alerts in batches with progress updates
      const batchSize = 10
      let processedCount = 0

      for (let i = 0; i < alerts.length; i += batchSize) {
        const batch = alerts.slice(i, i + batchSize)
        await Promise.all(batch.map((alert) => saveAlert(alert)))
        processedCount += batch.length

        // Update progress
        setProgressModalConfig((prev) => ({
          ...prev,
          progress: processedCount,
          status: `Processed ${processedCount} of ${alerts.length} alerts...`,
        }))
      }

      setProgressModalOpen(false)
      toast.success(`Successfully imported ${alerts.length} alerts`)
    } catch (error) {
      logger.error("Error processing CSV:", error)
      setCsvError(error.message)
      toast.error(`Failed to import CSV: ${error.message}`)
      setProgressModalOpen(false)
    } finally {
      setCsvImporting(false)
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file")
        return
      }
      processCSV(file)
    }
  }

  const handleDelete = async (alertId) => {
    const alert = alerts.find((a) => a.id === alertId)
    if (!alert) return

    setDeleteModalConfig({
      title: "Delete Alert",
      message: `Are you sure you want to delete the alert "${alert.alertName}"? This action cannot be undone.`,
      itemCount: 1,
      onConfirm: async () => {
        try {
          const result = await deleteAlert(alertId)
          if (result.success) {
            toast.success("Alert deleted successfully")
          } else {
            toast.error("Failed to delete alert")
          }
        } catch (error) {
          console.error("Error deleting alert:", error)
          toast.error("Failed to delete alert")
        } finally {
          setDeleteModalOpen(false)
        }
      },
    })
    setDeleteModalOpen(true)
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const newSelected = new Set(filteredAlerts.map((alert) => alert.id))
      setSelectedAlerts(newSelected)
    } else {
      setSelectedAlerts(new Set())
    }
  }

  const handleSelectAlert = (alertId) => {
    const newSelected = new Set(selectedAlerts)
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId)
    } else {
      newSelected.add(alertId)
    }
    setSelectedAlerts(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedAlerts.size === 0) return

    setDeleteModalConfig({
      title: "Delete Multiple Alerts",
      message: `Are you sure you want to delete ${selectedAlerts.size} selected alerts? This action cannot be undone.`,
      itemCount: selectedAlerts.size,
      onConfirm: async () => {
        setIsOperationCancelled(false);
        try {
          // Show progress modal for deletion
          setProgressModalConfig({
            title: "Deleting Alerts",
            message: `Deleting ${selectedAlerts.size} selected alerts...`,
            progress: 0,
            total: selectedAlerts.size,
            status: "Starting deletion...",
            onCancel: () => {
              setIsOperationCancelled(true);
              setProgressModalOpen(false);
              setSelectedAlerts(new Set());
              toast.info("Operation cancelled");
            }
          });
          setProgressModalOpen(true);

          const alertIds = Array.from(selectedAlerts);
          let processedCount = 0;
          const results = [];

          // Process deletions in batches
          const batchSize = 5;
          for (let i = 0; i < alertIds.length; i += batchSize) {
            if (isOperationCancelled) break;

            const batch = alertIds.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map((alertId) => deleteAlert(alertId)));
            results.push(...batchResults);
            processedCount += batch.length;

            // Update progress
            setProgressModalConfig((prev) => ({
              ...prev,
              progress: processedCount,
              status: `Deleted ${processedCount} of ${selectedAlerts.size} alerts...`,
            }));
          }

          if (!isOperationCancelled) {
            const successCount = results.filter((r) => r.success).length;
            if (successCount > 0) {
              toast.success(`Successfully deleted ${successCount} alerts`);
            }

            const failCount = results.filter((r) => !r.success).length;
            if (failCount > 0) {
              toast.error(`Failed to delete ${failCount} alerts`);
            }
          }
        } catch (error) {
          if (!isOperationCancelled) {
            console.error("Error deleting alerts:", error);
            toast.error("Failed to delete selected alerts");
          }
        } finally {
          setProgressModalOpen(false);
          setDeleteModalOpen(false);
          setSelectedAlerts(new Set());
        }
      },
    });
    setDeleteModalOpen(true);
  };

  const handleBatchStatusUpdate = async (newStatus) => {
    if (selectedAlerts.size === 0 || !newStatus) return

    setUpdateModalConfig({
      title: "Update Alert Statuses",
      message: `Are you sure you want to update the status of ${selectedAlerts.size} selected alerts to "${newStatus}"?`,
      itemCount: selectedAlerts.size,
      onConfirm: async () => {
        setIsOperationCancelled(false)
        try {
          // Show progress modal for batch update
          setProgressModalConfig({
            title: "Updating Alert Statuses",
            message: `Updating status for ${selectedAlerts.size} selected alerts...`,
            progress: 0,
            total: selectedAlerts.size,
            status: "Starting update...",
            onCancel: () => {
              setIsOperationCancelled(true)
              setProgressModalOpen(false)
              setSelectedAlerts(new Set())
              toast.info("Operation cancelled")
            },
          })
          setProgressModalOpen(true)

          const alertIds = Array.from(selectedAlerts)
          let processedCount = 0
          const results = []

          // Process updates in batches
          const batchSize = 5
          for (let i = 0; i < alertIds.length; i += batchSize) {
            if (isOperationCancelled) break

            const batch = alertIds.slice(i, i + batchSize)
            const batchResults = await Promise.all(
              batch.map((alertId) => updateAlert(alertId, { status: newStatus }))
            )
            results.push(...batchResults)
            processedCount += batch.length

            // Update progress
            setProgressModalConfig((prev) => ({
              ...prev,
              progress: processedCount,
              status: `Updated ${processedCount} of ${selectedAlerts.size} alerts...`,
            }))
          }

          if (!isOperationCancelled) {
            const successCount = results.filter((r) => r.success).length
            if (successCount > 0) {
              toast.success(`Successfully updated ${successCount} alerts`)
            }

            const failCount = results.filter((r) => !r.success).length
            if (failCount > 0) {
              toast.error(`Failed to update ${failCount} alerts`)
            }
          }
        } catch (error) {
          if (!isOperationCancelled) {
            console.error("Error updating alerts:", error)
            toast.error("Failed to update selected alerts")
          }
        } finally {
          setProgressModalOpen(false)
          setUpdateModalOpen(false)
          setSelectedAlerts(new Set())
        }
      },
    })
    setUpdateModalOpen(true)
  }

  // Add new handler for batch verification status update
  const handleBatchVerificationUpdate = async (newVerificationStatus) => {
    if (selectedAlerts.size === 0 || !newVerificationStatus) return

    setUpdateModalConfig({
      title: "Update Verification Statuses",
      message: `Are you sure you want to update the verification status of ${selectedAlerts.size} selected alerts to "${newVerificationStatus}"?`,
      itemCount: selectedAlerts.size,
      onConfirm: async () => {
        setIsOperationCancelled(false)
        try {
          // Show progress modal for batch update
          setProgressModalConfig({
            title: "Updating Verification Statuses",
            message: `Updating verification status for ${selectedAlerts.size} selected alerts...`,
            progress: 0,
            total: selectedAlerts.size,
            status: "Starting update...",
            onCancel: () => {
              setIsOperationCancelled(true)
              setProgressModalOpen(false)
              setSelectedAlerts(new Set())
              toast.info("Operation cancelled")
            },
          })
          setProgressModalOpen(true)

          const alertIds = Array.from(selectedAlerts)
          let processedCount = 0
          const results = []

          // Process updates in batches
          const batchSize = 5
          for (let i = 0; i < alertIds.length; i += batchSize) {
            if (isOperationCancelled) break

            const batch = alertIds.slice(i, i + batchSize)
            const batchResults = await Promise.all(
              batch.map((alertId) => updateAlert(alertId, { verificationStatus: newVerificationStatus }))
            )
            results.push(...batchResults)
            processedCount += batch.length

            // Update progress
            setProgressModalConfig((prev) => ({
              ...prev,
              progress: processedCount,
              status: `Updated ${processedCount} of ${selectedAlerts.size} alerts...`,
            }))
          }

          if (!isOperationCancelled) {
            const successCount = results.filter((r) => r.success).length
            if (successCount > 0) {
              toast.success(`Successfully updated ${successCount} alerts`)
            }

            const failCount = results.filter((r) => !r.success).length
            if (failCount > 0) {
              toast.error(`Failed to update ${failCount} alerts`)
            }
          }
        } catch (error) {
          if (!isOperationCancelled) {
            console.error("Error updating alerts:", error)
            toast.error("Failed to update selected alerts")
          }
        } finally {
          setProgressModalOpen(false)
          setUpdateModalOpen(false)
          setSelectedAlerts(new Set())
        }
      },
    })
    setUpdateModalOpen(true)
  }

  // Update date selection handlers
  const handleDateChange = (e) => {
    const selectedValue = e.target.value
    if (viewType === "monthly") {
      setSelectedMonth(selectedValue)
    } else {
      setSelectedDate(selectedValue)
    }
  }

  // Initialize selected dates in Philippine time
  useEffect(() => {
    const now = new Date()
    const phDate = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const year = phDate.getUTCFullYear()
    const month = String(phDate.getUTCMonth() + 1).padStart(2, "0")
    const day = String(phDate.getUTCDate()).padStart(2, "0")

    setSelectedDate(`${year}-${month}-${day}`)
    setSelectedMonth(`${year}-${month}`)
  }, [])

  const handleExportCSV = () => {
    // Prepare CSV content
    const headers = [
      "Status",
      "Verification Status",
      "Alert Name",
      "Timestamp",
      "Tenant",
      "Kill Chain Stage",
      "Technique",
      "SRC IP",
      "SRC IP Type",
      "SRC Geo Code",
      "Destination IP",
      "DST IP Type",
      "DST Geo Code",
      "Source Host",
      "Description",
      "Remarks",
      "Links"
    ]

    // Convert alerts to CSV rows
    const rows = filteredAlerts.map(alert => [
      alert.status || "",
      alert.verificationStatus || "",
      alert.alertName || "",
      formatDate(alert.timestamp),
      alert.tenant || "",
      alert.killChainStage || "",
      alert.technique || "",
      alert.sourceIp || "",
      alert.sourceType || "",
      alert.sourceGeo?.country || "",
      alert.destinationIp || "",
      alert.destinationType || "",
      alert.destinationGeo?.country || "",
      alert.host || "",
      alert.description || "",
      alert.remarks || "",
      alert.link || ""
    ])
    // Escape double quotes and wrap each cell in double quotes
    .map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `alerts_export_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Add useEffect for user role retrieval
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
          const userData = userDoc.data()
          setUserRole(userData.role?.toLowerCase()) // Convert role to lowercase for consistent comparison
          logger.log('User role:', userData.role) // Debug log
        }
      } catch (error) {
        logger.error('Error checking user role:', error)
      }
    }

    checkUserRole()
  }, [router])

  // Add loading state display
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-900 text-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        </div>
      </div>
    )
  }

  // Add scroll handler
  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target
    setShowLeftShadow(scrollLeft > 0)
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">
              Security Alerts
            </h1>
            <p className="text-gray-400 mt-2 text-lg font-mono">
              Monitor and manage security alerts across your organization
            </p>
          </div>
          <div className="flex gap-4">
            {/* Batch Actions Section */}
            {selectedAlerts.size > 0 ? (
              <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 shadow-lg">
                <div className="flex items-center gap-2 text-gray-200">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span className="font-mono font-medium">{selectedAlerts.size} alerts selected</span>
                </div>
                <div className="h-6 w-px bg-gray-600"></div>
                <div className="flex items-center gap-4">
                  {/* Batch Verification Status Update */}
                  <div className="relative group">
                    <select
                      onChange={(e) => handleBatchVerificationUpdate(e.target.value)}
                      className="appearance-none w-56 px-4 py-2.5 bg-indigo-600 text-white rounded-lg 
                        hover:bg-indigo-700 border-2 border-indigo-400 transition-colors font-mono pr-10 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900
                        font-medium text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled className="bg-gray-800 text-white">Update Verification</option>
                      <option value="To Be Confirmed" className="bg-gray-800 text-white">To Be Confirmed</option>
                      <option value="True Positive" className="bg-gray-800 text-white">True Positive</option>
                      <option value="False Positive" className="bg-gray-800 text-white">False Positive</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="absolute left-0 -bottom-8 bg-gray-800 text-white text-sm py-1 px-2 rounded 
                          opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gray-700">
                      Change verification status for selected alerts
                    </div>
                  </div>

                  {/* Batch Delete */}
                  <button
                    onClick={handleBulkDelete}
                    className="group relative w-48 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 
                      border-2 border-red-400 transition-colors flex items-center justify-center gap-2
                      focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900
                      font-medium text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete Selected</span>
                    <div className="absolute left-0 -bottom-8 bg-gray-800 text-white text-sm py-1 px-2 rounded 
                          opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gray-700">
                      Remove selected alerts
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Add Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="group relative w-48 px-4 py-2.5 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 
                    border border-green-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Export CSV</span>
                  <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                    opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Export filtered alerts to CSV
                  </div>
                </button>

                {/* CSV Import Button - Only show if not trainee */}
                {userRole && userRole !== 'trainee' && (
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                      disabled={csvImporting}
                    />
                    <label
                      htmlFor="csv-upload"
                      className={`w-48 px-4 py-2.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 
                        border border-purple-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer
                        ${csvImporting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>{csvImporting ? "Importing..." : "Import CSV"}</span>
                    </label>
                    <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                          opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Import alerts from CSV file
                    </div>
                  </div>
                )}

                {/* Add New Alert Button */}
                <button
                  onClick={() => router.push("/monitoring/manual-alert")}
                  className="group relative w-48 px-4 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 
                    border border-cyan-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span>Add New Alert</span>
                  <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                        opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Create a new security alert
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-800/70 p-6 rounded-xl shadow-lg mb-6 border border-gray-700/50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 w-64">
              <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none text-gray-200 w-full font-mono"
              />
            </div>

            {/* View Type */}
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 text-gray-200 font-mono"
            >
              <option value="daily">Daily View</option>
              <option value="monthly">Monthly View</option>
            </select>

            {/* Date Picker */}
            <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
              <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {viewType === "monthly" ? (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleDateChange}
                  className="bg-transparent outline-none text-gray-200 font-mono"
                />
              ) : (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-transparent outline-none text-gray-200 font-mono"
                />
              )}
            </div>

            {/* Project Filter */}
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 text-gray-200 font-mono"
            >
              <option value="all">All Projects</option>
              <option value="MWELL">Project Chiron</option>
              <option value="SiyCha Group of Companies">Project Orion</option>
              <option value="MPIW">Project Hunt</option>
              <option value="NIKI">Project NIKI</option>
              <option value="Cantilan">Project Atlas</option>
            </select>

            {/* Kill Chain Filter */}
            <select
              value={filterKillChain}
              onChange={(e) => setFilterKillChain(e.target.value)}
              className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 text-gray-200 font-mono"
            >
              <option value="all">All Kill Chain Stages</option>
              {uniqueKillChains.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>

            {/* Verification Filter */}
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 text-gray-200 font-mono"
            >
              <option value="all">All Verification Status</option>
              <option value="To Be Confirmed">To Be Confirmed</option>
              <option value="True Positive">True Positive</option>
              <option value="False Positive">False Positive</option>
            </select>

            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterTenant("all");
                setFilterKillChain("all");
                setFilterVerification("all");
                // Reset date to today/month in PH time
                const now = new Date();
                const phDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
                const year = phDate.getUTCFullYear();
                const month = String(phDate.getUTCMonth() + 1).padStart(2, "0");
                const day = String(phDate.getUTCDate()).padStart(2, "0");
                setSelectedDate(`${year}-${month}-${day}`);
                setSelectedMonth(`${year}-${month}`);
              }}
              className="ml-auto px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 font-mono"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Alerts Display Section */}
        <div className="relative">
          {/* Scroll Shadows */}
          {showLeftShadow && <div className="scroll-shadow scroll-shadow-left"></div>}
          {showRightShadow && <div className="scroll-shadow scroll-shadow-right"></div>}
          
          {/* Table Container with Custom Scrollbar */}
          <div 
            className="overflow-x-auto rounded-lg border border-gray-700 scrollbar-thin"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No alerts found</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-700 bg-gray-900">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[3%]"
                      >
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded 
                                                           focus:ring-cyan-500 focus:ring-offset-gray-800"
                          checked={selectedAlerts.size > 0 && selectedAlerts.size === filteredAlerts.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Verification
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[10%]"
                      >
                        Alert Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[10%] cursor-pointer hover:text-gray-300"
                        onClick={() => requestSort("timestamp")}
                      >
                        Timestamp
                        {sortConfig.key === "timestamp" && (
                          <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Tenant
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Kill Chain Stage
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Technique
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Host
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Source IP
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Source Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Source Geo
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Destination IP
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Destination Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Destination Geo
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Detected By
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[10%]"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[10%]"
                      >
                        Remarks
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[5%]"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {paginatedAlerts.map((alert, index) =>
                      [
                        <tr
                          key={`${alert.id}-main`}
                          className={`${index % 2 === 0 ? "bg-gray-900" : "bg-gray-800/50"} ${newAlertIds.has(alert.id) ? "animate-pulse bg-blue-500/10" : ""}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded 
                                                           focus:ring-cyan-500 focus:ring-offset-gray-800"
                              checked={selectedAlerts.has(alert.id)}
                              onChange={() => handleSelectAlert(alert.id)}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingAlert === alert.id ? (
                              <select
                                value={alert.status}
                                onChange={(e) => {
                                  const updatedAlerts = alerts.map((a) =>
                                    a.id === alert.id ? { ...a, status: e.target.value } : a,
                                  )
                                  setAlerts(updatedAlerts)
                                }}
                                className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-200 
                                                                 focus:outline-none focus:border-cyan-500 text-xs"
                              >
                                <option value="New">New</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-1 py-0.5 rounded-md text-xs font-medium ${getStatusColor(alert.status)}`}
                              >
                                {alert.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingAlert === alert.id ? (
                              <select
                                value={alert.verificationStatus}
                                onChange={(e) => {
                                  const updatedAlerts = alerts.map((a) =>
                                    a.id === alert.id ? { ...a, verificationStatus: e.target.value } : a,
                                  )
                                  setAlerts(updatedAlerts)
                                }}
                                className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-200 
                                                                 focus:outline-none focus:border-cyan-500 text-xs"
                              >
                                <option value="To Be Confirmed">To Be Confirmed</option>
                                <option value="True Positive">True Positive</option>
                                <option value="False Positive">False Positive</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-1 py-0.5 rounded-md text-xs font-medium ${getVerificationStatusColor(alert.verificationStatus)}`}
                              >
                                {getVerificationStatusIcon(alert.verificationStatus)}
                                {alert.verificationStatus || "To Be Confirmed"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-300">{alert.alertName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(alert.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {getProjectName(alert.tenant) || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {alert.killChainStage || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {alert.technique || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {alert.category || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-cyan-300">{alert.host || "-"}</span>
                              {alert.hostname && (
                                <span className="text-xs text-gray-400">({alert.hostname})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="font-mono text-cyan-300">{alert.sourceIp || "-"}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              {alert.sourceType || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {alert.sourceGeo?.country || "-"}
                              {alert.sourceGeo?.city && (
                                <span className="ml-1 text-gray-400">({alert.sourceGeo.city})</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="font-mono text-cyan-300">{alert.destinationIp || "-"}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              {alert.destinationType || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {alert.destinationGeo?.country || "-"}
                              {alert.destinationGeo?.city && (
                                <span className="ml-1 text-gray-400">({alert.destinationGeo.city})</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              {alert.detectedBy || "system"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <div className="relative max-w-lg">
                              {expandedDescriptions[alert.id] ? (
                                <div className="space-y-2">
                                  <div className="bg-gray-800/50 p-2 rounded">
                                    <p className="font-mono text-sm whitespace-pre-wrap text-cyan-300">
                                      {alert.description || "-"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => toggleDescription(alert.id)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                  >
                                    Show Less
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="font-mono text-sm text-cyan-300">
                                    {truncateText(alert.description, 150)}
                                  </div>
                                  {alert.description && alert.description.length > 150 && (
                                    <button
                                      onClick={() => toggleDescription(alert.id)}
                                      className="text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                      View More
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 min-w-[300px]">
                            {editingAlert === alert.id ? (
                              <textarea
                                value={alert.remarks || ""}
                                onChange={(e) => {
                                  const updatedAlerts = alerts.map((a) =>
                                    a.id === alert.id ? { ...a, remarks: e.target.value } : a,
                                  )
                                  setAlerts(updatedAlerts)
                                }}
                                rows="2"
                                className="w-full px-2 py-1 bg-gray-800 rounded border border-gray-700 
                                                                 focus:outline-none focus:border-cyan-500"
                                placeholder="Add investigation notes..."
                              />
                            ) : (
                              <div className="relative w-full">
                                {expandedRemarks[alert.id] ? (
                                  <div className="space-y-2">
                                    <div className="bg-gray-800/50 p-3 rounded-lg min-w-[300px]">
                                      <p className="font-mono text-sm whitespace-pre-wrap text-cyan-300 break-words">
                                        {alert.remarks || "-"}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => toggleRemarks(alert.id)}
                                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                      Show Less
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="bg-gray-800/30 p-2 rounded-lg min-w-[300px]">
                                      <p className="font-mono text-sm text-cyan-300 break-words">
                                        {truncateText(alert.remarks, 150)}
                                      </p>
                                    </div>
                                    {alert.remarks && alert.remarks.length > 150 && (
                                      <button
                                        onClick={() => toggleRemarks(alert.id)}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        View More
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {editingAlert === alert.id ? (
                                <>
                                  <button
                                    onClick={() => handleEditSave(alert)}
                                    className="p-1.5 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 
                                                                         transition-colors"
                                    title="Save changes"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setEditingAlert(null)}
                                    className="p-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 
                                                                         transition-colors"
                                    title="Cancel"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setEditingAlert(alert.id)}
                                  className="p-1.5 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 
                                                                         transition-colors"
                                  title="Edit alert"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {alert.link && (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(alert.link)
                                      toast.success("Link copied to clipboard")
                                    }}
                                    className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 
                                                                         transition-colors"
                                    title="Copy link"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </button>
                                  <a
                                    href={alert.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 
                                                                         transition-colors"
                                    title="Open link"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </a>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(alert.id)}
                                className="p-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 
                                                                 focus-within:ring-2 focus-within:ring-red-500"
                                title="Delete alert"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>,
                        expandedAlert === alert.id && (
                          <tr key={`${alert.id}-expanded`} className="bg-gray-800/30">
                            <td colSpan="15" className="px-4 py-4">
                              <div className="text-sm text-gray-300 space-y-4">
                                <div>
                                  <h4 className="font-semibold text-gray-200 mb-2">Description</h4>
                                  <p className="bg-gray-800/50 p-3 rounded-lg">
                                    {alert.description || "No description provided"}
                                  </p>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-gray-200 mb-2">Remarks</h4>
                                  {editingAlert === alert.id ? (
                                    <textarea
                                      value={alert.remarks || ""}
                                      onChange={(e) => {
                                        const updatedAlerts = alerts.map((a) =>
                                          a.id === alert.id ? { ...a, remarks: e.target.value } : a,
                                        )
                                        setAlerts(updatedAlerts)
                                      }}
                                      rows="3"
                                      className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                                               focus:outline-none focus:border-cyan-500"
                                      placeholder="Add remarks about this alert..."
                                    />
                                  ) : (
                                    <p className="bg-gray-800/50 p-3 rounded-lg">
                                      {alert.remarks || "No remarks provided"}
                                    </p>
                                  )}
                                </div>

                                {alert.link && (
                                  <div>
                                    <h4 className="font-semibold text-gray-200 mb-2">Link</h4>
                                    <div className="bg-gray-800/50 p-3 rounded-lg break-all">{alert.link}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      ].filter(Boolean),
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>

        {/* Pagination Controls - Moved outside table */}
        <div className="flex justify-between items-center mt-6 px-4 py-3 bg-gray-800/50 rounded-lg">
          <div className="text-sm text-gray-400 font-mono">
            Showing {currentPage * itemsPerPage + 1} to{" "}
            {Math.min((currentPage + 1) * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} alerts
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className={`px-6 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 
                           transition-colors font-mono text-sm flex items-center gap-2
                           ${currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <span className="text-gray-400 font-mono">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className={`px-6 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 
                           transition-colors font-mono text-sm flex items-center gap-2
                           ${currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Add Confirmation Modals */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteModalConfig.onConfirm}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
        itemCount={deleteModalConfig.itemCount}
      />

      <ConfirmationModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onConfirm={updateModalConfig.onConfirm}
        title={updateModalConfig.title}
        message={updateModalConfig.message}
        itemCount={updateModalConfig.itemCount}
        type="update"
      />

      <ConfirmationModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onConfirm={editModalConfig.onConfirm}
        title={editModalConfig.title}
        message={editModalConfig.message}
        type="edit"
      />

      {/* Add Progress Modal */}
      <ProgressModal
        isOpen={progressModalOpen}
        title={progressModalConfig.title}
        message={progressModalConfig.message}
        progress={progressModalConfig.progress}
        total={progressModalConfig.total}
        status={progressModalConfig.status}
        onCancel={progressModalConfig.onCancel}
      />
    </div>
  )
}
