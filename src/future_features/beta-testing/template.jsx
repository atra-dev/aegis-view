'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { collection, addDoc } from 'firebase/firestore'
import { firedb } from '@/services/firebase'

export default function BetaTestingTemplate({ user, userData }) {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState({
    testId: `TEST-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    testerName: user?.displayName || '',
    testerRole: userData?.role || '',
    testerEmail: user?.email || '',
    platformVersion: '1.0.0',
    browser: navigator.userAgent,
    device: '',
    operatingSystem: navigator.platform,
    findings: [],
    performanceMetrics: {
      pageLoadTime: '',
      responseTime: '',
      resourceUsage: '',
      stability: ''
    },
    usabilityScore: 0,
    functionalityScore: 0,
    securityScore: 0,
    overallScore: 0,
    criticalIssues: [],
    majorIssues: [],
    minorIssues: [],
    suggestions: [],
    status: 'in_progress'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const docRef = await addDoc(collection(firedb, 'betaFindings'), {
        ...testResults,
        submittedAt: new Date().toISOString(),
        status: 'pending_review'
      })
      toast.success('Beta testing results submitted successfully')
      setTestResults(prev => ({
        ...prev,
        findings: []
      }))
    } catch (error) {
      console.error('Error submitting results:', error)
      toast.error('Failed to submit results')
    } finally {
      setLoading(false)
    }
  }

  const addFinding = () => {
    setTestResults(prev => ({
      ...prev,
      findings: [
        ...prev.findings,
        {
          id: Date.now(),
          title: '',
          description: '',
          category: 'bug',
          severity: 'low',
          stepsToReproduce: '',
          expectedResult: '',
          actualResult: '',
          attachments: [],
          status: 'open'
        }
      ]
    }))
  }

  const updateFinding = (id, field, value) => {
    setTestResults(prev => ({
      ...prev,
      findings: prev.findings.map(finding => 
        finding.id === id ? { ...finding, [field]: value } : finding
      )
    }))
  }

  const removeFinding = (id) => {
    setTestResults(prev => ({
      ...prev,
      findings: prev.findings.filter(finding => finding.id !== id)
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 font-mono mb-6">Beta Testing Form</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
            <h2 className="text-xl font-bold text-gray-300 font-mono mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Test ID</label>
                <input
                  type="text"
                  value={testResults.testId}
                  readOnly
                  className="w-full bg-gray-800/50 text-gray-400 border border-yellow-500/20 rounded-lg p-2 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Date</label>
                <input
                  type="date"
                  value={testResults.date}
                  onChange={(e) => setTestResults(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Platform Version</label>
                <input
                  type="text"
                  value={testResults.platformVersion}
                  readOnly
                  className="w-full bg-gray-800/50 text-gray-400 border border-yellow-500/20 rounded-lg p-2 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Browser</label>
                <input
                  type="text"
                  value={testResults.browser}
                  readOnly
                  className="w-full bg-gray-800/50 text-gray-400 border border-yellow-500/20 rounded-lg p-2 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
            <h2 className="text-xl font-bold text-gray-300 font-mono mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Page Load Time (seconds)</label>
                <input
                  type="number"
                  value={testResults.performanceMetrics.pageLoadTime}
                  onChange={(e) => setTestResults(prev => ({
                    ...prev,
                    performanceMetrics: { ...prev.performanceMetrics, pageLoadTime: e.target.value }
                  }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  step="0.1"
                  placeholder="Enter page load time"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Response Time (seconds)</label>
                <input
                  type="number"
                  value={testResults.performanceMetrics.responseTime}
                  onChange={(e) => setTestResults(prev => ({
                    ...prev,
                    performanceMetrics: { ...prev.performanceMetrics, responseTime: e.target.value }
                  }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  step="0.1"
                  placeholder="Enter response time"
                />
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-300 font-mono">Findings</h2>
              <button
                type="button"
                onClick={addFinding}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Finding</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {testResults.findings.map((finding, index) => (
                <div key={finding.id} className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-300 font-mono">Finding #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeFinding(finding.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Title</label>
                      <input
                        type="text"
                        value={finding.title}
                        onChange={(e) => updateFinding(finding.id, 'title', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                        placeholder="Enter a descriptive title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Category</label>
                      <select
                        value={finding.category}
                        onChange={(e) => updateFinding(finding.id, 'category', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      >
                        <option value="bug">Bug</option>
                        <option value="feature">Feature</option>
                        <option value="enhancement">Enhancement</option>
                        <option value="security">Security</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Severity</label>
                      <select
                        value={finding.severity}
                        onChange={(e) => updateFinding(finding.id, 'severity', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Description</label>
                      <textarea
                        value={finding.description}
                        onChange={(e) => updateFinding(finding.id, 'description', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono h-24"
                        placeholder="Describe the issue or suggestion in detail"
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Steps to Reproduce</label>
                      <textarea
                        value={finding.stepsToReproduce}
                        onChange={(e) => updateFinding(finding.id, 'stepsToReproduce', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono h-24"
                        placeholder="Step by step instructions to reproduce the issue"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Expected Result</label>
                      <textarea
                        value={finding.expectedResult}
                        onChange={(e) => updateFinding(finding.id, 'expectedResult', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono h-24"
                        placeholder="What should happen?"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-gray-400 font-mono text-sm">Actual Result</label>
                      <textarea
                        value={finding.actualResult}
                        onChange={(e) => updateFinding(finding.id, 'actualResult', e.target.value)}
                        className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono h-24"
                        placeholder="What actually happens?"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring */}
          <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
            <h2 className="text-xl font-bold text-gray-300 font-mono mb-4">Scoring</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Usability Score (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testResults.usabilityScore}
                  onChange={(e) => setTestResults(prev => ({ ...prev, usabilityScore: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Functionality Score (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testResults.functionalityScore}
                  onChange={(e) => setTestResults(prev => ({ ...prev, functionalityScore: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Security Score (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testResults.securityScore}
                  onChange={(e) => setTestResults(prev => ({ ...prev, securityScore: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Overall Score (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testResults.overallScore}
                  onChange={(e) => setTestResults(prev => ({ ...prev, overallScore: parseInt(e.target.value) }))}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Submit Results</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 