'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'

export default function BetaFindingsAdmin() {
  const [findings, setFindings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchFindings()
  }, [])

  const fetchFindings = async () => {
    try {
      setLoading(true)
      setError(null)
      const q = query(collection(firedb, 'betaFindings'), orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)
      const findingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFindings(findingsData)
    } catch (error) {
      console.error('Error fetching findings:', error)
      setError('Failed to fetch findings')
      toast.error('Failed to fetch findings')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFinding = async (findingId) => {
    if (!window.confirm('Are you sure you want to delete this finding?')) return
    
    try {
      setLoading(true)
      setError(null)
      await deleteDoc(doc(firedb, 'betaFindings', findingId))
      setFindings(prev => prev.filter(f => f.id !== findingId))
      toast.success('Finding deleted successfully')
    } catch (error) {
      console.error('Error deleting finding:', error)
      setError('Failed to delete finding')
      toast.error('Failed to delete finding')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (findingId, newStatus) => {
    try {
      setLoading(true)
      setError(null)
      await updateDoc(doc(firedb, 'betaFindings', findingId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      setFindings(prev => prev.map(f => 
        f.id === findingId ? { ...f, status: newStatus } : f
      ))
      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      setError('Failed to update status')
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const openFindingDetails = (finding) => {
    setSelectedFinding(finding)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
        <div className="text-red-400 font-mono">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 font-mono mb-6">Beta Testing Findings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {findings.map((finding) => (
            <div key={finding.id} className="bg-gray-800/30 rounded-lg p-4 border border-yellow-500/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-300 font-mono">{finding.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {finding.severity}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      finding.status === 'pending_review' ? 'bg-blue-500/20 text-blue-400' :
                      finding.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {finding.status}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openFindingDetails(finding)}
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteFinding(finding.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-mono">{finding.description}</p>
                <div className="text-xs text-gray-500 font-mono">
                  <p>Submitted by: {finding.testerName}</p>
                  <p>Date: {new Date(finding.date).toLocaleDateString()}</p>
                  <p>Platform Version: {finding.platformVersion}</p>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <select
                  value={finding.status}
                  onChange={(e) => handleUpdateStatus(finding.id, e.target.value)}
                  className="bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 text-xs font-mono"
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for finding details */}
      {isModalOpen && selectedFinding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-yellow-400 font-mono">{selectedFinding.title}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-gray-300 font-mono mb-2">Description</h3>
                <p className="text-gray-400 font-mono">{selectedFinding.description}</p>
              </div>

              <div>
                <h3 className="text-gray-300 font-mono mb-2">Steps to Reproduce</h3>
                <p className="text-gray-400 font-mono whitespace-pre-line">{selectedFinding.stepsToReproduce}</p>
              </div>

              <div>
                <h3 className="text-gray-300 font-mono mb-2">Expected Result</h3>
                <p className="text-gray-400 font-mono">{selectedFinding.expectedResult}</p>
              </div>

              <div>
                <h3 className="text-gray-300 font-mono mb-2">Actual Result</h3>
                <p className="text-gray-400 font-mono">{selectedFinding.actualResult}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Category</h3>
                  <p className="text-gray-400 font-mono capitalize">{selectedFinding.category}</p>
                </div>
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Severity</h3>
                  <p className="text-gray-400 font-mono capitalize">{selectedFinding.severity}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Submitted By</h3>
                  <p className="text-gray-400 font-mono">{selectedFinding.testerName}</p>
                </div>
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Date</h3>
                  <p className="text-gray-400 font-mono">{new Date(selectedFinding.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Platform Version</h3>
                  <p className="text-gray-400 font-mono">{selectedFinding.platformVersion}</p>
                </div>
                <div>
                  <h3 className="text-gray-300 font-mono mb-2">Browser</h3>
                  <p className="text-gray-400 font-mono">{selectedFinding.browser}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 