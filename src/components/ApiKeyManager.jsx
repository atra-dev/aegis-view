'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/services/firebase'
import { 
  getUserApiKeys, 
  storeApiKey, 
  deleteApiKey,
  getApiKeyDetails,
  listenToApiKeyUsage
} from '@/services/management'
import toast from 'react-hot-toast'

export default function ApiKeyManager({ onKeySelect, currentApiKey }) {
  const [apiKeys, setApiKeys] = useState([])
  const [newApiKey, setNewApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddKey, setShowAddKey] = useState(false)
  const [keyDetails, setKeyDetails] = useState(null)
  const [unsubscribeListeners, setUnsubscribeListeners] = useState([])
  const [showAllKeys, setShowAllKeys] = useState(false)
  const INITIAL_DISPLAY_COUNT = 5

  // Fetch user's API keys and set up real-time listeners
  useEffect(() => {
    const loadApiKeys = async () => {
      if (auth.currentUser) {
        const keys = await getUserApiKeys(auth.currentUser.uid, auth.currentUser.email)
        // Sort keys by usage (ascending) and expiration status
        const sortedKeys = keys.sort((a, b) => {
          if (a.isExpired === b.isExpired) {
            return a.dailyUsage - b.dailyUsage
          }
          return a.isExpired ? 1 : -1
        })
        setApiKeys(sortedKeys)

        // Clean up previous listeners
        unsubscribeListeners.forEach(unsubscribe => unsubscribe())
        setUnsubscribeListeners([])

        // Set up new listeners for each key
        const newListeners = sortedKeys.map(key => {
          return listenToApiKeyUsage(key.key, (usage) => {
            setApiKeys(prevKeys => {
              return prevKeys.map(k => {
                if (k.key === key.key) {
                  return { ...k, dailyUsage: usage, isExpired: usage >= 450 }
                }
                return k
              }).sort((a, b) => {
                if (a.isExpired === b.isExpired) {
                  return a.dailyUsage - b.dailyUsage
                }
                return a.isExpired ? 1 : -1
              })
            })
          })
        })
        setUnsubscribeListeners(newListeners)
      }
    }

    loadApiKeys()
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadApiKeys()
      } else {
        setApiKeys([])
        // Clean up listeners when user logs out
        unsubscribeListeners.forEach(unsubscribe => unsubscribe())
        setUnsubscribeListeners([])
      }
    })

    return () => {
      unsubscribe()
      // Clean up listeners when component unmounts
      unsubscribeListeners.forEach(unsubscribe => unsubscribe())
    }
  }, [])

  // Load current API key details
  useEffect(() => {
    const loadKeyDetails = async () => {
      if (currentApiKey) {
        const details = await getApiKeyDetails(currentApiKey)
        setKeyDetails(details)
      }
    }
    loadKeyDetails()
  }, [currentApiKey])

  const handleAddKey = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!auth.currentUser) {
        toast.error('Please sign in first')
        return
      }

      // Validate API key format
      if (newApiKey.length < 32) {
        toast.error('Invalid API key format')
        return
      }

      const result = await storeApiKey(newApiKey, auth.currentUser.uid, auth.currentUser.email)
      
      if (result.success) {
        const updatedKeys = await getUserApiKeys(auth.currentUser.uid, auth.currentUser.email)
        setApiKeys(updatedKeys)
        setNewApiKey('')
        setShowAddKey(false)
        toast.success('API key added successfully', {
          style: {
            background: '#1e293b',
            color: '#22d3ee',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            fontFamily: 'monospace',
          },
        })

        // Automatically select the new key if no key is currently selected
        if (!currentApiKey) {
          onKeySelect(newApiKey)
        }
      } else {
        toast.error(result.error, {
          style: {
            background: '#1e293b',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            fontFamily: 'monospace',
          },
        })
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        style: {
          background: '#1e293b',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          fontFamily: 'monospace',
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteKey = async (apiKey) => {
    try {
      await deleteApiKey(apiKey)
      const updatedKeys = await getUserApiKeys(auth.currentUser.uid, auth.currentUser.email)
      setApiKeys(updatedKeys)
      toast.success('API key deleted successfully')
    } catch (error) {
      toast.error('Failed to delete API key')
    }
  }

  const findAvailableKey = () => {
    const availableKey = apiKeys.find(key => key.dailyUsage < 450)
    if (availableKey) {
      onKeySelect(availableKey.key)
      toast.success('Switched to available API key')
    } else {
      toast.error('No available API keys found')
    }
  }

  return (
    <div className="relative">
      {/* Header Section with Gradient Background */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-lg blur-xl"></div>
        <div className="relative flex justify-between items-center p-6">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">
              API Key Management
            </h3>
            <p className="text-gray-400 text-sm font-mono mt-1">
              Manage your VirusTotal API keys and monitor usage
            </p>
          </div>
          <button
            onClick={() => setShowAddKey(!showAddKey)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                     text-cyan-300 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 
                     text-sm font-mono transition-all duration-300 border border-cyan-500/20
                     hover:border-cyan-500/30 backdrop-blur-sm"
          >
            {showAddKey ? 'Cancel' : 'Add New Key'}
          </button>
        </div>
      </div>

      {/* Add new API key form with slide animation */}
      {showAddKey && (
        <div className="mb-8 transform transition-all duration-300 ease-in-out">
          <form onSubmit={handleAddKey} className="relative">
            <div className="flex gap-4">
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="flex-1 rounded-lg bg-gray-900/50 px-4 py-3 
                         text-cyan-100 font-mono focus:ring-2 focus:ring-cyan-500/50
                         border border-cyan-500/20 backdrop-blur-sm"
                placeholder="Enter new API key"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                         text-cyan-300 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 
                         transition-all duration-300 font-mono border border-cyan-500/20
                         hover:border-cyan-500/30 backdrop-blur-sm
                         disabled:from-gray-700/50 disabled:to-gray-700/50 disabled:text-gray-500"
              >
                {isLoading ? 'Adding...' : 'Add Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Key Details with modern card design */}
      {currentApiKey && (
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-lg blur-xl"></div>
          <div className="relative p-6 rounded-lg border border-cyan-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <h4 className="text-lg font-mono text-cyan-400">Active Key Details</h4>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 font-mono">Added by</p>
                <p className="text-cyan-300 font-mono">{keyDetails?.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 font-mono">Last Updated</p>
                <p className="text-cyan-300 font-mono">
                  {keyDetails?.lastReset ? new Date(keyDetails.lastReset).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 font-mono">Status</p>
                <p className={`font-mono ${keyDetails?.isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                  {keyDetails?.isExpired ? 'Expired' : 'Active'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List with modern design */}
      <div className="space-y-4">
        {apiKeys.slice(0, showAllKeys ? apiKeys.length : INITIAL_DISPLAY_COUNT).map((apiKey) => (
          <div
            key={apiKey.id}
            className={`group relative p-4 rounded-lg transition-all duration-300
              ${apiKey.key === currentApiKey 
                ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20'
                : 'bg-gray-900/50 border border-gray-700/50 hover:border-cyan-500/20'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    apiKey.dailyUsage >= 450 
                      ? 'bg-red-400' 
                      : apiKey.dailyUsage >= 400 
                      ? 'bg-yellow-400' 
                      : 'bg-emerald-400'
                  }`}></div>
                  <div className="font-mono">
                    <div className="text-cyan-300 flex items-center gap-2">
                      {apiKey.key.substring(0, 10)}...
                      {apiKey.key === currentApiKey && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">current</span>
                      )}
                      {apiKey.isOwner && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">owner</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Added by: {apiKey.userEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className={`text-sm font-mono ${
                    apiKey.dailyUsage >= 480 
                      ? 'text-red-400' 
                      : apiKey.dailyUsage >= 450 
                      ? 'text-yellow-400' 
                      : 'text-gray-400'
                  }`}>
                    Usage: {apiKey.dailyUsage}/500
                  </div>
                  {apiKey.dailyUsage >= 450 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">limit reached</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onKeySelect(apiKey.key)}
                  disabled={apiKey.key === currentApiKey}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                           text-cyan-300 rounded-md hover:from-cyan-500/30 hover:to-blue-500/30 
                           text-sm font-mono transition-all duration-300 border border-cyan-500/20
                           hover:border-cyan-500/30 disabled:opacity-50"
                >
                  Use
                </button>
                {apiKey.isOwner && (
                  <button
                    onClick={() => handleDeleteKey(apiKey.key)}
                    disabled={apiKey.key === currentApiKey}
                    className="px-3 py-1.5 bg-gradient-to-r from-red-500/20 to-red-500/20 
                             text-red-300 rounded-md hover:from-red-500/30 hover:to-red-500/30 
                             text-sm font-mono transition-all duration-300 border border-red-500/20
                             hover:border-red-500/30 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {apiKeys.length === 0 && (
          <div className="text-center p-8 rounded-lg bg-gray-900/50 border border-gray-700/50">
            <p className="text-gray-400 font-mono">No API keys added yet</p>
          </div>
        )}

        {apiKeys.length > INITIAL_DISPLAY_COUNT && (
          <button
            onClick={() => setShowAllKeys(!showAllKeys)}
            className="w-full p-3 text-sm font-mono text-cyan-400 hover:text-cyan-300 
                     bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 
                     hover:to-blue-500/20 rounded-lg transition-all duration-300
                     border border-cyan-500/20 hover:border-cyan-500/30 backdrop-blur-sm"
          >
            {showAllKeys ? 'Show Less' : `Show More (${apiKeys.length - INITIAL_DISPLAY_COUNT} more)`}
          </button>
        )}
      </div>

      {/* Recommendations Section with modern design */}
      {apiKeys.length > 0 && (
        <div className="mt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-lg blur-xl"></div>
          <div className="relative p-6 rounded-lg border border-cyan-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <h4 className="text-lg font-mono text-cyan-400">Key Recommendations</h4>
            </div>
            {apiKeys.some(key => key.dailyUsage < 450) ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300 font-mono">
                  Available API keys ({apiKeys.filter(key => key.dailyUsage < 450).length}):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {apiKeys
                    .filter(key => key.dailyUsage < 450)
                    .sort((a, b) => a.dailyUsage - b.dailyUsage)
                    .slice(0, 3)
                    .map(key => (
                      <div 
                        key={key.id} 
                        className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50 
                                 hover:border-cyan-500/20 transition-all duration-300"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-300 font-mono text-sm">
                            {key.key.substring(0, 10)}...
                          </span>
                          <span className="text-xs text-gray-400">
                            {key.dailyUsage} uses
                          </span>
                        </div>
                        <button
                          onClick={() => onKeySelect(key.key)}
                          className="mt-2 w-full px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                                   text-cyan-300 rounded text-xs font-mono hover:from-cyan-500/30 
                                   hover:to-blue-500/30 transition-all duration-300 border border-cyan-500/20
                                   hover:border-cyan-500/30"
                        >
                          Switch
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 font-mono text-sm">
                  All API keys have reached their daily limit. Please add a new key.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions with modern design */}
      <div className="mt-8">
        <button
          onClick={findAvailableKey}
          className="w-full p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                   text-cyan-300 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 
                   text-sm font-mono transition-all duration-300 border border-cyan-500/20
                   hover:border-cyan-500/30 backdrop-blur-sm"
        >
          Switch to Available Key
        </button>
      </div>
    </div>
  )
} 