'use client'

import React, { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  X, 
  Download, 
  Shield, 
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react'
import {
  saveATIPEntry,
  updateATIPEntry,
  deleteATIPEntry,
  listenToATIPEntries,
} from '@/services/management'
import { logger } from '@/utils/logger'

export default function ATIPConsolidated() {
  const [selectedTenant, setSelectedTenant] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('1D')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showEntryConfirmModal, setShowEntryConfirmModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [showScrollShadow, setShowScrollShadow] = useState({ top: false, bottom: false })
  const [showHorizontalScrollShadow, setShowHorizontalScrollShadow] = useState({ left: false, right: false })
  const [newEntry, setNewEntry] = useState({
    domain: '',
    attempts: '',
    ips: '',
    date: new Date().toISOString().split('T')[0],
    tenant: ''
  })
  const [entries, setEntries] = useState([])
  const [isFirebaseError, setIsFirebaseError] = useState(false)
  const [stats, setStats] = useState({
    totalMaliciousDomains: 0,
    totalConnectionAttempts: 0
  })
  const [trendSummary, setTrendSummary] = useState({
    last24Hours: { count: 0, percentage: 0 },
    last7Days: { count: 0, percentage: 0 },
    last30Days: { count: 0, percentage: 0 }
  })
  const [tenantDistribution, setTenantDistribution] = useState({
    'MWELL': 0,
    'SiyCha': 0,
    'MPIW': 0,
    'NIKI': 0,
    'Cantilan': 0
  })
  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'Malicious Domains Detected',
        data: [65, 59, 80, 81, 56],
        borderColor: 'rgb(6, 182, 212)',
        tension: 0.1
      },
      {
        label: 'Connection Attempts',
        data: [28, 48, 40, 19, 86],
        borderColor: 'rgb(234, 179, 8)',
        tension: 0.1
      }
    ]
  })
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [deleteAction, setDeleteAction] = useState({
    type: null, // 'single' or 'batch'
    entries: null,
    onConfirm: null
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateDomains, setDuplicateDomains] = useState([])


  // Calculate trend summary
  const calculateTrendSummary = (entries) => {
    const now = new Date()
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const entriesLast24Hours = entries.filter(entry => new Date(entry.date) >= last24Hours)
    const entriesLast7Days = entries.filter(entry => new Date(entry.date) >= last7Days)
    const entriesLast30Days = entries.filter(entry => new Date(entry.date) >= last30Days)

    // Calculate percentage changes
    const previousDay = entries.filter(entry => {
      const date = new Date(entry.date)
      return date >= new Date(now - 48 * 60 * 60 * 1000) && date < last24Hours
    })
    const previousWeek = entries.filter(entry => {
      const date = new Date(entry.date)
      return date >= new Date(now - 14 * 24 * 60 * 60 * 1000) && date < last7Days
    })
    const previousMonth = entries.filter(entry => {
      const date = new Date(entry.date)
      return date >= new Date(now - 60 * 24 * 60 * 60 * 1000) && date < last30Days
    })

    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    setTrendSummary({
      last24Hours: {
        count: entriesLast24Hours.length,
        percentage: calculatePercentageChange(entriesLast24Hours.length, previousDay.length)
      },
      last7Days: {
        count: entriesLast7Days.length,
        percentage: calculatePercentageChange(entriesLast7Days.length, previousWeek.length)
      },
      last30Days: {
        count: entriesLast30Days.length,
        percentage: calculatePercentageChange(entriesLast30Days.length, previousMonth.length)
      }
    })
  }

  // Calculate tenant distribution
  const calculateTenantDistribution = (entries) => {
    const distribution = entries.reduce((acc, entry) => {
      acc[entry.tenant] = (acc[entry.tenant] || 0) + 1
      return acc
    }, {
      'MWELL': 0,
      'SiyCha': 0,
      'MPIW': 0,
      'NIKI': 0,
      'Cantilan': 0
    })

    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    
    // Convert counts to percentages
    Object.keys(distribution).forEach(tenant => {
      distribution[tenant] = total > 0 ? Math.round((distribution[tenant] / total) * 100) : 0
    })

    setTenantDistribution(distribution)
  }

  // Listen to entries from Firebase
  useEffect(() => {
    let unsubscribe = () => {}
    
    try {
      setIsLoading(true)
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()
      
      // Calculate date range
      switch (selectedDateRange) {
        case '1D':
          startDate = new Date(selectedDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(selectedDate)
          endDate.setHours(23, 59, 59, 999)
          break
        case '7D':
          startDate = new Date()
          startDate.setDate(now.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          endDate = now
          endDate.setHours(23, 59, 59, 999)
          break
        case '1M':
          const [year, month] = selectedMonth.split('-')
          startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
          endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0)
          endDate.setHours(23, 59, 59, 999)
          break
        default:
          startDate = new Date(selectedDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(selectedDate)
          endDate.setHours(23, 59, 59, 999)
          break
      }

      // Format dates for Firebase query
      const startDateStr = startDate.toISOString()
      const endDateStr = endDate.toISOString()

      const filters = {
        tenant: selectedTenant !== 'all' ? selectedTenant : null,
        startDate: startDateStr,
        endDate: endDateStr
      }

      logger.info('Date Range:', {
        start: startDateStr,
        end: endDateStr,
        range: selectedDateRange,
        selectedDate
      })

      // Set up real-time listener for entries
      unsubscribe = listenToATIPEntries(
        filters,
        (newEntries) => {
          // Filter entries by date range
          const filteredEntries = newEntries.filter(entry => {
            const entryDate = new Date(entry.date)
            // Only apply date range filter if not in daily view
            if (selectedDateRange !== '1D') {
              return entryDate >= startDate && entryDate <= endDate
            }
            return true // Show all entries in daily view
          })
          
          setEntries(filteredEntries)
          setIsFirebaseError(false)
          calculateTrendSummary(filteredEntries)
          calculateTenantDistribution(filteredEntries)

          // Calculate stats from filtered entries
          const newStats = {
            totalMaliciousDomains: filteredEntries.reduce((sum, entry) => {
              // Only count domains for entries that match the selected tenant
              if (selectedTenant === 'all' || entry.tenant === selectedTenant) {
                return sum + 1  // Count each domain as 1
              }
              return sum
            }, 0),
            totalConnectionAttempts: filteredEntries.reduce((sum, entry) => {
              // Only count attempts for entries that match the selected tenant
              if (selectedTenant === 'all' || entry.tenant === selectedTenant) {
                return sum + parseInt(entry.attempts || 0)  // Sum the attempts
              }
              return sum
            }, 0)
          }
          setStats(newStats)
          setIsLoading(false)
        },
        (error) => {
          logger.error('Error fetching entries:', error)
          setIsFirebaseError(true)
          setIsLoading(false)
          toast.error('Error fetching entries. Please check your connection.')
        }
      )
    } catch (error) {
      logger.error('Error setting up entries listener:', error)
      setIsFirebaseError(true)
      setIsLoading(false)
    }

    return () => unsubscribe()
  }, [selectedTenant, selectedDateRange, selectedDate, selectedMonth])

  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const key = entry.date
    if (!groups[key]) {
      groups[key] = {
        date: entry.date,
        entries: [],
        totals: {
          domains: 0,
          attempts: 0,
          uniqueIPs: new Set()
        }
      }
    }
    groups[key].entries.push(entry)
    groups[key].totals.domains += 1
    groups[key].totals.attempts += parseInt(entry.attempts || 0)
    entry.ips.split(',').forEach(ip => groups[key].totals.uniqueIPs.add(ip.trim()))
    return groups
  }, {})

  // Sort groups by date and filter by search query
  const sortedGroups = Object.values(groupedEntries)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(group => {
      // First apply date range filter
      if (selectedDateRange === '1D') {
        const groupDate = new Date(group.date).toISOString().split('T')[0]
        if (groupDate !== selectedDate) return false
      } else {
        const groupDate = new Date(group.date)
        const now = new Date()
        let startDate = new Date()
        
        switch (selectedDateRange) {
          case '7D':
            startDate = new Date()
            startDate.setDate(now.getDate() - 6)
            startDate.setHours(0, 0, 0, 0)
            if (!(groupDate >= startDate && groupDate <= now)) return false
            break
          case '1M':
            const [year, month] = selectedMonth.split('-')
            startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
            const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0)
            endDate.setHours(23, 59, 59, 999)
            if (!(groupDate >= startDate && groupDate <= endDate)) return false
            break
        }
      }

      return true
    })

  // Get all entries for search, independent of filters
  const getAllEntries = () => {
    return Object.values(groupedEntries).flatMap(group => group.entries)
  }

  // Search entries independently of filters
  const searchResults = searchQuery.trim() ? getAllEntries().filter(entry => {
    const query = searchQuery.toLowerCase().trim()
    return entry.domain.toLowerCase().includes(query) ||
           entry.ips.toLowerCase().includes(query) ||
           entry.attempts.includes(query)
  }) : []

  // Group search results by domain for better organization
  const groupedSearchResults = searchResults.reduce((acc, entry) => {
    const key = entry.domain.toLowerCase()
    if (!acc[key]) {
      acc[key] = {
        domain: entry.domain,
        entries: [],
        totalAttempts: 0,
        uniqueIPs: new Set(),
        dates: new Set(),
        tenants: new Set()
      }
    }
    acc[key].entries.push(entry)
    acc[key].totalAttempts += parseInt(entry.attempts || 0)
    entry.ips.split(',').forEach(ip => acc[key].uniqueIPs.add(ip.trim()))
    acc[key].dates.add(new Date(entry.date).getTime())
    acc[key].tenants.add(entry.tenant)
    return acc
  }, {})

  // Handle view details
  const handleViewDetails = (entries) => {
    setSelectedEntry({ entries })
    setShowDetailsModal(true)
  }

  // Add this function after the existing state declarations
  const checkDuplicateDomains = (domains) => {
    const domainList = domains.split('\n').filter(d => d.trim())
    const duplicates = domainList.filter(domain => {
      return entries.some(entry => 
        entry.domain.toLowerCase() === domain.toLowerCase()
      )
    })
    return duplicates
  }

  // Modify the handleEntrySubmit function
  const handleEntrySubmit = async (e) => {
    e.preventDefault()
    
    // Check for duplicates
    const duplicates = checkDuplicateDomains(newEntry.domain)
    if (duplicates.length > 0) {
      setDuplicateDomains(duplicates)
      setShowDuplicateModal(true)
      return
    }
    
    setShowEntryConfirmModal(true)
  }

  // Add this before the return statement
  const handleDuplicateConfirm = () => {
    setShowDuplicateModal(false)
    setDuplicateDomains([])
    setShowEntryConfirmModal(true)
  }

  const confirmAddEntry = async () => {
    setIsLoading(true)
    try {
      // Split the entries by line and create an array of entries
      const domains = newEntry.domain.split('\n').filter(d => d.trim())
      const attempts = newEntry.attempts.split('\n').filter(a => a.trim())
      const ips = newEntry.ips.split('\n').filter(ip => ip.trim())
      
      // Create entries for each domain
      for (let i = 0; i < domains.length; i++) {
        await saveATIPEntry({
          domain: domains[i].trim(),
          attempts: attempts[i]?.trim() || '0',
          ips: ips[i]?.trim() || '',
          date: newEntry.date,
          tenant: newEntry.tenant
        })
      }

      toast.success('Entries added successfully')
      setShowEntryModal(false)
      setShowEntryConfirmModal(false)
      setSelectedEntry(null)
      setNewEntry({
        domain: '',
        attempts: '',
        ips: '',
        date: new Date().toISOString().split('T')[0],
        tenant: 'MWELL'
      })
    } catch (error) {
      logger.error('Error saving entries:', error)
      toast.error('Failed to save entries')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete entry
  const handleDeleteEntry = async (id) => {
    setDeleteAction({
      type: 'single',
      entries: [id],
      onConfirm: async () => {
        setIsLoading(true)
        try {
          const result = await deleteATIPEntry(id)
          if (result.success) {
            toast.success('Entry deleted successfully')
          } else {
            throw new Error(result.error)
          }
        } catch (error) {
          logger.error('Error deleting entry:', error)
          toast.error('Failed to delete entry')
        } finally {
          setIsLoading(false)
          setShowConfirmModal(false)
        }
      }
    })
    setShowConfirmModal(true)
  }

  // Handle batch delete entries
  const handleBatchDelete = async (entries) => {
    setDeleteAction({
      type: 'batch',
      entries: entries,
      onConfirm: async () => {
        setIsLoading(true)
        try {
          const deletePromises = entries.map(entry => deleteATIPEntry(entry.id))
          await Promise.all(deletePromises)
          toast.success(`Successfully deleted ${entries.length} entries`)
        } catch (error) {
          logger.error('Error deleting entries:', error)
          toast.error('Failed to delete some entries')
        } finally {
          setIsLoading(false)
          setShowConfirmModal(false)
        }
      }
    })
    setShowConfirmModal(true)
  }

  // Handle edit entry
  const handleEditEntry = (entries) => {
    // Now accepting entries array instead of single entry
    setEditEntry({
      date: entries[0].date, // All entries in same date group have same date
      tenant: entries[0].tenant,
      // Join multiple entries with newlines
      domain: entries.map(e => e.domain).join('\n'),
      attempts: entries.map(e => e.attempts).join('\n'),
      ips: entries.map(e => e.ips).join('\n'),
      // Store all entry IDs for batch update
      entryIds: entries.map(e => e.id)
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setShowEditConfirmModal(true)
  }

  const confirmEdit = async () => {
    setIsLoading(true)
    try {
      // Split the entries back into individual records
      const domains = editEntry.domain.split('\n').filter(d => d.trim())
      const attempts = editEntry.attempts.split('\n').filter(a => a.trim())
      const ips = editEntry.ips.split('\n').filter(ip => ip.trim())

      // Update each entry with the new date and tenant
      const updatePromises = editEntry.entryIds.map((id, index) => {
        return updateATIPEntry(id, {
          domain: domains[index] || '',
          attempts: attempts[index] || '0',
          ips: ips[index] || '',
          date: editEntry.date,
          tenant: editEntry.tenant
        })
      })

      const results = await Promise.all(updatePromises)
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => !result.success)
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} entries`)
      }

      toast.success('All entries updated successfully')
      setShowEditModal(false)
      setShowEditConfirmModal(false)
      setEditEntry(null)
    } catch (error) {
      logger.error('Error updating entries:', error)
      toast.error('Failed to update entries')
    } finally {
      setIsLoading(false)
    }
  }

  // Add exportToCSV function
  const exportToCSV = () => {
    try {
      // Create CSV headers
      const headers = ['Date', 'Tenant', 'Malicious Domain', 'Connection Attempts', 'Accessing Internal IPs']
      
      // Transform entries to CSV format
      const csvData = entries.map(entry => [
        new Date(entry.date).toLocaleDateString(),
        entry.tenant === 'SiyCha' ? 'Project Orion' :
        entry.tenant === 'MWELL' ? 'Project Chiron' :
        entry.tenant === 'MPIW' ? 'Project Hunt' :
        entry.tenant === 'NIKI' ? 'Project NIKI' :
        entry.tenant === 'Cantilan' ? 'Project Atlas' :
        entry.tenant,
        entry.domain,
        entry.attempts,
        entry.ips
      ])

      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `atip_consolidated_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('CSV file exported successfully')
    } catch (error) {
      logger.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV file')
    }
  }

  // Add scroll handler for vertical scroll
  const handleVerticalScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const isAtTop = scrollTop === 0
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1

    setShowScrollShadow({
      top: !isAtTop,
      bottom: !isAtBottom
    })
  }

  // Add scroll handler for horizontal scroll
  const handleHorizontalScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target
    const isAtLeft = scrollLeft === 0
    const isAtRight = Math.abs(scrollWidth - clientWidth - scrollLeft) < 1

    setShowHorizontalScrollShadow({
      left: !isAtLeft,
      right: !isAtRight
    })
  }

  return (
    <div 
      className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 scrollbar-thin"
      onScroll={handleVerticalScroll}
    >
      <Toaster position="top-right" />
      {isFirebaseError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle size={20} />
            <h3 className="font-medium">Connection Error</h3>
          </div>
          <p className="text-gray-300 text-sm">
            There was an error connecting to the database. Please check your connection and try again.
          </p>
        </div>
      )}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {isLoading && (
          <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex flex-col justify-center items-center">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin border-b-transparent"></div>
              </div>
            </div>
            <div className="text-center space-y-2 mt-6">
              <div className="text-cyan-500 font-mono text-lg animate-pulse">Loading ATIP Data</div>
              <div className="text-gray-400 text-sm font-mono">Analyzing Malicious Domains...</div>
              <div className="flex space-x-2 justify-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-cyan-400 font-mono">
              ATIP Consolidated Malicious Domains
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-md font-medium flex items-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Domains
              </button>
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md font-medium flex items-center gap-2 transition-all"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={() => setShowEntryModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-md font-medium flex items-center gap-2 transition-all"
              >
                <Plus size={16} />
                Add ATIP
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2.5 font-mono appearance-none pr-8 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              >
                <option value="all">All Projects</option>
                <option value="MWELL">Project Chiron</option>
                <option value="SiyCha">Project Orion</option>
                <option value="MPIW">Project Hunt</option>
                <option value="NIKI">Project NIKI</option>
                <option value="Cantilan">Project Atlas</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2.5 font-mono appearance-none pr-8 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                >
                  <option value="1D">Daily View</option>
                  <option value="7D">Weekly View</option>
                  <option value="1M">Monthly View</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {selectedDateRange === '1D' && (
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              )}

              {selectedDateRange === '1M' && (
                <div className="relative flex-1">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-gray-800 text-gray-300 border border-cyan-500/20 rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Search Modal */}
          {showSearchModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-cyan-400 font-mono text-xl flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Domains
                  </h3>
                  <button 
                    onClick={() => {
                      setShowSearchModal(false)
                      setSearchQuery('')
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by domain, IP, or connection attempts..."
                      className="w-full bg-gray-900/80 text-gray-300 border border-cyan-500/20 rounded-lg p-3 pl-10 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {searchQuery ? (
                    <div className="bg-gray-800/50 rounded-lg border border-cyan-500/20 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-gray-300">
                          <thead className="bg-gray-700/50 sticky top-0">
                            <tr className="font-mono">
                              <th className="px-4 py-3 text-left">Domain</th>
                              <th className="px-4 py-3 text-left">Total Connection Attempts</th>
                              <th className="px-4 py-3 text-left">Unique Internal IPs</th>
                              <th className="px-4 py-3 text-left">Affected Projects</th>
                              <th className="px-4 py-3 text-left">First Seen</th>
                              <th className="px-4 py-3 text-left">Last Seen</th>
                              <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {Object.values(groupedSearchResults).map((result) => (
                              <tr key={result.domain} className="hover:bg-gray-700/30">
                                <td className="px-4 py-3 font-mono whitespace-normal break-all">
                                  {result.domain}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {result.totalAttempts.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {result.uniqueIPs.size}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {Array.from(result.tenants).map(tenant => 
                                    tenant === 'SiyCha' ? 'Project Orion' :
                                    tenant === 'MWELL' ? 'Project Chiron' :
                                    tenant === 'MPIW' ? 'Project Hunt' :
                                    tenant === 'NIKI' ? 'Project NIKI' :
                                    tenant === 'Cantilan' ? 'Project Atlas' :
                                    tenant
                                  ).join(', ')}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {new Date(Math.min(...Array.from(result.dates))).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {new Date(Math.max(...Array.from(result.dates))).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex space-x-3">
                                    <button 
                                      className="text-cyan-400 hover:text-cyan-300"
                                      onClick={() => {
                                        handleViewDetails(result.entries)
                                        setShowSearchModal(false)
                                      }}
                                      title="View Details"
                                    >
                                      <Eye size={18} />
                                    </button>
                                    <button 
                                      className="text-yellow-400 hover:text-yellow-300"
                                      onClick={() => {
                                        handleEditEntry(result.entries)
                                        setShowSearchModal(false)
                                      }}
                                      title="Edit Entries"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    <button 
                                      className="text-red-400 hover:text-red-300"
                                      onClick={() => {
                                        handleBatchDelete(result.entries)
                                        setShowSearchModal(false)
                                      }}
                                      title="Delete Entries"
                                      disabled={isLoading}
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {Object.keys(groupedSearchResults).length === 0 && (
                        <div className="p-8 text-center text-gray-400 font-mono">
                          No domains found matching your search criteria
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 font-mono p-8">
                      Enter a search query to find domains
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-6 border border-cyan-500/20 shadow-lg hover:shadow-cyan-500/5 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-yellow-400 text-sm font-mono">Total Malicious Domains</h3>
              </div>
              <p className="text-3xl font-bold text-gray-200">{stats.totalMaliciousDomains}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-lg p-6 border border-cyan-500/20 shadow-lg hover:shadow-cyan-500/5 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-blue-400 text-sm font-mono">Total Connection Attempts</h3>
              </div>
              <p className="text-3xl font-bold text-gray-200">{stats.totalConnectionAttempts}</p>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-cyan-400 font-mono">Trend Summary</h3>
                <button className="text-yellow-400 hover:text-yellow-300 text-sm font-mono">
                  View Details
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Last 24 Hours</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-mono">{trendSummary.last24Hours.count}</span>
                    <span className={`font-mono ${trendSummary.last24Hours.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trendSummary.last24Hours.percentage >= 0 ? '+' : ''}{trendSummary.last24Hours.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Last 7 Days</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-mono">{trendSummary.last7Days.count}</span>
                    <span className={`font-mono ${trendSummary.last7Days.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trendSummary.last7Days.percentage >= 0 ? '+' : ''}{trendSummary.last7Days.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Last 30 Days</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-mono">{trendSummary.last30Days.count}</span>
                    <span className={`font-mono ${trendSummary.last30Days.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trendSummary.last30Days.percentage >= 0 ? '+' : ''}{trendSummary.last30Days.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-cyan-400 font-mono">Tenant Distribution</h3>
                <button className="text-yellow-400 hover:text-yellow-300 text-sm font-mono">
                  View Details
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Project Chiron</span>
                  <span className="text-yellow-400 font-mono">{tenantDistribution['MWELL']}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Project Orion</span>
                  <span className="text-yellow-400 font-mono">{tenantDistribution['SiyCha']}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Project Hunt</span>
                  <span className="text-yellow-400 font-mono">{tenantDistribution['MPIW']}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Project NIKI</span>
                  <span className="text-yellow-400 font-mono">{tenantDistribution['NIKI']}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-mono">Project Atlas</span>
                  <span className="text-yellow-400 font-mono">{tenantDistribution['Cantilan']}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-gray-800/50 rounded-lg border border-cyan-500/20 overflow-hidden">
            <div 
              className="overflow-x-auto scrollbar-thin"
              onScroll={handleHorizontalScroll}
            >
              <div className={`scroll-shadow-left ${showHorizontalScrollShadow.left ? 'opacity-100' : 'opacity-0'}`} />
              <div className={`scroll-shadow-right ${showHorizontalScrollShadow.right ? 'opacity-100' : 'opacity-0'}`} />
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-gray-700/50">
                  <tr className="font-mono">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Total Malicious Domains</th>
                    <th className="px-4 py-3 text-left">Total Connection Attempts</th>
                    <th className="px-4 py-3 text-left">Total Unique IPs</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedGroups
                    .slice(currentPage * 20, (currentPage + 1) * 20)
                    .map((group) => (
                    <tr key={group.date} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-mono">
                        {new Date(group.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono">{group.totals.domains}</td>
                      <td className="px-4 py-3 font-mono">{group.totals.attempts}</td>
                      <td className="px-4 py-3 font-mono">{group.totals.uniqueIPs.size}</td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-3">
                          <button 
                            className="text-cyan-400 hover:text-cyan-300"
                            onClick={() => handleViewDetails(group.entries)}
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="text-yellow-400 hover:text-yellow-300"
                            onClick={() => handleEditEntry(group.entries)}
                            title="Edit Entries"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleBatchDelete(group.entries)}
                            title="Delete Entries"
                            disabled={isLoading}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center items-center gap-4 p-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                  currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Previous
              </button>
              <span className="text-gray-400 font-mono text-sm">
                Page {currentPage + 1} of {Math.ceil(sortedGroups.length / 20)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedGroups.length / 20) - 1, prev + 1))}
                disabled={currentPage >= Math.ceil(sortedGroups.length / 20) - 1}
                className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                  currentPage >= Math.ceil(sortedGroups.length / 20) - 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
    </div>

    {/* Entry Modal */}
    {showEntryModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div 
          className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-thin"
          onScroll={handleVerticalScroll}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-cyan-400 font-mono text-xl">
              {selectedEntry ? 'Edit ATIP' : 'Add New ATIP'}
            </h3>
            <button 
              onClick={() => {
                setShowEntryModal(false)
                setSelectedEntry(null)
                setNewEntry({
                  domain: '',
                  attempts: '',
                  ips: '',
                  date: new Date().toISOString().split('T')[0],
                  tenant: 'MWELL'
                })
              }}
              className="text-gray-400 hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleEntrySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Tenant</label>
                <select
                  value={newEntry.tenant}
                  onChange={(e) => setNewEntry({ ...newEntry, tenant: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono appearance-none"
                  required
                >
                  <option value="MWELL">Project Chiron</option>
                  <option value="SiyCha">Project Orion</option>
                  <option value="MPIW">Project Hunt</option>
                  <option value="NIKI">Project NIKI</option>
                  <option value="Cantilan">Project Atlas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Confirmed Malicious Domains</label>
                <textarea
                  value={newEntry.domain}
                  onChange={(e) => setNewEntry({ ...newEntry, domain: e.target.value })}
                  placeholder="Enter domains (one per line)"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Connection Attempts</label>
                <textarea
                  value={newEntry.attempts}
                  onChange={(e) => setNewEntry({ ...newEntry, attempts: e.target.value })}
                  placeholder="Enter attempts (one per line)"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Accessing Internal IPs</label>
                <textarea
                  value={newEntry.ips}
                  onChange={(e) => setNewEntry({ ...newEntry, ips: e.target.value })}
                  placeholder="Enter IPs (one per line)"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEntryModal(false)
                  setSelectedEntry(null)
                  setNewEntry({
                    domain: '',
                    attempts: '',
                    ips: '',
                    date: new Date().toISOString().split('T')[0],
                    tenant: 'MWELL'
                  })
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md font-medium transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {selectedEntry ? 'Update' : 'Add'} Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Details Modal */}
    {showDetailsModal && selectedEntry && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div 
          className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-thin"
          onScroll={handleVerticalScroll}
        >
          <div className="flex justify-between items-center mb-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-cyan-400 font-mono text-xl">Malicious Domains Details</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditEntry(selectedEntry.entries)}
                className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 transition-all"
                title="Edit Entries"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedEntry(null)
                }}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 text-gray-400 hover:text-gray-300 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-yellow-400 text-sm font-mono mb-2">Total Malicious Domains</h4>
              <p className="text-2xl font-bold text-gray-200">{selectedEntry.entries.length}</p>
            </div>
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-yellow-400 text-sm font-mono mb-2">Total Connection Attempts</h4>
              <p className="text-2xl font-bold text-gray-200">
                {selectedEntry.entries.reduce((sum, entry) => sum + parseInt(entry.attempts || 0), 0)}
              </p>
            </div>
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-yellow-400 text-sm font-mono mb-2">Total Unique IPs</h4>
              <p className="text-2xl font-bold text-gray-200">
                {new Set(selectedEntry.entries.flatMap(entry => entry.ips.split(',').map(ip => ip.trim()))).size}
              </p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-gray-700/50">
                <tr className="font-mono">
                  <th className="px-4 py-3 text-left">Tenant</th>
                  <th className="px-4 py-3 text-left">Malicious Domain</th>
                  <th className="px-4 py-3 text-left">Connection Attempts</th>
                  <th className="px-4 py-3 text-left">Accessing Internal IPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {selectedEntry.entries.map((detail, index) => (
                  <tr key={index} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-mono">
                      {detail.tenant === 'SiyCha' ? 'Project Orion' :
                       detail.tenant === 'MWELL' ? 'Project Chiron' :
                       detail.tenant === 'MPIW' ? 'Project Hunt' :
                       detail.tenant === 'NIKI' ? 'Project NIKI' :
                       detail.tenant === 'Cantilan' ? 'Project Atlas' :
                       detail.tenant}
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-normal break-all">{detail.domain}</td>
                    <td className="px-4 py-3 font-mono">{detail.attempts}</td>
                    <td className="px-4 py-3 font-mono whitespace-normal break-all">{detail.ips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Confirmation Modal */}
    {showConfirmModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-400 font-mono mb-1">
                Confirm Deletion
              </h3>
              <p className="text-gray-400 text-sm font-mono">
                {deleteAction.type === 'batch' 
                  ? `Are you sure you want to delete ${deleteAction.entries.length} entries?`
                  : 'Are you sure you want to delete this entry?'
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all font-mono"
            >
              Cancel
            </button>
            <button
              onClick={deleteAction.onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-md font-medium transition-all font-mono flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    {showEditModal && editEntry && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-cyan-400 font-mono text-xl">
              Edit Entries for {new Date(editEntry?.date).toLocaleDateString()}
            </h3>
            <button 
              onClick={() => {
                setShowEditModal(false)
                setEditEntry(null)
              }}
              className="text-gray-400 hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={editEntry.date}
                  onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Tenant</label>
                <select
                  value={editEntry.tenant}
                  onChange={(e) => setEditEntry({ ...editEntry, tenant: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono appearance-none"
                  required
                >
                  <option value="MWELL">Project Chiron</option>
                  <option value="SiyCha">Project Orion</option>
                  <option value="MPIW">Project Hunt</option>
                  <option value="NIKI">Project NIKI</option>
                  <option value="Cantilan">Project Atlas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Confirmed Malicious Domains</label>
                <textarea
                  value={editEntry.domain}
                  onChange={(e) => setEditEntry({ ...editEntry, domain: e.target.value })}
                  placeholder="Enter domains (one per line)"
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Connection Attempts</label>
                <textarea
                  value={editEntry.attempts}
                  onChange={(e) => setEditEntry({ ...editEntry, attempts: e.target.value })}
                  placeholder="Enter attempts (one per line)"
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Accessing Internal IPs</label>
                <textarea
                  value={editEntry.ips}
                  onChange={(e) => setEditEntry({ ...editEntry, ips: e.target.value })}
                  placeholder="Enter IPs (one per line)"
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setEditEntry(null)
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md font-medium transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Edit2 size={16} />
                )}
                Update Entries
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Confirmation Modal */}
    {showEditConfirmModal && editEntry && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyan-500/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-400 font-mono mb-1">
                Confirm Update
              </h3>
              <p className="text-gray-400 text-sm font-mono">
                Are you sure you want to update these entries?
              </p>
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
            <p className="text-gray-300 text-sm mb-2">Changes to be made:</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-cyan-400">{editEntry.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tenant:</span>
                <span className="text-cyan-400">
                  {editEntry.tenant === 'SiyCha' ? 'Project Orion' :
                   editEntry.tenant === 'MWELL' ? 'Project Chiron' :
                   editEntry.tenant === 'MPIW' ? 'Project Hunt' :
                   editEntry.tenant === 'NIKI' ? 'Project NIKI' :
                   editEntry.tenant === 'Cantilan' ? 'Project Atlas' :
                   editEntry.tenant}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowEditConfirmModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all font-mono"
            >
              Cancel
            </button>
            <button
              onClick={confirmEdit}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md font-medium transition-all font-mono flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Edit2 size={16} />
                  <span>Confirm Update</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Entry Confirmation Modal */}
    {showEntryConfirmModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyan-500/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-400 font-mono mb-1">
                Confirm New Entry
              </h3>
              <p className="text-gray-400 text-sm font-mono">
                Please review the entry details before confirming:
              </p>
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-cyan-400">{new Date(newEntry.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tenant:</span>
                <span className="text-cyan-400">
                  {newEntry.tenant === 'SiyCha' ? 'Project Orion' :
                   newEntry.tenant === 'MWELL' ? 'Project Chiron' :
                   newEntry.tenant === 'MPIW' ? 'Project Hunt' :
                   newEntry.tenant === 'NIKI' ? 'Project NIKI' :
                   newEntry.tenant === 'Cantilan' ? 'Project Atlas' :
                   newEntry.tenant}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Domains:</span>
                <div className="bg-gray-800/50 rounded p-2 max-h-32 overflow-y-auto">
                  {newEntry.domain.split('\n').map((domain, index) => (
                    <div key={index} className="text-cyan-400 text-sm font-mono">
                      {domain.trim()}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Connection Attempts:</span>
                <div className="bg-gray-800/50 rounded p-2 max-h-32 overflow-y-auto">
                  {newEntry.attempts.split('\n').map((attempt, index) => (
                    <div key={index} className="text-cyan-400 text-sm font-mono">
                      {attempt.trim() || '0'}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Internal IPs:</span>
                <div className="bg-gray-800/50 rounded p-2 max-h-32 overflow-y-auto">
                  {newEntry.ips.split('\n').map((ip, index) => (
                    <div key={index} className="text-cyan-400 text-sm font-mono">
                      {ip.trim() || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowEntryConfirmModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all font-mono"
            >
              Cancel
            </button>
            <button
              onClick={confirmAddEntry}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md font-medium transition-all font-mono flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Confirm Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Duplicate Domains Modal */}
    {showDuplicateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-400 font-mono mb-1">
                Duplicate Domains Detected
              </h3>
              <p className="text-gray-400 text-sm font-mono">
                The following domains already exist in the ATIP database:
              </p>
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              {duplicateDomains.map((domain, index) => (
                <div key={index} className="text-yellow-400 text-sm font-mono">
                  {domain}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDuplicateModal(false)
                setDuplicateDomains([])
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-all font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicateConfirm}
              className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-md font-medium transition-all font-mono flex items-center gap-2"
            >
              <AlertCircle size={16} />
              <span>Proceed Anyway</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
}