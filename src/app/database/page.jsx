'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { auth } from '@/services/firebase'
import { 
    addDatabaseEntry, 
    getDatabaseEntries, 
    updateDatabaseEntry, 
    deleteDatabaseEntry,
    listenToDatabaseEntries 
} from '@/services/management'
import { getDoc, doc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'
import { logger } from '@/utils/logger'

// Add Entry Modal Component
const AddEntryModal = ({ show, onClose, category, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 'medium',
        status: 'active'
    })

    const getFieldsByCategory = () => {
        switch(category) {
            case 'threats':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">Type</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.type || ''}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Malware">Malware</option>
                                    <option value="Ransomware">Ransomware</option>
                                    <option value="APT">APT</option>
                                    <option value="Phishing">Phishing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">Status</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.status || 'active'}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="mitigated">Mitigated</option>
                                    <option value="monitoring">Monitoring</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-yellow-400 mb-2">Indicators (IPs, Domains, Hashes)</label>
                            <textarea 
                                className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                placeholder="One per line"
                                rows="3"
                                value={formData.indicators || ''}
                                onChange={(e) => setFormData({...formData, indicators: e.target.value})}
                            />
                        </div>
                    </>
                )
            case 'vulnerabilities':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">CVE ID</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    placeholder="CVE-YYYY-XXXXX"
                                    value={formData.cveId || ''}
                                    onChange={(e) => setFormData({...formData, cveId: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">CVSS Score</label>
                                <input 
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.cvssScore || ''}
                                    onChange={(e) => setFormData({...formData, cvssScore: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-yellow-400 mb-2">Affected Systems</label>
                            <textarea 
                                className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                placeholder="List affected systems/software"
                                rows="2"
                                value={formData.affectedSystems || ''}
                                onChange={(e) => setFormData({...formData, affectedSystems: e.target.value})}
                            />
                        </div>
                    </>
                )
            case 'incidents':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">Type</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.type || ''}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Security Breach">Security Breach</option>
                                    <option value="Data Leak">Data Leak</option>
                                    <option value="System Outage">System Outage</option>
                                    <option value="Unauthorized Access">Unauthorized Access</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">Status</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="open">Open</option>
                                    <option value="investigating">Investigating</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-yellow-400 mb-2">Affected Assets</label>
                            <textarea 
                                className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                placeholder="List affected assets"
                                rows="2"
                                value={formData.affectedAssets || ''}
                                onChange={(e) => setFormData({...formData, affectedAssets: e.target.value})}
                            />
                        </div>
                    </>
                )
            case 'assets':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">Type</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.type || ''}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Server">Server</option>
                                    <option value="Workstation">Workstation</option>
                                    <option value="Network Device">Network Device</option>
                                    <option value="Mobile Device">Mobile Device</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">Status</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">IP Address</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    placeholder="xxx.xxx.xxx.xxx"
                                    value={formData.ip || ''}
                                    onChange={(e) => setFormData({...formData, ip: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">MAC Address</label>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    placeholder="XX:XX:XX:XX:XX:XX"
                                    value={formData.mac || ''}
                                    onChange={(e) => setFormData({...formData, mac: e.target.value})}
                                />
                            </div>
                        </div>
                    </>
                )
            case 'policies':
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-yellow-400 mb-2">Type</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.type || ''}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Security Policy">Security Policy</option>
                                    <option value="Procedure">Procedure</option>
                                    <option value="Standard">Standard</option>
                                    <option value="Guideline">Guideline</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-yellow-400 mb-2">Status</label>
                                <select 
                                    className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="review">Under Review</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-yellow-400 mb-2">Version</label>
                            <input 
                                type="text"
                                className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                                placeholder="1.0.0"
                                value={formData.version || ''}
                                onChange={(e) => setFormData({...formData, version: e.target.value})}
                            />
                        </div>
                    </>
                )
            default:
                return null
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
        setFormData({
            name: '',
            description: '',
            priority: 'medium',
            status: 'active'
        })
    }

    if (!show) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#0B1120] rounded-lg p-6 max-w-2xl w-full mx-4">
                <h2 className="text-xl font-bold text-yellow-400 mb-4">Add New Entry</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-yellow-400 mb-2">Name</label>
                        <input 
                            type="text"
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-yellow-400 mb-2">Description</label>
                        <textarea 
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            required
                            rows="3"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-yellow-400 mb-2">Priority</label>
                        <select 
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2"
                            value={formData.priority}
                            onChange={(e) => setFormData({...formData, priority: e.target.value})}
                            required
                        >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    {getFieldsByCategory()}

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg font-mono hover:bg-gray-500/30 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors"
                        >
                            Add Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function Database() {
    const router = useRouter()
    const [selectedCategory, setSelectedCategory] = useState('threats')
    const [isLoading, setIsLoading] = useState(true)
    const [entries, setEntries] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('date')
    const [filterBy, setFilterBy] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [newEntry, setNewEntry] = useState({})
    const [user, setUser] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const toastShown = useRef(false)

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push('/auth/signin')
                return
            }
            setUser(user)
            
            // Get user role from Firestore
            try {
                const userDoc = await getDoc(doc(firedb, 'users', user.uid))
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role)
                }
                setIsLoading(false)
            } catch (error) {
                logger.error('Error getting user role:', error)
                setIsLoading(false)
            }
        })

        return () => unsubscribe()
    }, [router])

    // Check access and show loading state
    useEffect(() => {
        if (userRole && !['specialist', 'coo', 'ciso', 'super_admin'].includes(userRole) && !toastShown.current) {
            toastShown.current = true
            toast.error(
                <div className="flex flex-col gap-2">
                    <span className="font-mono">Access Denied</span>
                    <span className="text-sm opacity-80">Only Security Specialists, COO, CISO, and Super Admin can access the database.</span>
                </div>,
                { duration: 4000 }
            )
            router.push('/dashboard')
        }
    }, [userRole, router])

    // Listen to database entries
    useEffect(() => {
        if (!selectedCategory || !['specialist', 'coo', 'ciso', 'super_admin'].includes(userRole)) return

        const unsubscribe = listenToDatabaseEntries(
            selectedCategory,
            { searchTerm },
            (data) => setEntries(data)
        )

        return () => unsubscribe()
    }, [selectedCategory, searchTerm, userRole])

    const handleAddEntry = async (e) => {
        e.preventDefault()
        try {
            const result = await addDatabaseEntry(selectedCategory, {
                ...newEntry,
                searchableText: Object.values(newEntry).join(' ').toLowerCase()
            })
            
            if (result.success) {
                toast.success('Entry added successfully')
                setShowAddModal(false)
                setNewEntry({})
            } else {
                toast.error(result.error || 'Failed to add entry')
            }
        } catch (error) {
            toast.error('An error occurred while adding the entry')
        }
    }

    const handleUpdateEntry = async (id, updateData) => {
        try {
            const result = await updateDatabaseEntry(selectedCategory, id, {
                ...updateData,
                searchableText: Object.values(updateData).join(' ').toLowerCase()
            })
            
            if (result.success) {
                toast.success('Entry updated successfully')
            } else {
                toast.error(result.error || 'Failed to update entry')
            }
        } catch (error) {
            toast.error('An error occurred while updating the entry')
        }
    }

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return
        
        try {
            const result = await deleteDatabaseEntry(selectedCategory, id)
            if (result.success) {
                toast.success('Entry deleted successfully')
            } else {
                toast.error(result.error || 'Failed to delete entry')
            }
        } catch (error) {
            toast.error('An error occurred while deleting the entry')
        }
    }

    const categories = [
        {
            id: 'threats',
            name: 'Threat Intelligence',
            description: 'Known malicious IPs, domains, and threat actors',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        {
            id: 'vulnerabilities',
            name: 'Vulnerability Database',
            description: 'CVE records and security advisories',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            id: 'incidents',
            name: 'Incident History',
            description: 'Historical security incidents and responses',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'assets',
            name: 'Asset Inventory',
            description: 'Network devices, servers, and endpoints',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            )
        },
        {
            id: 'policies',
            name: 'Security Policies',
            description: 'Security policies and procedures documentation',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }
    ]

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-yellow-400 font-mono">Loading database...</p>
                </div>
            </div>
        )
    }

    // If user doesn't have access, show a friendly message
    if (!userRole || !['specialist', 'coo', 'ciso', 'super_admin'].includes(userRole)) {
        return (
            <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-4">
                        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-xl font-bold text-red-400 mb-2 font-mono">Access Restricted</h2>
                        <p className="text-gray-400 mb-4">You don't have permission to access the security database.</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-yellow-400 font-mono">Security Database</h1>
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1">
                        <span className="text-yellow-400 font-mono text-sm">Welcome, {user?.email}</span>
                        <span className="text-yellow-500/70 text-xs font-mono capitalize">({userRole})</span>
                    </div>
                </div>
                
                {/* Category Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`p-4 rounded-lg border transition-all duration-300 ${
                                selectedCategory === category.id
                                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400 shadow-lg shadow-yellow-500/10'
                                    : 'bg-gray-800/50 border-yellow-500/20 text-gray-400 hover:bg-gray-800 hover:border-yellow-500/30'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`${
                                    selectedCategory === category.id ? 'text-yellow-400' : 'text-gray-400'
                                }`}>
                                    {category.icon}
                                </div>
                                <div className="text-left">
                                    <h3 className="font-mono text-lg">{category.name}</h3>
                                    <p className="text-sm opacity-80">{category.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Database Content */}
                <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-yellow-400 font-mono">
                            {categories.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add New Entry
                            </button>
                            <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-mono hover:bg-blue-500/30 transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export Data
                            </button>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search database..."
                                className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono w-full pl-10"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select 
                            value={filterBy}
                            onChange={(e) => setFilterBy(e.target.value)}
                            className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                        >
                            <option value="">Filter by Category</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                        >
                            <option value="date">Date Added</option>
                            <option value="priority">Priority</option>
                            <option value="name">Name</option>
                        </select>
                    </div>

                    {/* Entries Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-300">
                            <thead className="text-yellow-400 font-mono uppercase bg-yellow-500/10">
                                <tr>
                                    <th className="px-4 py-2">Name/ID</th>
                                    <th className="px-4 py-2">Description</th>
                                    <th className="px-4 py-2">Priority</th>
                                    <th className="px-4 py-2">Added By</th>
                                    <th className="px-4 py-2">Date Added</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="border-b border-yellow-500/10">
                                        <td className="px-4 py-2 font-mono">{entry.name}</td>
                                        <td className="px-4 py-2">{entry.description}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                entry.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                                entry.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                            }`}>
                                                {entry.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-sm">{entry.addedBy}</td>
                                        <td className="px-4 py-2 font-mono text-sm">
                                            {new Date(entry.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Add Entry Modal */}
            <AddEntryModal 
                show={showAddModal}
                onClose={() => setShowAddModal(false)}
                category={selectedCategory}
                onSubmit={handleAddEntry}
            />
        </div>
    )
} 