"use client"
import React, { useState, useEffect } from "react"
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  RadialLinearScale,
} from "chart.js"
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2"
import {
  getAggregatedStatistics,
  getMonthlyStatistics,
  deleteStatisticalData,
  addThreatVulnerability,
  addThreatDetection,
  addSocDetection,
  addAtipDetection,
  addMaliciousDomain,
  editStatisticalReport,
} from "../../services/statisticalReports"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Shield,
  Eye,
  Globe,
  Trash2,
  TableIcon,
  Edit2,
  ChevronLeft,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { logger } from '@/utils/logger'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  RadialLinearScale
)

// Register the plugin separately
ChartJS.register(ChartDataLabels)

// Category metadata for consistent styling and icons
const CATEGORIES = {
  threatVulnerabilities: {
    title: "Threat Vulnerabilities",
    color: "rgb(239, 68, 68)",
    bgColor: "rgba(239, 68, 68, 0.5)",
    icon: AlertTriangle,
    description: "Security vulnerabilities identified in systems",
  },
  threatDetections: {
    title: "Threat Detections",
    color: "rgb(249, 115, 22)",
    bgColor: "rgba(249, 115, 22, 0.5)",
    icon: Shield,
    description: "Detected security threats across networks",
  },
  socDetections: {
    title: "SOC Detections",
    color: "rgb(34, 197, 94)",
    bgColor: "rgba(34, 197, 94, 0.5)",
    icon: Eye,
    description: "Security Operations Center detected incidents",
  },
  atipDetections: {
    title: "ATIP Detections",
    color: "rgb(59, 130, 246)",
    bgColor: "rgba(59, 130, 246, 0.5)",
    icon: TrendingUp,
    description: "Advanced Threat Intelligence Platform detections",
  },
  maliciousDomains: {
    title: "Malicious Domains",
    color: "rgb(168, 85, 247)",
    bgColor: "rgba(168, 85, 247, 0.5)",
    icon: Globe,
    description: "Identified malicious domains and URLs",
  },
}

// Add DeleteConfirmationModal component before the main component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-red-500/20">
        <h2 className="text-red-400 text-xl font-mono mb-4">{title}</h2>
        <p className="text-gray-400 text-sm font-mono mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Add DataTable component to display category data
