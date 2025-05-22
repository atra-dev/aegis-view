'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { getActivityLogs, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from '@/services/activityLog'
import { Activity, Filter, RefreshCw, Shield, AlertCircle, Server, User, Database, Bell, Settings, AlertTriangle, Lock, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import { logger } from '@/utils/logger'

export default function ActivityLogPage() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [filters, setFilters] = useState({
    category: '',
    action: '',
    startDate: '',
    endDate: ''
  })
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [allLogs, setAllLogs] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser
      if (!user) {
        router.push('/auth/signin')
        return
      }

      try {
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          const role = userDoc.data().role
          setUserRole(role)
          if (role !== 'specialist' && role !== 'super_admin' && role !== 'coo' && role !== 'ciso') {
            toast.error('Access denied. Only specialists, super admins, COO, and CISO can view activity logs.')
            router.push('/dashboard')
            return
          }
          setLoading(false)
          loadActivityLogs()
        }
      } catch (error) {
        logger.error('Error checking user role:', error)
        toast.error('Error checking user permissions')
        router.push('/dashboard')
      }
    }

    checkUserRole()
  }, [router])

  const loadActivityLogs = async (loadMore = false) => {
    try {
      setLoading(true)
      logger.info('Current filters:', filters); // Debug log
      
      // Clean up filters before sending
      const cleanFilters = {
        ...filters,
        lastDoc: loadMore ? lastDoc : null,
        // Convert category to lowercase to match database values
        category: filters.category ? filters.category.toLowerCase() : '',
        // Convert action to lowercase to match database values
        action: filters.action ? filters.action.toLowerCase() : ''
      };
      
      logger.info('Clean filters:', cleanFilters); // Debug log
      const result = await getActivityLogs(cleanFilters);
      logger.info('Fetched logs:', result.logs); // Debug log
      
      setLogs(prevLogs => loadMore ? [...prevLogs, ...result.logs] : result.logs)
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (error) {
      logger.error('Error loading activity logs:', error)
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case ACTIVITY_CATEGORIES.AUTH:
        return <Lock className="w-5 h-5 text-blue-400" />
      case ACTIVITY_CATEGORIES.ATTENDANCE:
        return <User className="w-5 h-5 text-green-400" />
      case ACTIVITY_CATEGORIES.NAVIGATION:
        return <Activity className="w-5 h-5 text-purple-400" />
      default:
        return <Activity className="w-5 h-5 text-gray-400" />
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const applyFilters = () => {
    setCurrentPage(1)
    loadActivityLogs()
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      setLastDoc(null)
      loadActivityLogs()
    }
  }

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
      loadActivityLogs(true)
    }
  }

  const fetchAllLogs = async () => {
    try {
      setIsExporting(true)
      let allLogs = []
      let lastDoc = null
      let hasMore = true

      while (hasMore) {
        const cleanFilters = {
          ...filters,
          lastDoc: lastDoc
        }
        
        const result = await getActivityLogs(cleanFilters)
        allLogs = [...allLogs, ...result.logs]
        lastDoc = result.lastDoc
        hasMore = result.hasMore
      }

      return allLogs
    } catch (error) {
      logger.error('Error fetching all logs:', error)
      toast.error('Failed to fetch logs for export')
      return []
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = async () => {
    try {
      setIsExporting(true)
      let logsToExport = logs

      // If there are filters applied, use the current logs
      // If no filters, fetch all logs
      const hasFilters = Object.values(filters).some(value => value !== '')
      if (!hasFilters) {
        logsToExport = await fetchAllLogs()
      }

      if (logsToExport.length === 0) {
        toast.error('No logs to export')
        return
      }

      // Create CSV header
      const headers = ['Timestamp', 'Category', 'Action', 'Title', 'Description', 'User']
      const csvContent = [
        headers.join(','),
        ...logsToExport.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.category,
          log.action,
          log.title,
          log.description,
          log.details?.userName || log.createdBy || 'N/A'
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Logs exported successfully')
    } catch (error) {
      logger.error('Error exporting logs:', error)
      toast.error('Failed to export logs')
    } finally {
      setIsExporting(false)
    }
  }

  const formatActivityDescription = (log) => {
    switch (log.category) {
      case ACTIVITY_CATEGORIES.AUTH:
        const authMethod = log.details?.method || 'standard';
        const authStatus = log.details?.status || 'completed';
        if (authMethod === 'pin_code') {
          if (log.action === ACTIVITY_ACTIONS.SECURITY_ALERT) {
            return `Failed PIN code verification attempt`;
          }
          return `User successfully verified PIN code`;
        }
        return `User ${log.action === 'login' ? 'logged in' : 'logged out'} using ${authMethod} authentication (${authStatus})`;
      case ACTIVITY_CATEGORIES.ATTENDANCE:
        return `User ${log.action === 'clockIn' ? 'clocked in' : 'clocked out'}`;
      case ACTIVITY_CATEGORIES.NAVIGATION:
        if (log.action === 'pageView' && log.details) {
          return `Accessed ${log.details.pageName} in ${log.details.section}`;
        }
        return 'Navigated to a page';
      default:
        return log.description || 'Activity recorded';
    }
  };

  const formatActivityTitle = (log) => {
    switch (log.category) {
      case ACTIVITY_CATEGORIES.AUTH:
        const method = log.details?.method || '';
        if (method === 'pin_code') {
          if (log.action === ACTIVITY_ACTIONS.SECURITY_ALERT) {
            return 'PIN Code Verification Failed';
          }
          return 'PIN Code Verification';
        }
        return `${method === 'mfa' ? 'MFA' : ''} ${log.action === 'login' ? 'Login' : 'Logout'}`;
      case ACTIVITY_CATEGORIES.ATTENDANCE:
        return `Attendance Record`;
      case ACTIVITY_CATEGORIES.NAVIGATION:
        return `Page Navigation`;
      default:
        return log.title || 'Activity Log';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          <p className="text-yellow-400 font-mono">Loading activity logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-mono">
            Activity Log
          </h1>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className={`px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors font-mono text-sm flex items-center gap-2 ${
                isExporting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={loadActivityLogs}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-800/50 rounded-lg border border-yellow-500/20 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-yellow-400" />
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="bg-gray-700 text-gray-200 rounded-md px-3 py-2 font-mono text-sm border border-yellow-500/20 focus:outline-none focus:border-yellow-500/40"
              >
                <option value="">All Categories</option>
                <option value={ACTIVITY_CATEGORIES.AUTH}>Authentication</option>
                <option value={ACTIVITY_CATEGORIES.ATTENDANCE}>Attendance</option>
                <option value={ACTIVITY_CATEGORIES.NAVIGATION}>Navigation</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="bg-gray-700 text-gray-200 rounded-md px-3 py-2 font-mono text-sm border border-yellow-500/20 focus:outline-none focus:border-yellow-500/40"
              >
                <option value="">All Actions</option>
                <option value={ACTIVITY_ACTIONS.LOGIN}>Login</option>
                <option value={ACTIVITY_ACTIONS.LOGOUT}>Logout</option>
                <option value={ACTIVITY_ACTIONS.CLOCK_IN}>Clock In</option>
                <option value={ACTIVITY_ACTIONS.CLOCK_OUT}>Clock Out</option>
                <option value={ACTIVITY_ACTIONS.PAGE_VIEW}>Page View</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="bg-gray-700 text-gray-200 rounded-md px-3 py-2 font-mono text-sm border border-yellow-500/20 focus:outline-none focus:border-yellow-500/40"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="bg-gray-700 text-gray-200 rounded-md px-3 py-2 font-mono text-sm border border-yellow-500/20 focus:outline-none focus:border-yellow-500/40"
              />
            </div>

            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Activity Logs List */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
              <p className="text-gray-400 font-mono text-center">No activity logs found.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gray-800/50 rounded-lg border border-yellow-500/20 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getCategoryIcon(log.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-200">{formatActivityTitle(log)}</h3>
                            <p className="text-gray-300 mt-1">{formatActivityDescription(log)}</p>
                            
                            {/* Additional details for navigation activities */}
                            {log.category === ACTIVITY_CATEGORIES.NAVIGATION && log.details && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-400">
                                  <span className="font-semibold">Path:</span> {log.details.path}
                                </p>
                                <p className="text-sm text-gray-400">
                                  <span className="font-semibold">Section:</span> {log.details.section}
                                </p>
                                <p className="text-sm text-gray-400">
                                  <span className="font-semibold">User Role:</span> {log.details.role}
                                </p>
                              </div>
                            )}

                            {/* Additional details for authentication activities */}
                            {log.category === ACTIVITY_CATEGORIES.AUTH && log.details && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-400">
                                  <span className="font-semibold">Authentication Method:</span> {log.details.method === 'pin_code' ? 'PIN Code' : log.details.method || 'standard'}
                                </p>
                                <p className="text-sm text-gray-400">
                                  <span className="font-semibold">Status:</span> {log.details.status || 'completed'}
                                </p>
                                {log.details.error && (
                                  <p className="text-sm text-red-400">
                                    <span className="font-semibold">Error:</span> {log.details.error}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full">
                            {log.category}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                            {log.action}
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                            {log.details?.userEmail || log.createdBy}
                          </span>
                          {log.userId && (
                            <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full">
                              ID: {log.userId}
                            </span>
                          )}
                          {log.details?.method && (
                            <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full">
                              {log.details.method.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm ${
                    currentPage === 1
                      ? 'bg-gray-700/20 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-gray-400 font-mono">Page {currentPage}</span>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm ${
                    !hasMore
                      ? 'bg-gray-700/20 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 