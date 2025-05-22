'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { 
  storeApiKey, 
  getApiKeyUsage, 
  incrementApiKeyUsage, 
  listenToApiKeyUsage,
  getUserApiKeys
} from '@/services/management'
import { auth } from '@/services/firebase'
import { useRouter } from 'next/navigation'
import ApiKeyManager from '@/components/ApiKeyManager'

export default function VirusTotalChecker() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [inputType, setInputType] = useState('ip') // 'ip' or 'domain'
  const [file, setFile] = useState(null)
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStartTime, setScanStartTime] = useState(null)
  const [apiUsage, setApiUsage] = useState(0)
  const API_LIMIT = 500
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [hasScanned, setHasScanned] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const isCanceledRef = useRef(false)
  const [unsubscribeListener, setUnsubscribeListener] = useState(null)
  const MAX_LINES = 450
  const [isCooldown, setIsCooldown] = useState(false)
  const [cooldownTime, setCooldownTime] = useState(0)
  const lastScanTimeRef = useRef(0)
  const COOLDOWN_PERIOD = 5000 // 5 seconds cooldown between scans
  const DEBOUNCE_DELAY = 500 // 500ms debounce delay

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        router.push('/auth/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (apiUsage >= 490) {
      handleApiKeyRotation()
    }
  }, [apiUsage])

  const handleApiKeyRotation = async () => {
    if (!user) return

    try {
      const keys = await getUserApiKeys(user.uid)
      // First try to find a key with usage below 300
      let availableKey = keys.find(key => key.dailyUsage < 300)
      
      // If no key below 300 is found and current usage is over 300,
      // find any key with usage below 490 (including current key)
      if (!availableKey && apiUsage >= 300) {
        availableKey = keys.find(key => key.dailyUsage < 490)
      }
      
      if (availableKey) {
        setApiKey(availableKey.key)
        if (availableKey.dailyUsage < 300) {
          toast.success('Switched to a recommended API key with low usage')
        } else {
          toast.warning('Switched to an API key with moderate usage', {
            style: {
              background: '#1e293b',
              color: '#fbbf24',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              fontFamily: 'monospace',
            },
          })
        }
      } else {
        toast.error('No available API keys found. Please add a new one.')
      }
    } catch (error) {
      toast.error('Failed to rotate API key. Please try again.')
    }
  }

  useEffect(() => {
    const initializeApiKey = async () => {
      if (!user) return

      const savedApiKey = localStorage.getItem('vtApiKey')
      if (savedApiKey) {
        setApiKey(savedApiKey)
        // Initialize API key in Firebase if it doesn't exist
        await storeApiKey(savedApiKey, user.uid)
        
        // Clean up previous listener if it exists
        if (unsubscribeListener) {
          unsubscribeListener()
        }
        
        // Set up real-time listener for API usage
        const unsubscribe = listenToApiKeyUsage(savedApiKey, (usage) => {
          setApiUsage(usage)
        })
        setUnsubscribeListener(() => unsubscribe)

        // Cleanup listener on unmount
        return () => {
          if (unsubscribe) {
            unsubscribe()
          }
        }
      }
    }

    initializeApiKey()
  }, [user])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFile(file)
      setHasScanned(false)
      setResults([])
      setProgress({ current: 0, total: 0 })
    }
  }

  // Add debounce function
  const debounce = (func, delay) => {
    let timeoutId
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  // Add cooldown timer effect
  useEffect(() => {
    let timer
    if (isCooldown && cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            setIsCooldown(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isCooldown, cooldownTime])

  // Modify checkEntries to be debounced
  const debouncedCheckEntries = debounce(async () => {
    if (isScanning) {
      toast.error('Scan is already in progress. Please wait.', {
        style: {
          background: '#1e293b',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          fontFamily: 'monospace',
        },
      })
      return
    }

    const now = Date.now()
    if (now - lastScanTimeRef.current < COOLDOWN_PERIOD) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - (now - lastScanTimeRef.current)) / 1000)
      setIsCooldown(true)
      setCooldownTime(remainingTime)
      toast.error(`Please wait ${remainingTime} seconds before starting another scan.`, {
        style: {
          background: '#1e293b',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          fontFamily: 'monospace',
        },
        duration: 3000,
      })
      return
    }

    if (!apiKey || apiKey.trim() === '') {
      setShowApiKeyModal(true)
      return
    }

    if (!file) {
      toast.error('Please select a file', {
        style: {
          background: '#1e293b',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          fontFamily: 'monospace',
        },
      })
      return
    }

    // Check file size and line count
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target.result
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length > MAX_LINES) {
        toast.error(`File exceeds maximum line limit of ${MAX_LINES}. Please reduce the number of entries.`, {
          style: {
            background: '#1e293b',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            fontFamily: 'monospace',
          },
          duration: 5000,
        })
        return
      }

      const currentUsage = await getApiKeyUsage(apiKey)
      if (currentUsage >= API_LIMIT) {
        toast.error('API daily limit reached. Please try again tomorrow or use a different API key.', {
          style: {
            background: '#1e293b',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            fontFamily: 'monospace',
          },
          duration: 5000,
        })
        return
      }

      if (lines.length > (API_LIMIT - currentUsage)) {
        toast.error(`Not enough API calls remaining. You have ${API_LIMIT - currentUsage} calls left but need ${lines.length}`, {
          style: {
            background: '#1e293b',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            fontFamily: 'monospace',
          },
          duration: 5000,
        })
        return
      }

      setIsLoading(true)
      setIsScanning(true)
      setScanStartTime(Date.now())
      isCanceledRef.current = false

      setProgress({ current: 0, total: lines.length })
      const results = []

      for (const entry of lines) {
        if (isCanceledRef.current) {
          toast('Scanning canceled successfully.', {
            style: {
              background: '#1e293b',
              color: '#fbbf24',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              fontFamily: 'monospace',
            },
          })
          setProgress({ current: 0, total: 0 })
          setIsLoading(false)
          setIsScanning(false)
          return
        }

        const usage = await getApiKeyUsage(apiKey)
        if (usage >= API_LIMIT) {
          toast.error('API limit reached during scanning. Stopping...', {
            style: {
              background: '#1e293b',
              color: '#f87171',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              fontFamily: 'monospace',
            },
          })
          break
        }

        try {
          const response = await fetch(`/api/check-${inputType}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey,
              entry: entry.trim()
            })
          })

          const data = await response.json()

          if (data.malicious > 0) {
            results.push({
              entry: entry.trim(),
              malicious: data.malicious
            })
          }

          await incrementApiKeyUsage(apiKey)

        } catch (error) {
          // Skip error and continue with next entry
        }

        setProgress(prev => ({
          ...prev,
          current: prev.current + 1
        }))
      }

      setResults(results)
      setHasScanned(true)
      setIsLoading(false)
      setIsScanning(false)
      lastScanTimeRef.current = Date.now()
      setIsCooldown(true)
      setCooldownTime(Math.ceil(COOLDOWN_PERIOD / 1000))
    }

    reader.readAsText(file)
  }, DEBOUNCE_DELAY)

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!', {
        style: {
          background: '#1e293b',
          color: '#22d3ee',
          border: '1px solid rgba(34, 211, 238, 0.2)',
          fontFamily: 'monospace',
        },
        iconTheme: {
          primary: '#22d3ee',
          secondary: '#1e293b',
        },
      })
    } catch (err) {
      toast.error('Failed to copy', {
        style: {
          background: '#1e293b',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          fontFamily: 'monospace',
        },
      })
    }
  }

  const exportResults = (format) => {
    const timestamp = new Date().toISOString().split('T')[0]
    let content

    switch(format) {
      case 'csv':
        content = 'Entry,Malicious Detections\n' + 
          results.map(r => `${r.entry},${r.malicious}`).join('\n')
        return new Blob([content], { type: 'text/csv' })
      case 'json':
        content = JSON.stringify(results, null, 2)
        return new Blob([content], { type: 'application/json' })
      default:
        content = results.map(r => `${r.entry} - ${r.malicious} detections`).join('\n')
        return new Blob([content], { type: 'text/plain' })
    }
  }


  const ApiKeyModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 border border-red-500/20">
        <div className="flex items-center gap-3 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h3 className="text-xl font-mono text-red-400">API Key Required</h3>
        </div>
        <p className="text-gray-300 font-mono text-sm mb-6">
          Please enter your VirusTotal API key to proceed. You can get one by signing up at VirusTotal.
        </p>
        <div className="flex justify-end gap-3">
          <a
            href="https://www.virustotal.com/gui/join-us"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                     hover:bg-cyan-500/30 transition-all duration-300 font-mono
                     border border-cyan-500/30 text-sm"
          >
            Get API Key
          </a>
          <button
            onClick={() => setShowApiKeyModal(false)}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-md 
                     hover:bg-red-500/30 transition-all duration-300 font-mono
                     border border-red-500/30 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  

  // Update the ApiUsageDisplay component to include a reset button
  const ApiUsageDisplay = ({ apiUsage, API_LIMIT, progress, isLoading, results, apiKey }) => {
    // If no API key is selected, show all zeros
    const displayUsage = apiKey ? apiUsage : 0
    const displayRemaining = apiKey ? (API_LIMIT - apiUsage) : 0
    const displayResults = apiKey ? results.length : 0

    return (
      <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-mono text-cyan-400">API Usage Monitor</h3>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm font-mono">
              {displayUsage} / {API_LIMIT}
            </div>
          </div>
        </div>
        
        {/* API Usage Progress */}
        <div className="relative pt-1">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-700">
            <div 
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                displayUsage >= API_LIMIT ? 'bg-red-500' :
                displayUsage >= (API_LIMIT * 0.8) ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min((displayUsage/API_LIMIT) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Real-time Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-700/30 p-3 rounded-md">
            <div className="text-2xl font-mono text-cyan-300">{displayUsage}</div>
            <div className="text-sm text-gray-400">Queries Today</div>
          </div>
          <div className="bg-gray-700/30 p-3 rounded-md">
            <div className="text-2xl font-mono text-cyan-300">{displayRemaining}</div>
            <div className="text-sm text-gray-400">Remaining</div>
          </div>
          <div className="bg-gray-700/30 p-3 rounded-md">
            <div className="text-2xl font-mono text-cyan-300">{displayResults}</div>
            <div className="text-sm text-gray-400">Threats Found</div>
          </div>
        </div>

        {/* Scanning Progress */}
        {isLoading && progress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm font-mono mb-2">
              <span className="text-cyan-400">Scanning Progress:</span>
              <span className="text-cyan-300">{progress.current} / {progress.total}</span>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-700">
              <div 
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min((progress.current/progress.total) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {displayUsage >= (API_LIMIT * 0.8) && displayUsage < API_LIMIT && (
          <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm font-mono">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Approaching daily limit
          </div>
        )}
      </div>
    )
  }


  const handleApiKeySelect = async (selectedKey) => {
    // Clean up previous listener if it exists
    if (unsubscribeListener) {
      unsubscribeListener()
    }
    
    setApiKey(selectedKey);
    
    // Set up real-time listener for this key
    const unsubscribe = listenToApiKeyUsage(selectedKey, (newUsage) => {
      setApiUsage(newUsage);
    });
    setUnsubscribeListener(() => unsubscribe);

    // Store the selected key in localStorage
    localStorage.setItem('vtApiKey', selectedKey);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-gray-100">
      <Toaster position="top-right" />
      {showApiKeyModal && <ApiKeyModal />}
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header section */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">
            VirusTotal Threat Scanner
          </h1>
        </div>

        {/* User Guide Toggle Button (when guide is hidden) */}
        {!showGuide && (
          <button
            onClick={() => setShowGuide(true)}
            className="bg-gray-800/50 p-3 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg
                       hover:bg-gray-800/70 transition-all duration-300 text-cyan-400"
            title="Show Quick Start Guide"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}

        {/* User Guide Section */}
        {showGuide && (
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                    clipRule="evenodd" 
                  />
                </svg>
                Quick Start Guide
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="p-2 text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                title="Close Guide"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono">
                  1
                </span>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    Add your <span className="text-cyan-400">VirusTotal API key</span> using the key manager below.
                  </p>
                  <p className="text-xs text-gray-400">
                    Need a key? <a href="https://www.virustotal.com/gui/join-us" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Sign up at VirusTotal</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono">
                  2
                </span>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    Choose your scan type: <span className="text-cyan-400">IP addresses</span> or <span className="text-cyan-400">Domains</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Select based on the type of data you want to analyze
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono">
                  3
                </span>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    Upload a <span className="text-cyan-400">.txt file</span> with your entries
                  </p>
                  <p className="text-xs text-gray-400">
                    One entry per line, supports both IPv4 addresses and domain names
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono">
                  4
                </span>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    Click <span className="text-cyan-400">"Start Scanning"</span> to begin analysis
                  </p>
                  <p className="text-xs text-gray-400">
                    Results will show detected threats with export options
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="p-3 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                  <p className="text-sm font-mono text-cyan-300 flex items-center gap-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 flex-shrink-0" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    API Usage Limits
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300 font-mono pl-7">
                    <li>• Daily limit: <span className="text-cyan-400">500 queries</span> per API key</li>
                    <li>• Multiple API keys supported for increased capacity</li>
                    <li>• Automatic key rotation when approaching limits</li>
                    <li>• Daily reset at midnight (PH time)</li>
                  </ul>
                </div>

                <div className="p-3 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                  <p className="text-sm font-mono text-cyan-300 flex items-center gap-2">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 flex-shrink-0" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    Pro Tips
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300 font-mono pl-7">
                    <li>• Monitor the usage counter to avoid hitting limits</li>
                    <li>• Export results in CSV, JSON, or TXT formats</li>
                    <li>• Use multiple API keys for large scans</li>
                    <li>• API usage automatically resets at midnight</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
          <ApiKeyManager 
            onKeySelect={handleApiKeySelect} 
            currentApiKey={apiKey} 
          />
        </div>

             {/* Enhanced API Usage Display */}
             <ApiUsageDisplay 
               apiUsage={apiUsage} 
               API_LIMIT={API_LIMIT} 
               progress={progress}
               isLoading={isLoading}
               results={results}
               apiKey={apiKey}
             />

        {/* Check Type Selection */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
          <div className="flex gap-4">
            <button
              onClick={() => setInputType('ip')}
              className={`px-6 py-2 rounded-md font-mono transition-all duration-300 ${
                inputType === 'ip'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700/70'
              }`}
            >
              Check IPs
            </button>
            <button
              onClick={() => setInputType('domain')}
              className={`px-6 py-2 rounded-md font-mono transition-all duration-300 ${
                inputType === 'domain'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700/70'
              }`}
            >
              Check Domains
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
          <div className="space-y-4">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-cyan-400 font-mono
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border
                file:border-cyan-500/30
                file:text-sm file:font-mono
                file:bg-cyan-500/20 file:text-cyan-300
                hover:file:bg-cyan-500/30
                cursor-pointer"
            />
            <div className="flex gap-4">
              <button
                onClick={debouncedCheckEntries}
                disabled={isLoading || !file || !apiKey || isScanning || isCooldown}
                className={`w-full px-4 py-3 rounded-md font-mono transition-all duration-300
                  ${isCooldown 
                    ? 'bg-gray-700/50 text-gray-500 border border-gray-600/30 cursor-not-allowed'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
                  }
                  ${isLoading 
                    ? 'bg-gray-700/50 text-gray-500 border border-gray-600/30 cursor-not-allowed'
                    : ''
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Scanning...
                  </span>
                ) : isCooldown ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Cooldown: {cooldownTime}s
                  </span>
                ) : 'Start Scanning'}
              </button>
              {isLoading && (
                <button
                  onClick={() => { isCanceledRef.current = true; }}
                  className="bg-red-500/20 text-red-300 px-4 py-3 rounded-md 
                           hover:bg-red-500/30 transition-all duration-300 font-mono
                           border border-red-500/30"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {hasScanned && progress.current === progress.total && !isLoading && results ? (
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-400 font-mono">
                Scan Results:
              </h2>
              {results.length > 0 && (
                <span className="text-sm font-mono text-red-400">
                  {results.length} threats detected
                </span>
              )}
            </div>

            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-red-900/20 rounded-md border border-red-500/30 flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <span className="font-mono text-red-300">{result.entry}</span>
                      <span className="ml-2 text-red-400 font-mono">
                        ({result.malicious} malicious detections)
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.entry)}
                      className="ml-4 p-2 text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 
                               transition-all duration-200 focus:opacity-100 outline-none"
                      title="Copy to clipboard"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-900/20 rounded-md border border-emerald-500/30">
                <div className="flex items-center space-x-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-emerald-400" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  <span className="font-mono text-emerald-400">
                    Scan complete - No malicious entries detected
                  </span>
                </div>
              </div>
            )}

            {/* Export buttons - only show if scan is complete and there are results */}
            {results.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {/* Export CSV */}
                <button
                  onClick={() => {
                    const blob = exportResults('csv')
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `scan-results-${Date.now()}.csv`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                             text-sm font-mono hover:bg-cyan-500/30 transition-all duration-300
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </button>

                {/* Export JSON */}
                <button
                  onClick={() => {
                    const blob = exportResults('json')
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `scan-results-${Date.now()}.json`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                             text-sm font-mono hover:bg-cyan-500/30 transition-all duration-300
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  JSON
                </button>

                {/* Export TXT */}
                <button
                  onClick={() => {
                    const blob = exportResults('txt')
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `scan-results-${Date.now()}.txt`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                             text-sm font-mono hover:bg-cyan-500/30 transition-all duration-300
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  TXT
                </button>

                {/* Copy All */}
                <button
                  onClick={() => {
                    const allEntries = results.map(r => r.entry).join('\n');
                    copyToClipboard(allEntries);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                             text-sm font-mono hover:bg-cyan-500/30 transition-all duration-300
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Copy All
                </button>

                {/* Download Report */}
                <button
                  onClick={() => {
                    // Add your report generation logic here
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-md 
                             text-sm font-mono hover:bg-cyan-500/30 transition-all duration-300
                             border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </button>
              </div>
            )}
          </div>
        ) : hasScanned && (isLoading || progress.current !== progress.total) ? (
          // Show loading state while scanning
          <div className="bg-gray-800/50 p-6 rounded-lg border border-cyan-500/20 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-400 font-mono">
                Scanning in Progress:
              </h2>
            </div>
            <div className="p-4 bg-gray-700/30 rounded-md">
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-cyan-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span className="font-mono text-cyan-400">
                  {isLoading ? "Scanning entries..." : "Preparing scan results..."}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-cyan-400">Progress:</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current/progress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}