const DataTable = ({ category, data, onDelete, projectId, loadStatistics, isAddingData, setIsAddingData }) => {
  const categoryInfo = CATEGORIES[category]
  const [sortedData, setSortedData] = useState([])
  const [selectedProject, setSelectedProject] = useState("All Projects")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    // Transform the data into a sortable array
    const tableData = []

    if (data) {
      Object.keys(data).forEach((year) => {
        Object.keys(data[year]).forEach((month) => {
          if (data[year][month] && data[year][month][category] > 0) {
            tableData.push({
              year: Number.parseInt(year),
              month: Number.parseInt(month),
              value: data[year][month][category],
              monthName: new Date(Number.parseInt(year), Number.parseInt(month)).toLocaleString("default", {
                month: "long",
              }),
            })
          }
        })
      })
    }

    // Sort by year and month (newest first)
    tableData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })

    setSortedData(tableData)
  }, [data, category])

  const handleDeleteClick = (item) => {
    setDeleteItem(item)
    setShowDeleteModal(true)
  }

  const handleEditClick = (item) => {
    setEditItem(item)
    setEditValue(item.value)
    setShowEditModal(true)
  }

  const handleConfirmDelete = () => {
    if (deleteItem) {
      onDelete(category, "specific", deleteItem.year, deleteItem.month)
      setShowDeleteModal(false)
      setDeleteItem(null)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editItem || !editValue || editValue <= 0) {
      toast.error("Please enter a valid value greater than 0")
      return
    }

    try {
      setIsAddingData(true)
      const data = {
        projectId: projectId,
        [category]: parseInt(editValue),
        year: editItem.year,
        month: editItem.month,
        date: new Date(editItem.year, editItem.month, 1).toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await editStatisticalReport(data)

      if (result.success) {
        toast.success(`${categoryInfo.title} data updated successfully`, {
          duration: 2000,
          style: {
            background: '#10B981',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          icon: '✅',
        })
        setShowEditModal(false)
        setEditItem(null)
        setEditValue("")
        // Reload statistics after successful update
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error updating data:", error)
      toast.error(error.message || "Failed to update data", {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontFamily: 'monospace',
        },
        icon: '❌',
      })
    } finally {
      setIsAddingData(false)
    }
  }

  if (sortedData.length === 0) {
    return <div className="text-center py-6 text-gray-400 font-mono">No data available for this category</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0B1120] border-b border-cyan-500/20">
            <th className="px-4 py-3 text-left text-sm font-mono text-cyan-400">Date</th>
            <th className="px-4 py-3 text-left text-sm font-mono text-cyan-400">Value</th>
            <th className="px-4 py-3 text-right text-sm font-mono text-cyan-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr
              key={`${item.year}-${item.month}`}
              className={`border-b border-cyan-500/10 ${index % 2 === 0 ? "bg-[#111827]" : "bg-[#0F172A]"}`}
            >
              <td className="px-4 py-3 text-sm font-mono text-white">
                {item.monthName} {item.year}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-white">{item.value.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-mono text-xs transition-all duration-300"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded font-mono text-xs transition-all duration-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-red-500/20">
            <h2 className="text-red-400 text-xl font-mono mb-4">Confirm Delete</h2>
            <p className="text-gray-400 text-sm font-mono mb-6">
              Are you sure you want to delete the data for {deleteItem?.monthName} {deleteItem?.year}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteItem(null)
                }}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Edit {categoryInfo.title}</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="mb-4">
                <label className="block text-gray-400 text-sm font-mono mb-2">Date</label>
                <div className="text-white text-sm font-mono bg-[#0B1120] border border-cyan-500/20 rounded px-3 py-2">
                  {editItem?.monthName} {editItem?.year}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm font-mono mb-2">Value</label>
                <input
                  type="number"
                  min="1"
                  value={editValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (Number(value) > 0 && Number(value) <= 1000000)) {
                      setEditValue(value);
                    }
                  }}
                  className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                  required
                  disabled={isAddingData}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditItem(null)
                    setEditValue("")
                  }}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingData}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isAddingData}
                >
                  {isAddingData ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SpecialistStatistics() {
  const [selectedProject, setSelectedProject] = useState("All Projects")
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState("monthly") // 'monthly' or 'yearly'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [monthlyData, setMonthlyData] = useState({})
  const [totalStatistics, setTotalStatistics] = useState({
    threatVulnerabilities: 0,
    threatDetections: 0,
    socDetections: 0,
    atipDetections: 0,
    maliciousDomains: 0,
  })
  // Add new state for selected graph
  const [selectedGraph, setSelectedGraph] = useState(null)
  const [showAddDataModal, setShowAddDataModal] = useState(false)
  const [newDataCategory, setNewDataCategory] = useState("")
  const [newDataValue, setNewDataValue] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState({
    category: "",
    scope: "month", // 'month', 'year', 'all', or 'specific'
    year: null,
    month: null,
  })
  // New state for table view
  const [showTableView, setShowTableView] = useState(false)
  const [selectedTableCategory, setSelectedTableCategory] = useState("")
  // Add a new state for tracking the add operation loading state
  const [isAddingData, setIsAddingData] = useState(false)
  // Add new state for threat data
  const [threatVulnData, setThreatVulnData] = useState([])
  const [threatDetData, setThreatDetData] = useState([])
  const [showThreatVulnForm, setShowThreatVulnForm] = useState(false)
  const [showThreatDetForm, setShowThreatDetForm] = useState(false)
  const [newThreatVulnData, setNewThreatVulnData] = useState({
    tenant: "",
    count: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })
  const [newThreatDetData, setNewThreatDetData] = useState({
    tenant: "",
    count: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })
  const [isAddingThreatVuln, setIsAddingThreatVuln] = useState(false)
  const [isAddingThreatDet, setIsAddingThreatDet] = useState(false)
  const [showSocDetForm, setShowSocDetForm] = useState(false)
  const [showAtipDetForm, setShowAtipDetForm] = useState(false)
  const [showMaliciousDomainsForm, setShowMaliciousDomainsForm] = useState(false)

  const [newSocDetData, setNewSocDetData] = useState({
    tenant: "",
    count: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })

  const [newAtipDetData, setNewAtipDetData] = useState({
    tenant: "",
    count: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })

  const [newMaliciousDomainsData, setNewMaliciousDomainsData] = useState({
    tenant: "",
    count: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })

  const [isAddingSocDet, setIsAddingSocDet] = useState(false)
  const [isAddingAtipDet, setIsAddingAtipDet] = useState(false)
  const [isAddingMaliciousDomains, setIsAddingMaliciousDomains] = useState(false)

  // Get all available years for the filter
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Month names for labels
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Add chartType state in the main component
  const [chartType, setChartType] = useState("line")

  useEffect(() => {
    loadProjects()
    loadStatistics()
  }, [selectedProject, selectedYear, selectedMonth, viewMode])

  const loadProjects = async () => {
    try {
      const projectList = [
        { id: "all", name: "All Projects" },
        { id: "SiyCha Group of Companies", name: "Project Orion" },
        { id: "MLHUILLIER", name: "Project Midas" },
        { id: "MPIW", name: "Project Hunt" },
        { id: "NIKI", name: "Project NIKI" },
        { id: "MWELL", name: "Project Chiron" },
        { id: "Cantilan", name: "Project Atlas" },
      ]
      setProjects(projectList)
    } catch (error) {
      logger.error("Error loading projects:", error)
    }
  }

  const loadStatistics = async () => {
    try {
      setLoading(true)
      // When "All Projects" is selected, pass null to get aggregated data
      const projectId = selectedProject === "All Projects" ? null : selectedProject

      // Get total statistics for the stats cards
      const totalStats = await getAggregatedStatistics(projectId)
      setTotalStatistics(
        totalStats || {
          threatVulnerabilities: 0,
          threatDetections: 0,
          socDetections: 0,
          atipDetections: 0,
          maliciousDomains: 0,
        },
      )

      // Get monthly data for charts
      const monthly = await getMonthlyStatistics(projectId, selectedYear)

      // Ensure the monthly data structure is properly initialized
      const initializedMonthly = {
        [selectedYear]: {},
      }

      // Initialize each month with zero values for all categories
      for (let month = 0; month < 12; month++) {
        initializedMonthly[selectedYear][month] = {
          threatVulnerabilities: 0,
          threatDetections: 0,
          socDetections: 0,
          atipDetections: 0,
          maliciousDomains: 0,
          ...(monthly[selectedYear]?.[month] || {}),
        }
      }

      setMonthlyData(initializedMonthly)
    } catch (error) {
      logger.error("Error loading statistics:", error)
      // Set default values on error
      setTotalStatistics({
        threatVulnerabilities: 0,
        threatDetections: 0,
        socDetections: 0,
        atipDetections: 0,
        maliciousDomains: 0,
      })
      setMonthlyData({})
    } finally {
      setLoading(false)
    }
  }

  // Handle adding general statistical data
  const handleAddData = async () => {
    if (!newDataCategory || newDataValue <= 0 || selectedProject === "All Projects" || isAddingData) return

    try {
      setIsAddingData(true)
      let result

      const data = {
        tenant: selectedProject,
        count: newDataValue,
        year: selectedYear,
        month: selectedMonth,
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
      }

      switch (newDataCategory) {
        case "threatVulnerabilities":
          result = await addThreatVulnerability(data)
          break
        case "threatDetections":
          result = await addThreatDetection(data)
          break
        case "socDetections":
          result = await addSocDetection(data)
          break
        case "atipDetections":
          result = await addAtipDetection(data)
          break
        case "maliciousDomains":
          result = await addMaliciousDomain(data)
          break
        default:
          throw new Error("Invalid category selected")
      }

      if (result.success) {
        toast.success(`${CATEGORIES[newDataCategory].title} data added successfully`, {
          duration: 2000,
          style: {
            background: '#10B981',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          icon: '✅',
        })
        setShowAddDataModal(false)
        setNewDataCategory("")
        setNewDataValue(1)
        // Reload statistics after successful addition
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error adding data:", error)
      toast.error(error.message || "Failed to add data", {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontFamily: 'monospace',
        },
        icon: '❌',
      })
    } finally {
      setIsAddingData(false)
    }
  }

  const handleDeleteData = async (category, scope = "month", year = selectedYear, month = selectedMonth) => {
    if (selectedProject === "All Projects") {
      toast.error("Please select a specific project to delete data")
      return
    }

    setDeleteInfo({
      category,
      scope,
      year,
      month,
    })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const { category, scope, year, month } = deleteInfo
      let success = false

      if (selectedProject === "All Projects") {
        toast.error("Please select a specific project to delete data")
        return
      }

      setLoading(true)
      logger.info("Attempting to delete:", { category, scope, year, month, selectedProject })

      const result = await deleteStatisticalData(selectedProject, category, year, month)

      if (result.success) {
        toast.success(result.message || "Data deleted successfully")
        setShowDeleteModal(false)
        // Reload statistics after successful deletion
        await loadStatistics()
      } else {
        throw new Error(result.error || "Failed to delete data")
      }
    } catch (error) {
      logger.error("Error deleting data:", error)
      toast.error(error.message || "Failed to delete data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    elements: {
      line: {
        tension: 0,
        borderWidth: 2,
        fill: true,
        stepped: false,
        cubicInterpolationMode: 'monotone'
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        hitRadius: 10,
        borderWidth: 2,
        backgroundColor: '#fff'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawBorder: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            family: "monospace",
            size: 12,
            weight: 'bold'
          },
          padding: 10,
          callback: (value) => value.toLocaleString()
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawBorder: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            family: "monospace",
            size: 12,
            weight: 'bold'
          },
          padding: 10,
          maxRotation: 45,
          minRotation: 45
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            family: "monospace",
            size: 12,
            weight: 'bold'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      datalabels: {
        display: true,
        color: 'white',
        anchor: 'end',
        align: 'top',
        offset: 10,
        backgroundColor: function(context) {
          return context.dataset.borderColor;
        },
        borderRadius: 4,
        padding: { top: 6, bottom: 6, left: 8, right: 8 },
        font: {
          family: 'monospace',
          weight: 'bold',
          size: 13
        },
        textStrokeColor: 'rgba(0, 0, 0, 0.75)',
        textStrokeWidth: 4,
        textShadowBlur: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        formatter: (value) => {
          if (typeof value === 'object') {
            value = value.y;
          }
          if (value === 0) return '';
          return value.toLocaleString();
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        titleColor: "rgba(255, 255, 255, 0.9)",
        bodyColor: "rgba(255, 255, 255, 0.7)",
        borderColor: "rgba(6, 182, 212, 0.2)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          family: "monospace",
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: "monospace",
          size: 13,
          weight: 'bold'
        },
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    layout: {
      padding: {
        top: 40,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    aspectRatio: 1,
  }

  // Prepare chart data based on view mode
  const prepareChartData = (category) => {
    const categoryInfo = CATEGORIES[category]

    // Default empty dataset to prevent undefined errors
    const defaultDataset = {
      label: categoryInfo.title,
      data: [],
      borderColor: categoryInfo.color,
      backgroundColor: categoryInfo.bgColor,
      tension: 0,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: categoryInfo.color,
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      borderWidth: 2,
      stepped: false,
      spanGaps: true,
      cubicInterpolationMode: 'monotone'
    }

    try {
      if (viewMode === "monthly") {
        // For monthly view, show data for each month of the selected year
        const monthlyValues = Array(12).fill(0)
        const labels = [...monthNames] // Create a copy to avoid reference issues

        // Ensure we have valid data before accessing it
        if (monthlyData && monthlyData[selectedYear]) {
          for (let month = 0; month < 12; month++) {
            // Safely access nested properties with optional chaining
            monthlyValues[month] = monthlyData[selectedYear][month]?.[category] || 0
          }
        }

        return {
          labels,
          datasets: [
            {
              ...defaultDataset,
              data: monthlyValues.map((value, index) => ({
                x: index,
                y: value
              })),
            },
          ],
        }
      } else {
        // For yearly view, show aggregated data for each year
        const years = Object.keys(monthlyData || {}).sort()

        // If no data available, provide a default data point
        if (years.length === 0) {
          const currentYear = new Date().getFullYear().toString()
          years.push(currentYear)
        }

        const yearlyValues = years.map((year) => {
          let yearTotal = 0
          if (monthlyData[year]) {
            for (let month = 0; month < 12; month++) {
              // Safely access nested properties
              yearTotal += monthlyData[year][month]?.[category] || 0
            }
          }
          return yearTotal
        })

        return {
          labels: [...years], // Create a copy to avoid reference issues
          datasets: [
            {
              ...defaultDataset,
              data: yearlyValues.map((value, index) => ({
                x: index,
                y: value
              })),
            },
          ],
        }
      }
    } catch (error) {
      logger.error("Error preparing chart data:", error)
      // Return a valid but empty chart data structure to prevent rendering errors
      return {
        labels: viewMode === "monthly" ? [...monthNames] : [new Date().getFullYear().toString()],
        datasets: [defaultDataset],
      }
    }
  }

  // Stats Card Component
  const StatsCard = ({ category }) => {
    const categoryInfo = CATEGORIES[category]
    const Icon = categoryInfo.icon
    const value = totalStatistics[category] || 0

    // Calculate month-over-month change
    let change = 0
    let changePercent = 0

    if (monthlyData && monthlyData[selectedYear]) {
      const currentMonthValue = monthlyData[selectedYear][selectedMonth]?.[category] || 0
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
      const prevMonthValue = monthlyData[prevYear]?.[prevMonth]?.[category] || 0

      change = currentMonthValue - prevMonthValue
      changePercent = prevMonthValue === 0 ? 0 : (change / prevMonthValue) * 100
    }

    return (
      <div className="bg-[#111827] rounded-lg p-4 border border-cyan-500/20">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-400 text-sm font-mono">{categoryInfo.title}</p>
            <h3 className="text-white text-2xl font-mono mt-1">{value.toLocaleString()}</h3>
            <div className={`flex items-center mt-2 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {change >= 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span className="text-sm font-mono">{Math.abs(changePercent).toFixed(1)}%</span>
              <span className="text-gray-400 text-xs ml-1 font-mono">vs last month</span>
            </div>
          </div>
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-cyan-500/10">
            <Icon className="text-cyan-400" size={24} />
          </div>
        </div>
      </div>
    )
  }

  // Chart Card Component - FIXED TO HANDLE ERRORS GRACEFULLY
  const ChartCard = ({ category }) => {
    const categoryInfo = CATEGORIES[category]
    const [showDeleteOptions, setShowDeleteOptions] = useState(false)
    const [chartError, setChartError] = useState(false)
    const [localChartType, setLocalChartType] = useState(chartType)

    // Reset chart error when category changes
    useEffect(() => {
      setChartError(false)
    }, [category])

    // Prepare chart data with error handling
    const getChartData = () => {
      try {
        return prepareChartData(category)
      } catch (error) {
        logger.error(`Error preparing chart data for ${category}:`, error)
        setChartError(true)
        // Return a minimal valid chart data structure
        return {
          labels: viewMode === "monthly" ? monthNames : [new Date().getFullYear().toString()],
          datasets: [
            {
              label: categoryInfo.title,
              data: Array(viewMode === "monthly" ? 12 : 1).fill(0),
              borderColor: categoryInfo.color,
              backgroundColor: categoryInfo.bgColor,
            },
          ],
        }
      }
    }

    const renderChart = (data) => {
      const commonProps = {
        options: lineChartOptions,
        data: data,
        height: "100%"
      }

      switch (localChartType) {
        case 'bar':
          return <Bar {...commonProps} />
        case 'doughnut':
          return <Doughnut 
            data={{
              labels: data.labels,
              datasets: [{
                data: data.datasets[0].data.map(d => d.y),
                backgroundColor: Object.values(CATEGORIES).map(c => c.bgColor),
                borderColor: Object.values(CATEGORIES).map(c => c.color),
                borderWidth: 1
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: "rgba(255, 255, 255, 0.7)",
                    font: { family: "monospace" }
                  }
                },
                datalabels: {
                  color: 'white',
                  formatter: (value) => value.toLocaleString()
                }
              }
            }}
          />
        case 'radar':
          return <Radar 
            data={{
              labels: data.labels,
              datasets: [{
                label: categoryInfo.title,
                data: data.datasets[0].data.map(d => d.y),
                backgroundColor: categoryInfo.bgColor,
                borderColor: categoryInfo.color,
                borderWidth: 2
              }]
            }}
            options={{
              responsive: true,
              scales: {
                r: {
                  grid: { color: "rgba(255, 255, 255, 0.1)" },
                  ticks: { 
                    color: "rgba(255, 255, 255, 0.7)",
                    callback: (value) => value.toLocaleString()
                  }
                }
              },
              plugins: {
                legend: {
                  labels: {
                    color: "rgba(255, 255, 255, 0.7)",
                    font: { family: "monospace" }
                  }
                },
                datalabels: {
                  color: 'white',
                  formatter: (value) => value.toLocaleString()
                }
              }
            }}
          />
        default:
          return <Line {...commonProps} />
      }
    }

    return (
      <div className="bg-[#111827] rounded-lg p-4 border border-cyan-500/20 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-cyan-400 text-xl font-mono">{categoryInfo.title}</h2>
            <p className="text-gray-400 text-sm font-mono">{categoryInfo.description}</p>
          </div>
          <div className="flex gap-2">
            <select
              value={localChartType}
              onChange={(e) => setLocalChartType(e.target.value)}
              className="bg-[#0B1120] text-cyan-400 border border-cyan-500/20 rounded px-3 py-1 font-mono text-sm"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="doughnut">Doughnut Chart</option>
              <option value="radar">Radar Chart</option>
            </select>

            <button
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300 flex items-center gap-1"
              onClick={() => {
                setSelectedTableCategory(category)
                setShowTableView(!showTableView)
              }}
            >
              <TableIcon size={14} className="mr-1" />
              {showTableView && selectedTableCategory === category ? "Show Chart" : "Show Table"}
            </button>

            {category === "threatVulnerabilities" && (
              <button
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300"
                onClick={() => setShowThreatVulnForm(true)}
              >
                Add Data
              </button>
            )}

            {category === "threatDetections" && (
              <button
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300"
                onClick={() => setShowThreatDetForm(true)}
              >
                Add Data
              </button>
            )}

            {category === "socDetections" && (
              <button
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300"
                onClick={() => setShowSocDetForm(true)}
              >
                Add Data
              </button>
            )}

            {category === "atipDetections" && (
              <button
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300"
                onClick={() => setShowAtipDetForm(true)}
              >
                Add Data
              </button>
            )}

            {category === "maliciousDomains" && (
              <button
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm transition-all duration-300"
                onClick={() => setShowMaliciousDomainsForm(true)}
              >
                Add Data
              </button>
            )}
          </div>
        </div>

        {showTableView && selectedTableCategory === category ? (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-lg font-mono">Data Table</h3>
            </div>
            <DataTable 
              category={category} 
              data={monthlyData} 
              onDelete={handleDeleteData} 
              projectId={selectedProject}
              loadStatistics={loadStatistics}
              isAddingData={isAddingData}
              setIsAddingData={setIsAddingData}
            />
          </div>
        ) : (
          <div className="h-[500px] w-full max-w-[900px] mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-cyan-400">Loading...</div>
              </div>
            ) : chartError ? (
              <div className="flex items-center justify-center h-full flex-col">
                <div className="text-red-400 mb-2">Chart rendering error</div>
                <button
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm"
                  onClick={() => setChartError(false)}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="flex items-center justify-center h-full flex-col">
                    <div className="text-red-400 mb-2">Chart rendering error</div>
                    <button
                      className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded font-mono text-sm"
                      onClick={() => setChartError(false)}
                    >
                      Try Again
                    </button>
                  </div>
                }
              >
                {renderChart(getChartData())}
              </ErrorBoundary>
            )}
          </div>
        )}
      </div>
    )
  }

  // Error Boundary Component to catch chart rendering errors
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
      return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
      logger.error("Chart rendering error:", error, errorInfo)
    }

    render() {
      if (this.state.hasError) {
        return this.props.fallback
      }

      return this.props.children
    }
  }

  // Replace the AddDataModal component with this improved version that allows better input
  const AddDataModal = () => {
    if (!showAddDataModal) return null

    const categoryInfo = CATEGORIES[newDataCategory]

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
          <h2 className="text-cyan-400 text-xl font-mono mb-4">Add {categoryInfo?.title || "Data"}</h2>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-mono mb-2">Category</label>
            <select
              value={newDataCategory}
              onChange={(e) => setNewDataCategory(e.target.value)}
              className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
              disabled={isAddingData}
            >
              <option value="">Select Category</option>
              {Object.keys(CATEGORIES).map((category) => (
                <option key={category} value={category}>
                  {CATEGORIES[category].title}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
            <select
              className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={isAddingData}
            >
              {projects
                .filter((project) => project.id !== "all")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 text-sm font-mono mb-2">Month</label>
              <select
                className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                disabled={isAddingData}
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-mono mb-2">Year</label>
              <select
                className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                disabled={isAddingData}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-mono mb-2">Value</label>
            <input
              type="number"
              min="1"
              step="any"
              value={newDataValue}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value)
                setNewDataValue(isNaN(value) ? 0 : value)
              }}
              className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
              disabled={isAddingData}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
              onClick={() => {
                setShowAddDataModal(false)
                setNewDataCategory("")
                setNewDataValue(1)
              }}
              disabled={isAddingData}
            >
              Cancel
            </button>
            <button
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAddData}
              disabled={isAddingData || !newDataCategory || newDataValue <= 0 || selectedProject === "All Projects"}
            >
              {isAddingData ? "Adding..." : "Add Data"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Update the handleThreatVulnSubmit function
  const handleThreatVulnSubmit = async (e) => {
    e.preventDefault()
    if (!newThreatVulnData.tenant || !newThreatVulnData.count || newThreatVulnData.count <= 0) {
      toast.error("Please fill in all required fields with valid values", {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontFamily: 'monospace',
        },
        icon: '❌',
      });
      return;
    }

    setIsAddingThreatVuln(true)
    try {
      const result = await addThreatVulnerability({
        tenant: selectedProject,
        count: parseInt(newThreatVulnData.count),
        year: selectedYear,
        month: selectedMonth,
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
      })

      if (result.success) {
        toast.success("Threat vulnerability data added successfully", {
          duration: 2000,
          style: {
            background: '#10B981',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          icon: '✅',
        })
        // Reset form
        setNewThreatVulnData({
          tenant: "",
          count: "",
          year: selectedYear,
          month: selectedMonth,
        })
        setShowThreatVulnForm(false)
        // Reload statistics after successful addition
        await loadStatistics()
      } else {
        throw new Error(result.error || "Failed to add threat vulnerability data")
      }
    } catch (error) {
      logger.error("Error adding threat vulnerability data:", error)
      toast.error(error.message || "Failed to add threat vulnerability data", {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontFamily: 'monospace',
        },
        icon: '❌',
      })
    } finally {
      setIsAddingThreatVuln(false)
    }
  }

  // Update the handleThreatDetSubmit function
  const handleThreatDetSubmit = async (e) => {
    e.preventDefault()
    setIsAddingThreatDet(true)
    try {
      const result = await addThreatDetection({
        tenant: newThreatDetData.tenant,
        count: Number.parseInt(newThreatDetData.count),
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
        year: selectedYear,
        month: selectedMonth,
      })

      if (result.success) {
        // Reset form
        setNewThreatDetData({
          tenant: "",
          count: "",
          year: selectedYear,
          month: selectedMonth,
        })
        setShowThreatDetForm(false)
        toast.success("Threat detection data added successfully")
        // Reload statistics after successful addition
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error adding threat detection data:", error)
      toast.error("Failed to add threat detection data")
    } finally {
      setIsAddingThreatDet(false)
    }
  }

  // Add handlers for each type
  const handleSocDetSubmit = async (e) => {
    e.preventDefault()
    setIsAddingSocDet(true)
    try {
      const result = await addSocDetection({
        tenant: newSocDetData.tenant,
        count: Number.parseInt(newSocDetData.count),
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
        year: selectedYear,
        month: selectedMonth,
      })

      if (result.success) {
        setNewSocDetData({
          tenant: "",
          count: "",
          year: selectedYear,
          month: selectedMonth,
        })
        setShowSocDetForm(false)
        toast.success("SOC detection data added successfully")
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error adding SOC detection data:", error)
      toast.error("Failed to add SOC detection data")
    } finally {
      setIsAddingSocDet(false)
    }
  }

  const handleAtipDetSubmit = async (e) => {
    e.preventDefault()
    setIsAddingAtipDet(true)
    try {
      const result = await addAtipDetection({
        tenant: newAtipDetData.tenant,
        count: Number.parseInt(newAtipDetData.count),
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
        year: selectedYear,
        month: selectedMonth,
      })

      if (result.success) {
        setNewAtipDetData({
          tenant: "",
          count: "",
          year: selectedYear,
          month: selectedMonth,
        })
        setShowAtipDetForm(false)
        toast.success("ATIP detection data added successfully")
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error adding ATIP detection data:", error)
      toast.error("Failed to add ATIP detection data")
    } finally {
      setIsAddingAtipDet(false)
    }
  }

  const handleMaliciousDomainsSubmit = async (e) => {
    e.preventDefault()
    setIsAddingMaliciousDomains(true)
    try {
      const result = await addMaliciousDomain({
        tenant: newMaliciousDomainsData.tenant,
        count: Number.parseInt(newMaliciousDomainsData.count),
        timestamp: new Date(selectedYear, selectedMonth, 1).toISOString(),
        year: selectedYear,
        month: selectedMonth,
      })

      if (result.success) {
        setNewMaliciousDomainsData({
          tenant: "",
          count: "",
          year: selectedYear,
          month: selectedMonth,
        })
        setShowMaliciousDomainsForm(false)
        toast.success("Malicious domains data added successfully")
        await loadStatistics()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error("Error adding malicious domains data:", error)
      toast.error("Failed to add malicious domains data")
    } finally {
      setIsAddingMaliciousDomains(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      {/* Filters and Controls */}
      <div className="mb-6 bg-[#111827] rounded-lg p-4 border border-cyan-500/20">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-cyan-400 text-xl font-mono">Project:</h2>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-[#0B1120] text-cyan-400 border border-cyan-500/20 rounded px-3 py-1 font-mono"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <h2 className="text-cyan-400 text-xl font-mono">View:</h2>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="bg-[#0B1120] text-cyan-400 border border-cyan-500/20 rounded px-3 py-1 font-mono"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {viewMode === "monthly" && (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-cyan-400" size={18} />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                className="bg-[#0B1120] text-cyan-400 border border-cyan-500/20 rounded px-3 py-1 font-mono"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                className="bg-[#0B1120] text-cyan-400 border border-cyan-500/20 rounded px-3 py-1 font-mono"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {Object.keys(CATEGORIES).map((category) => (
          <StatsCard key={category} category={category} />
        ))}
      </div>

      {/* Graph Selection Interface */}
      {!selectedGraph && (
        <div className="bg-[#111827] rounded-lg p-6 border border-cyan-500/20 mb-6">
          <h2 className="text-cyan-400 text-xl font-mono mb-4">Select a Graph to View</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedGraph(key)}
                className="bg-[#0B1120] hover:bg-cyan-500/10 text-white p-4 rounded-lg border border-cyan-500/20 transition-all duration-300 flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <category.icon className="text-cyan-400" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-cyan-400 font-mono">{category.title}</h3>
                  <p className="text-gray-400 text-sm font-mono">{category.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Graph */}
      {selectedGraph && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setSelectedGraph(null)}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded font-mono text-sm transition-all duration-300 flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back to Graph Selection
            </button>
          </div>
          <ChartCard category={selectedGraph} />
        </div>
      )}

      {/* Add Data Modal */}
      <AddDataModal />
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Delete ${CATEGORIES[deleteInfo.category]?.title || ""} Data`}
        message={
          deleteInfo.scope === "specific"
            ? `Are you sure you want to delete ${CATEGORIES[deleteInfo.category]?.title || ""} data for ${selectedProject} in ${monthNames[deleteInfo.month]} ${deleteInfo.year}?`
            : deleteInfo.scope === "month"
              ? `Are you sure you want to delete all ${CATEGORIES[deleteInfo.category]?.title || ""} data for ${selectedProject} in ${monthNames[selectedMonth]} ${selectedYear}?`
              : deleteInfo.scope === "year"
                ? `Are you sure you want to delete all ${CATEGORIES[deleteInfo.category]?.title || ""} data for ${selectedProject} in ${selectedYear}?`
                : `Are you sure you want to delete ALL ${CATEGORIES[deleteInfo.category]?.title || ""} data for ${selectedProject} across all time periods? This action cannot be undone.`
        }
      />

      {/* Threat Vulnerabilities Form */}
      {showThreatVulnForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Add Threat Vulnerability Data</h2>
            <form onSubmit={handleThreatVulnSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
                  <select
                    value={newThreatVulnData.tenant}
                    onChange={(e) => setNewThreatVulnData({ ...newThreatVulnData, tenant: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((project) => project.id !== "all")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newThreatVulnData.count}
                    onChange={(e) => setNewThreatVulnData({ ...newThreatVulnData, count: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-mono mb-2">Month and Year</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingThreatVuln}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingThreatVuln}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowThreatVulnForm(false)}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingThreatVuln}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingThreatVuln}
                >
                  {isAddingThreatVuln ? "Adding..." : "Add Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threat Detections Form */}
      {showThreatDetForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Add Threat Detection Data</h2>
            <form onSubmit={handleThreatDetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
                  <select
                    value={newThreatDetData.tenant}
                    onChange={(e) => setNewThreatDetData({ ...newThreatDetData, tenant: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((project) => project.id !== "all")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newThreatDetData.count}
                    onChange={(e) => setNewThreatDetData({ ...newThreatDetData, count: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-mono mb-2">Month and Year</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingThreatDet}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingThreatDet}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowThreatDetForm(false)}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingThreatDet}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingThreatDet}
                >
                  {isAddingThreatDet ? "Adding..." : "Add Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOC Detections Form */}
      {showSocDetForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Add SOC Detection Data</h2>
            <form onSubmit={handleSocDetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
                  <select
                    value={newSocDetData.tenant}
                    onChange={(e) => setNewSocDetData({ ...newSocDetData, tenant: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((project) => project.id !== "all")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newSocDetData.count}
                    onChange={(e) => setNewSocDetData({ ...newSocDetData, count: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-mono mb-2">Month and Year</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingSocDet}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingSocDet}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSocDetForm(false)}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingSocDet}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingSocDet}
                >
                  {isAddingSocDet ? "Adding..." : "Add Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATIP Detections Form */}
      {showAtipDetForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Add ATIP Detection Data</h2>
            <form onSubmit={handleAtipDetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
                  <select
                    value={newAtipDetData.tenant}
                    onChange={(e) => setNewAtipDetData({ ...newAtipDetData, tenant: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((project) => project.id !== "all")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newAtipDetData.count}
                    onChange={(e) => setNewAtipDetData({ ...newAtipDetData, count: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-mono mb-2">Month and Year</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingAtipDet}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingAtipDet}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAtipDetForm(false)}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingAtipDet}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingAtipDet}
                >
                  {isAddingAtipDet ? "Adding..." : "Add Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Malicious Domains Form */}
      {showMaliciousDomainsForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] rounded-lg p-6 w-full max-w-md border border-cyan-500/20">
            <h2 className="text-cyan-400 text-xl font-mono mb-4">Add Malicious Domain Data</h2>
            <form onSubmit={handleMaliciousDomainsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Project</label>
                  <select
                    value={newMaliciousDomainsData.tenant}
                    onChange={(e) => setNewMaliciousDomainsData({ ...newMaliciousDomainsData, tenant: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter((project) => project.id !== "all")
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-mono mb-2">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaliciousDomainsData.count}
                    onChange={(e) => setNewMaliciousDomainsData({ ...newMaliciousDomainsData, count: e.target.value })}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-mono mb-2">Month and Year</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingMaliciousDomains}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full bg-[#0B1120] text-white border border-cyan-500/20 rounded px-3 py-2 font-mono"
                    disabled={isAddingMaliciousDomains}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMaliciousDomainsForm(false)}
                  className="bg-transparent hover:bg-gray-700 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300"
                  disabled={isAddingMaliciousDomains}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-mono text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingMaliciousDomains}
                >
                  {isAddingMaliciousDomains ? "Adding..." : "Add Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
