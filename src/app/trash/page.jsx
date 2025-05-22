'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/services/firebase'
import { toast } from 'react-hot-toast'
import { 
    listenToTrashItems, 
    restoreFromTrash, 
    emptyTrash 
} from '@/services/management'
import { doc, deleteDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'

export default function Trash() {
    const router = useRouter()
    const { user, userRole } = useAuth()
    const [selectedItems, setSelectedItems] = useState([])
    const [filterType, setFilterType] = useState('all')
    const [sortBy, setSortBy] = useState('date')
    const [trashItems, setTrashItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20
    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/auth/signin')
                return
            }

            const unsubscribeTrash = listenToTrashItems((items) => {
                // Filter items based on user role
                let filteredItems = items
                if (['soc_analyst', 'trainee'].includes(userRole)) {
                    // SOC Analysts and Trainees can only see their own trash
                    filteredItems = items.filter(item => item.deletedBy === user.email)
                }
                // Super Admin, COO, CISO, and Specialists can see all trash
                setTrashItems(filteredItems)
                setIsLoading(false)
            })

            return () => unsubscribeTrash()
        })

        return () => unsubscribe()
    }, [router, userRole])

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(currentPageItems.map(item => item.id))
        } else {
            setSelectedItems([])
        }
    }

    const handleSelectItem = (id) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(item => item !== id))
        } else {
            setSelectedItems([...selectedItems, id])
        }
    }

    const handleRestore = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please select items to restore')
            return
        }
        setShowRestoreModal(true)
    }

    const handleDelete = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please select items to delete')
            return
        }
        setShowDeleteModal(true)
    }

    const confirmRestore = async () => {
        const loadingToast = toast.loading('Restoring items...')
        const results = []

        try {
            for (const itemId of selectedItems) {
                try {
                    const trashItem = trashItems.find(item => item.id === itemId)
                    if (!trashItem) {
                        logger.error(`Trash item ${itemId} not found in local state`)
                        results.push({ 
                            id: itemId, 
                            success: false, 
                            error: 'Item not found in trash',
                            details: {
                                name: 'Unknown Item',
                                type: 'unknown',
                                originalId: 'unknown'
                            }
                        })
                        continue
                    }

                    logger.info('Attempting to restore trash item:', {
                        trashDocumentId: trashItem.id,
                        originalId: trashItem.originalId,
                        itemData: trashItem
                    })

                    // Use the trash document ID (trashItem.id) for restoration
                    const result = await restoreFromTrash(trashItem.id)
                    logger.info(`Restore attempt for "${trashItem.name || trashItem.alertName}" (trash doc: ${trashItem.id}, original id: ${trashItem.originalId}):`, result)

                    if (result.success) {
                        // Remove from local state only after successful restore
                        setTrashItems(prevItems => prevItems.filter(item => item.id !== trashItem.id))
                        results.push({ 
                            id: trashItem.id, 
                            success: true, 
                            restoredId: result.restoredId,
                            collection: result.collection,
                            details: {
                                name: trashItem.name || trashItem.alertName || 'Unnamed Item',
                                type: trashItem.type,
                                originalId: trashItem.originalId
                            }
                        })
                    } else {
                        // Handle specific error cases
                        if (result.error.includes('already exists')) {
                            // Item exists in original location, remove from trash
                            setTrashItems(prevItems => prevItems.filter(item => item.id !== trashItem.id))
                        }
                        
                        results.push({ 
                            id: trashItem.id, 
                            success: false, 
                            error: result.error,
                            details: {
                                name: trashItem.name || trashItem.alertName || 'Unnamed Item',
                                type: trashItem.type,
                                originalId: trashItem.originalId
                            }
                        })
                    }
                } catch (error) {
                    logger.error(`Error processing trash item ${itemId}:`, error)
                    const trashItem = trashItems.find(item => item.id === itemId)
                    results.push({ 
                        id: itemId, 
                        success: false, 
                        error: 'Unexpected error during restoration',
                        details: {
                            name: trashItem?.name || trashItem?.alertName || 'Unknown Item',
                            type: trashItem?.type || 'unknown',
                            originalId: trashItem?.originalId
                        }
                    })
                }
            }

            // Dismiss loading toast
            toast.dismiss(loadingToast)

            // Show results
            const successful = results.filter(r => r.success)
            const failed = results.filter(r => !r.success)

            if (successful.length > 0) {
                const successMessage = successful.length === 1
                    ? `Successfully restored "${successful[0].details.name}" (original id: ${successful[0].details.originalId})`
                    : `Successfully restored ${successful.length} items`
                toast.success(successMessage)
                
                // Clear only successfully restored items from selection
                const successfulIds = successful.map(r => r.id)
                setSelectedItems(prevSelected => 
                    prevSelected.filter(id => !successfulIds.includes(id))
                )
            }
            
            if (failed.length > 0) {
                logger.error('Failed items:', failed)
                
                // Group similar errors
                const errorGroups = failed.reduce((acc, item) => {
                    const key = `${item.error}|${item.details.type}`
                    if (!acc[key]) {
                        acc[key] = {
                            count: 0,
                            error: item.error,
                            type: item.details.type,
                            items: []
                        }
                    }
                    acc[key].count++
                    acc[key].items.push(`${item.details.name} (${item.details.originalId || 'unknown'})`)
                    return acc
                }, {})
                
                // Show each error type with more context
                Object.values(errorGroups).forEach(group => {
                    const itemType = group.type !== 'unknown' ? ` ${group.type}` : ''
                    const itemList = group.items.join('", "')
                    
                    if (group.count === 1) {
                        toast.error(`Failed to restore${itemType} "${itemList}": ${group.error}`)
                    } else {
                        toast.error(`Failed to restore ${group.count}${itemType}s: ${group.error}`)
                    }
                })
            }

        } catch (error) {
            logger.error('Error in restore operation:', error)
            toast.error('Failed to restore items. Please try again or contact support.')
        }
        setShowRestoreModal(false)
    }

    const confirmDelete = async () => {
        try {
            const promises = selectedItems.map(id => deleteDoc(doc(firedb, 'trash', id)))
            const results = await Promise.allSettled(promises)
            
            const successful = results.filter(r => r.status === 'fulfilled').length
            const failed = results.length - successful

            if (successful > 0) {
                toast.success(`Permanently deleted ${successful} items`)
            }
            if (failed > 0) {
                toast.error(`Failed to delete ${failed} items`)
            }

            setSelectedItems([])
            setShowDeleteModal(false)
        } catch (error) {
            logger.error('Error deleting items:', error)
            toast.error('Failed to delete items')
        }
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'alert':
                return (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                )
            case 'threats':
            case 'vulnerabilities':
            case 'incidents':
            case 'assets':
            case 'policies':
                return (
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )
            case 'blocked':
                return (
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                )
            case 'atip':
                return (
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )
            default:
                return null
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDaysRemaining = (expiresAt) => {
        const now = new Date()
        const expiry = new Date(expiresAt)
        const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
        return diff
    }

    // Filter items based on type
    const filteredItems = trashItems.filter(item => {
        if (filterType === 'all') return true
        return item.type === filterType
    })

    // Sort items
    const sortedItems = [...filteredItems].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.deletedAt) - new Date(a.deletedAt)
            case 'name':
                return a.name.localeCompare(b.name)
            case 'size':
                return b.size - a.size
            default:
                return 0
        }
    })

    // Calculate pagination
    const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentPageItems = sortedItems.slice(startIndex, endIndex)

    // Handle page changes
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage)
        setSelectedItems([]) // Clear selections when changing pages
    }

    const renderTrashItem = (item) => {
        const isSelected = selectedItems.includes(item.id)
        const daysRemaining = getDaysRemaining(item.expiresAt)
        const isExpired = daysRemaining <= 0

        return (
            <tr key={item.id} className={`border-b border-yellow-500/20 ${isExpired ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="form-checkbox h-4 w-4 text-yellow-400 rounded border-yellow-500/20 bg-gray-800"
                    />
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        <span className="text-gray-300 font-mono">{item.name || item.alertName || 'Unnamed Item'}</span>
                    </div>
                </td>
                <td className="px-4 py-3">
                    <span className="text-gray-400 font-mono">{item.type}</span>
                </td>
                <td className="px-4 py-3">
                    <span className="text-gray-400 font-mono">{formatDate(item.deletedAt)}</span>
                </td>
                <td className="px-4 py-3">
                    <span className={`font-mono ${
                        isExpired 
                            ? 'text-red-400' 
                            : daysRemaining <= 3 
                                ? 'text-yellow-400' 
                                : 'text-gray-400'
                    }`}>
                        {isExpired ? 'Expired' : `${daysRemaining} days`}
                    </span>
                </td>
                {['super_admin', 'coo', 'ciso', 'specialist'].includes(userRole) && (
                    <td className="px-4 py-3">
                        <span className="text-gray-400 font-mono">{item.deletedBy}</span>
                    </td>
                )}
                <td className="px-4 py-3">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                setSelectedItems([item.id])
                                handleRestore()
                            }}
                            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors"
                        >
                            Restore
                        </button>
                        <button
                            onClick={() => {
                                setSelectedItems([item.id])
                                handleDelete()
                            }}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-mono hover:bg-red-500/30 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        )
    }

    if (isLoading) {
        return (
            <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-yellow-400 font-mono">Loading trash...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-yellow-400 font-mono">Trash</h1>
                    <div className="flex space-x-4">
                        <button
                            onClick={handleRestore}
                            disabled={selectedItems.length === 0}
                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                        >
                            Restore Selected
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={selectedItems.length === 0}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-mono hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                            Delete Selected
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex space-x-4">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                            >
                                <option value="all">All Types</option>
                                <option value="alert">Alerts</option>
                                <option value="case">Cases</option>
                                <option value="report">Reports</option>
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                            >
                                <option value="date">Sort by Date</option>
                                <option value="name">Sort by Name</option>
                                <option value="type">Sort by Type</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-yellow-500/20">
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.length === currentPageItems.length}
                                            onChange={handleSelectAll}
                                            className="form-checkbox h-4 w-4 text-yellow-400 rounded border-yellow-500/20 bg-gray-800"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-gray-400 font-mono">Name</th>
                                    <th className="px-4 py-3 text-left text-gray-400 font-mono">Type</th>
                                    <th className="px-4 py-3 text-left text-gray-400 font-mono">Deleted At</th>
                                    <th className="px-4 py-3 text-left text-gray-400 font-mono">Expires In</th>
                                    {['super_admin', 'coo', 'ciso', 'specialist'].includes(userRole) && (
                                        <th className="px-4 py-3 text-left text-gray-400 font-mono">Deleted By</th>
                                    )}
                                    <th className="px-4 py-3 text-left text-gray-400 font-mono">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={['super_admin', 'coo', 'ciso', 'specialist'].includes(userRole) ? 7 : 6} className="px-4 py-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentPageItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={['super_admin', 'coo', 'ciso', 'specialist'].includes(userRole) ? 7 : 6} className="px-4 py-8 text-center text-gray-400 font-mono">
                                            No items in trash
                                        </td>
                                    </tr>
                                ) : (
                                    currentPageItems.map(renderTrashItem)
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-gray-400 font-mono">
                            Showing {startIndex + 1} to {Math.min(endIndex, sortedItems.length)} of {sortedItems.length} items
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-mono hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-mono hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Restore Confirmation Modal */}
            <AnimatePresence>
                {showRestoreModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
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
                                <h2 className="text-xl font-bold text-green-400">Confirm Restore</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm mb-2">You are about to restore {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} from trash.</p>
                                    <p className="text-gray-400 text-sm">This will move the selected items back to their original locations.</p>
                                </div>

                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm mb-2">Selected Items:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {currentPageItems
                                            .filter(item => selectedItems.includes(item.id))
                                            .map(item => (
                                                <div key={item.id} className="flex items-center space-x-2 text-sm">
                                                    {getTypeIcon(item.type)}
                                                    <span className="text-gray-300">{item.name}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowRestoreModal(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRestore}
                                    className="px-4 py-2 bg-green-500/20 text-green-300 rounded-md hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-colors duration-200"
                                >
                                    Confirm Restore
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
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
                                <h2 className="text-xl font-bold text-red-400">Confirm Permanent Deletion</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm mb-2">Warning: This action cannot be undone!</p>
                                    <p className="text-gray-400 text-sm">You are about to permanently delete {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} from trash.</p>
                                </div>

                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm mb-2">Items to be deleted:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {currentPageItems
                                            .filter(item => selectedItems.includes(item.id))
                                            .map(item => (
                                                <div key={item.id} className="flex items-center space-x-2 text-sm">
                                                    {getTypeIcon(item.type)}
                                                    <span className="text-gray-300">{item.name}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm">
                                        To confirm, please type <span className="text-red-400 font-mono">DELETE</span> below:
                                    </p>
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="Type DELETE to confirm"
                                        className="w-full mt-2 px-3 py-2 bg-gray-700 border border-red-500/30 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
                                    onClick={confirmDelete}
                                    disabled={deleteConfirmText !== 'DELETE'}
                                    className="px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
} 