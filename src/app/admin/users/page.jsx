"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, firedb } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getAllUsers, approveUser, declineUser, updateUserRole, USER_ROLES, disableUserAccount, enableUserAccount, deleteUserAccount } from '@/services/auth'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { logger } from '@/utils/logger'

// Role display names mapping
const roleDisplayNames = {
  'trainee': 'SOC Trainee',
  'analyst': 'SOC Analyst',
  'specialist': 'Security Specialist',
  'coo': 'Chief Operating Officer',
  'ciso': 'Chief Information Security Officer',
  'super_admin': 'Super Administrator'

}

// Role icons mapping
const roleIcons = {
  'super_admin': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  'specialist': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  'analyst': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  'coo': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'ciso': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8zM9 12h6m-6 4h6" />
    </svg>
  ),
  'trainee': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showDeclineConfirmModal, setShowDeclineConfirmModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disableReason, setDisableReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

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
          const userData = userDoc.data()
          if (userData.role !== USER_ROLES.SUPER_ADMIN) {
            router.push('/dashboard')
            return
          }
          setCurrentUserRole(userData.role)
          setLoading(false)
        }
      } catch (error) {
        logger.error('Error checking user role:', error)
        toast.error('Error checking user permissions')
        router.push('/dashboard')
      }
    }

    checkUserRole()
  }, [router])

  useEffect(() => {
    const fetchUsers = async () => {
      const { success, users: fetchedUsers, error } = await getAllUsers()
      if (success) {
        setUsers(fetchedUsers)
      } else {
        toast.error(error || 'Failed to fetch users')
      }
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const handleApprove = async (userId) => {
    setSelectedUser(users.find(user => user.id === userId))
    setShowApproveModal(true)
  }

  const confirmApprove = async () => {
    try {
      const { success, error } = await approveUser(selectedUser.id, auth.currentUser.email)
      if (success) {
        toast.success('User approved successfully')
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, status: 'approved' } : user
        ))
      } else {
        toast.error(error || 'Failed to approve user')
      }
    } catch (error) {
      toast.error('An error occurred while approving the user')
    } finally {
      setShowApproveModal(false)
      setSelectedUser(null)
    }
  }

  const handleDecline = async () => {
    if (!selectedUser || !declineReason.trim()) return
    setShowDeclineModal(false)
    setShowDeclineConfirmModal(true)
  }

  const confirmDecline = async () => {
    try {
      const { success, error } = await declineUser(
        selectedUser.id,
        auth.currentUser.email,
        declineReason
      )
      if (success) {
        toast.success('User declined successfully')
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, status: 'declined' } : user
        ))
      } else {
        toast.error(error || 'Failed to decline user')
      }
    } catch (error) {
      toast.error('An error occurred while declining the user')
    } finally {
      setShowDeclineConfirmModal(false)
      setDeclineReason('')
      setSelectedUser(null)
    }
  }

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) return
    setShowRoleModal(false)
    setShowConfirmationModal(true)
  }

  const confirmRoleUpdate = async () => {
    try {
      const { success, error } = await updateUserRole(
        selectedUser.id,
        newRole,
        auth.currentUser.email
      )
      if (success) {
        toast.success('User role updated successfully')
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, role: newRole } : user
        ))
      } else {
        toast.error(error || 'Failed to update user role')
      }
    } catch (error) {
      toast.error('An error occurred while updating the user role')
    } finally {
      setShowConfirmationModal(false)
      setNewRole('')
      setSelectedUser(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesRole && matchesSearch
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Email', 'Display Name', 'Role', 'Status', 'MFA Enabled', 'Disabled']
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.email,
        user.displayName || 'No name',
        roleDisplayNames[user.role] || user.role,
        user.status,
        user.mfaEnabled ? 'Yes' : 'No',
        user.disabled ? 'Yes' : 'No'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-yellow-500">User Management</h1>
              <p className="text-gray-400 mt-1">Manage and monitor user accounts across the platform</p>
            </div>
          </div>

          {/* Enhanced Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="relative group">
              <div className="absolute inset-0 bg-yellow-500/10 rounded-lg transform scale-0 group-hover:scale-100 transition-transform duration-200 pointer-events-none"></div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-300 
                         focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent
                         placeholder-gray-500 transition-all duration-200 relative z-10"
              />
              <svg className="absolute right-3 top-3 h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors duration-200 pointer-events-none" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-yellow-500/10 rounded-lg transform scale-0 group-hover:scale-100 transition-transform duration-200 pointer-events-none"></div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-300 
                         focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent
                         appearance-none cursor-pointer transition-all duration-200 relative z-10"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none z-10">
                <svg className="h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors duration-200" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-yellow-500/10 rounded-lg transform scale-0 group-hover:scale-100 transition-transform duration-200 pointer-events-none"></div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-300 
                         focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent
                         appearance-none cursor-pointer transition-all duration-200 relative z-10"
              >
                <option value="all">All Roles</option>
                {Object.entries(roleDisplayNames).map(([role, displayName]) => (
                  <option key={role} value={role}>{displayName}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none z-10">
                <svg className="h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors duration-200" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="group relative px-4 py-2.5 bg-green-500/20 text-green-300 rounded-lg 
                       hover:bg-green-500/30 border border-green-500/30 transition-all duration-200
                       flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform duration-200" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="font-medium">Export CSV</span>
            </button>
          </div>
        </div>
        
        {/* Enhanced Table Section */}
        <div className="bg-gray-800/50 rounded-xl shadow-lg overflow-hidden border border-gray-700/50 backdrop-blur-sm">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="min-w-full divide-y divide-gray-700/50">
              <thead className="bg-gray-800/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">MFA</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/50 divide-y divide-gray-700/50">
                <AnimatePresence>
                  {currentUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`group hover:bg-gray-700/30 transition-all duration-200 ${user.disabled ? 'opacity-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 h-10 w-10 transform group-hover:scale-110 transition-transform duration-200">
                            {user.photoURL ? (
                              <img
                                className="h-10 w-10 rounded-full ring-2 ring-gray-700 group-hover:ring-yellow-500/50 transition-all duration-200"
                                src={user.photoURL}
                                alt={user.displayName || 'User'}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center
                                            ring-2 ring-gray-700 group-hover:ring-yellow-500/50 transition-all duration-200">
                                <svg className="h-6 w-6 text-yellow-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-300 group-hover:text-yellow-500 transition-colors duration-200">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-400">{user.displayName || 'No name'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {roleIcons[user.role] && (
                            <span className="text-yellow-500/70 transform group-hover:scale-110 transition-transform duration-200">
                              {roleIcons[user.role]}
                            </span>
                          )}
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                         bg-yellow-500/20 text-yellow-300 group-hover:bg-yellow-500/30 
                                         transition-all duration-200">
                            {roleDisplayNames[user.role] || user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                       transition-all duration-200 ${
                          user.status === 'approved' ? 'bg-green-500/20 text-green-300 group-hover:bg-green-500/30' :
                          user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 group-hover:bg-yellow-500/30' :
                          'bg-red-500/20 text-red-300 group-hover:bg-red-500/30'
                        }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                       transition-all duration-200 ${
                          user.mfaEnabled ? 'bg-green-500/20 text-green-300 group-hover:bg-green-500/30' : 
                                          'bg-red-500/20 text-red-300 group-hover:bg-red-500/30'
                        }`}>
                          {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="group relative w-10 h-10 bg-green-500/20 text-green-300 rounded-lg 
                                         hover:bg-green-500/30 border border-green-500/30 transition-all duration-200 
                                         flex items-center justify-center transform hover:scale-110"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                              opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                              transform translate-y-2 group-hover:translate-y-0">
                                  Approve user registration
                                </div>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowDeclineModal(true)
                                }}
                                className="group relative w-10 h-10 bg-red-500/20 text-red-300 rounded-lg 
                                         hover:bg-red-500/30 border border-red-500/30 transition-all duration-200 
                                         flex items-center justify-center transform hover:scale-110"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                              opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                              transform translate-y-2 group-hover:translate-y-0">
                                  Decline user registration
                                </div>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setNewRole(user.role)
                              setShowRoleModal(true)
                            }}
                            className="group relative w-10 h-10 bg-yellow-500/20 text-yellow-300 rounded-lg 
                                     hover:bg-yellow-500/30 border border-yellow-500/30 transition-all duration-200 
                                     flex items-center justify-center transform hover:scale-110"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            {/*<div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                          opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                          transform translate-y-2 group-hover:translate-y-0">
                              Change user's role
                            </div>*/}
                          </button>
                          {!user.disabled ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowDisableModal(true)
                              }}
                              className="group relative w-10 h-10 bg-orange-500/20 text-orange-300 rounded-lg 
                                       hover:bg-orange-500/30 border border-orange-500/30 transition-all duration-200 
                                       flex items-center justify-center transform hover:scale-110"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              {/*<div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                            opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                            transform translate-y-2 group-hover:translate-y-0">
                                Temporarily disable user account
                              </div>*/}
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to enable ${user.email}'s account?`)) {
                                  const { success, error } = await enableUserAccount(user.id, auth.currentUser.email)
                                  if (success) {
                                    toast.success('Account enabled successfully')
                                    setUsers(users.map(u => 
                                      u.id === user.id ? { ...u, disabled: false } : u
                                    ))
                                  } else {
                                    toast.error(error || 'Failed to enable account')
                                  }
                                }
                              }}
                              className="group relative w-10 h-10 bg-green-500/20 text-green-300 rounded-lg 
                                       hover:bg-green-500/30 border border-green-500/30 transition-all duration-200 
                                       flex items-center justify-center transform hover:scale-110"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                            opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                            transform translate-y-2 group-hover:translate-y-0">
                                Re-enable user account
                              </div>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setDeleteConfirmText('')
                              setShowDeleteModal(true)
                            }}
                            className="group relative w-10 h-10 bg-red-500/20 text-red-300 rounded-lg 
                                     hover:bg-red-500/30 border border-red-500/30 transition-all duration-200 
                                     flex items-center justify-center transform hover:scale-110"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {/*<div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                                          opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                                          transform translate-y-2 group-hover:translate-y-0">
                              Permanently delete user account
                            </div>*/}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Pagination Controls */}
        <div className="mt-6 flex items-center justify-between bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
          <div className="text-gray-400 text-sm">
            Showing <span className="text-yellow-500 font-medium">{indexOfFirstUser + 1}</span> to{' '}
            <span className="text-yellow-500 font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
            <span className="text-yellow-500 font-medium">{filteredUsers.length}</span> users
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="group relative w-10 h-10 bg-gray-700/50 text-gray-300 rounded-lg 
                       hover:bg-gray-600/50 border border-gray-600/50 transition-all duration-200 
                       flex items-center justify-center transform hover:scale-110 disabled:opacity-50 
                       disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-0.5 transition-transform duration-200" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                            opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                            transform translate-y-2 group-hover:translate-y-0">
                Previous Page
              </div>
            </button>
            <div className="text-gray-300 text-sm font-medium">
              Page <span className="text-yellow-500">{currentPage}</span> of <span className="text-yellow-500">{totalPages}</span>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="group relative w-10 h-10 bg-gray-700/50 text-gray-300 rounded-lg 
                       hover:bg-gray-600/50 border border-gray-600/50 transition-all duration-200 
                       flex items-center justify-center transform hover:scale-110 disabled:opacity-50 
                       disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform duration-200" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="absolute left-0 -bottom-8 bg-gray-800 text-gray-300 text-sm py-1 px-2 rounded 
                            opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap
                            transform translate-y-2 group-hover:translate-y-0">
                Next Page
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      <AnimatePresence>
        {showDeclineModal && (
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
                <h2 className="text-xl font-bold text-red-400">Decline User</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User Details:</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {selectedUser?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                          <svg className="h-6 w-6 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-red-300">{selectedUser?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser?.displayName || 'No name'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Role:</p>
                  <div className="flex items-center space-x-2">
                    {roleIcons[selectedUser?.role] && (
                      <span className="text-red-500/70">
                        {roleIcons[selectedUser?.role]}
                      </span>
                    )}
                    <span className="text-red-300">
                      {roleDisplayNames[selectedUser?.role] || selectedUser?.role}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Please provide a reason for declining:</p>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Enter reason for declining..."
                    className="w-full px-3 py-2 bg-gray-700 border border-red-500/30 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    rows="4"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!declineReason.trim()}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve Confirmation Modal */}
      <AnimatePresence>
        {showApproveModal && (
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
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-green-500/30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-green-400">Confirm User Approval</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User Details:</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {selectedUser?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg className="h-6 w-6 text-green-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-green-300">{selectedUser?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser?.displayName || 'No name'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Role:</p>
                  <div className="flex items-center space-x-2">
                    {roleIcons[selectedUser?.role] && (
                      <span className="text-green-500/70">
                        {roleIcons[selectedUser?.role]}
                      </span>
                    )}
                    <span className="text-green-300">
                      {roleDisplayNames[selectedUser?.role] || selectedUser?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-md hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-colors duration-200"
                >
                  Confirm Approval
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline Confirmation Modal */}
      <AnimatePresence>
        {showDeclineConfirmModal && (
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
                <h2 className="text-xl font-bold text-red-400">Confirm User Decline</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User Details:</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {selectedUser?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                          <svg className="h-6 w-6 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-red-300">{selectedUser?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser?.displayName || 'No name'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Role:</p>
                  <div className="flex items-center space-x-2">
                    {roleIcons[selectedUser?.role] && (
                      <span className="text-red-500/70">
                        {roleIcons[selectedUser?.role]}
                      </span>
                    )}
                    <span className="text-red-300">
                      {roleDisplayNames[selectedUser?.role] || selectedUser?.role}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Decline Reason:</p>
                  <p className="text-red-300">{declineReason}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeclineConfirmModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDecline}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors duration-200"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Update Modal */}
      <AnimatePresence>
        {showRoleModal && (
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
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-yellow-500/30"
            >
              <h2 className="text-xl font-bold text-yellow-400 mb-4">Update User Role</h2>
              <p className="text-gray-300 mb-4">
                Update role for {selectedUser?.email}
              </p>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-yellow-500/30 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 mb-4"
              >
                {Object.entries(roleDisplayNames).map(([role, displayName]) => (
                  <option key={role} value={role}>
                    {displayName}
                  </option>
                ))}
              </select>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleUpdate}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-md hover:bg-yellow-500/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmationModal && (
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
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-yellow-500/30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-yellow-400">Confirm Role Update</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Current Role:</p>
                  <div className="flex items-center space-x-2">
                    {roleIcons[selectedUser?.role] && (
                      <span className="text-yellow-500/70">
                        {roleIcons[selectedUser?.role]}
                      </span>
                    )}
                    <span className="text-yellow-300">
                      {roleDisplayNames[selectedUser?.role] || selectedUser?.role}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">New Role:</p>
                  <div className="flex items-center space-x-2">
                    {roleIcons[newRole] && (
                      <span className="text-yellow-500/70">
                        {roleIcons[newRole]}
                      </span>
                    )}
                    <span className="text-yellow-300">
                      {roleDisplayNames[newRole] || newRole}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User:</p>
                  <p className="text-yellow-300">{selectedUser?.email}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleUpdate}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-md hover:bg-yellow-500/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-colors duration-200"
                >
                  Confirm Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disable Account Modal */}
      <AnimatePresence>
        {showDisableModal && (
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
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-orange-500/30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-full">
                  <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-orange-400">Disable User Account</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User Details:</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {selectedUser?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <svg className="h-6 w-6 text-orange-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-orange-300">{selectedUser?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser?.displayName || 'No name'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">Please provide a reason for disabling:</p>
                  <textarea
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    placeholder="Enter reason for disabling..."
                    className="w-full px-3 py-2 bg-gray-700 border border-orange-500/30 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    rows="4"
                  />
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    This action will temporarily prevent the user from accessing their account. They will not be able to log in until the account is re-enabled.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDisableModal(false)
                    setDisableReason('')
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!disableReason.trim()) {
                      toast.error('Please provide a reason for disabling the account')
                      return
                    }
                    const { success, error } = await disableUserAccount(selectedUser.id, auth.currentUser.email)
                    if (success) {
                      toast.success('Account disabled successfully')
                      setUsers(users.map(u => 
                        u.id === selectedUser.id ? { ...u, disabled: true } : u
                      ))
                      setShowDisableModal(false)
                      setDisableReason('')
                    } else {
                      toast.error(error || 'Failed to disable account')
                    }
                  }}
                  disabled={!disableReason.trim()}
                  className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-md hover:bg-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Disable Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-400">Delete User Account</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-2">User Details:</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {selectedUser?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                          <svg className="h-6 w-6 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-red-300">{selectedUser?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser?.displayName || 'No name'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm mb-4">
                    This action will permanently delete the user account and all associated data. This action cannot be undone.
                  </p>
                  <p className="text-gray-300 text-sm mb-2">
                    To confirm, please type <span className="text-red-400 font-mono">DELETE</span> below:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-3 py-2 bg-gray-700 border border-red-500/30 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { success, error } = await deleteUserAccount(selectedUser.id, auth.currentUser.email)
                    if (success) {
                      toast.success('Account deleted successfully')
                      setUsers(users.filter(u => u.id !== selectedUser.id))
                      setShowDeleteModal(false)
                      setDeleteConfirmText('')
                    } else {
                      toast.error(error || 'Failed to delete account')
                    }
                  }}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 