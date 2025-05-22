'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import { fetchSensorImages } from '@/future_features/stellar'
import { getAuthToken } from '@/services/auth'
import { toast, Toaster } from 'react-hot-toast'

export default function SensorImages() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [sensorImages, setSensorImages] = useState([])
  const [error, setError] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authCredentials, setAuthCredentials] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [downloadingImages, setDownloadingImages] = useState({})  // Track downloading state per image
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const [expandedRows, setExpandedRows] = useState({})

  const handleAuth = async (e) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setError(null)

    try {
      const { success, token, error } = await getAuthToken(
        authCredentials.username,
        authCredentials.password
      )

      if (success && token) {
        localStorage.setItem('stellar_token', token)
        setShowAuthModal(false)
        await loadSensorImages()
      } else {
        setError(error || 'Authentication failed')
        toast.error(error || 'Authentication failed')
      }
    } catch (error) {
      setError(error.message)
      toast.error(error.message)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const loadSensorImages = async () => {
    if (!authChecked) return // Don't load until auth is checked
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching sensor images...');
      const result = await fetchSensorImages()
      console.log('Sensor images result:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A'
      });
      
      if (!result.success) {
        if (result.error === 'Authentication required') {
          setShowAuthModal(true)
          return
        }
        throw new Error(result.error)
      }

      // Ensure we're setting an array
      const images = Array.isArray(result.data) ? result.data : [];
      console.log('Setting sensor images:', {
        length: images.length,
        isArray: Array.isArray(images)
      });
      setSensorImages(images)
    } catch (error) {
      console.error('Error loading sensor images:', error)
      setError(error.message)
      toast.error(error.message)
      setSensorImages([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (image) => {
    try {
      // Set downloading state for this specific image
      setDownloadingImages(prev => ({ ...prev, [image.package]: true }));
      setError(null);

      const token = localStorage.getItem('stellar_token');
      if (!token) {
        setShowAuthModal(true);
        return;
      }

      // Log the download attempt
      console.log('Attempting to download:', {
        version: image.version,
        package: image.package,
        name: image.name
      });

      const response = await fetch(`/api/stellar/sensor-images/download/${encodeURIComponent(image.version)}/${encodeURIComponent(image.package)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to get download URL');
      }

      if (data.success && data.downloadUrl) {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${image.package}-${image.version}.img`; // Set a meaningful filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        toast.success(`Downloading ${image.name} v${image.version}`);
      } else {
        throw new Error('Invalid download URL received');
      }
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      // Clear downloading state for this specific image
      setDownloadingImages(prev => ({ ...prev, [image.package]: false }));
    }
  };

  const sortData = (data, key) => {
    return [...data].sort((a, b) => {
      if (key === 'size') {
        return sortConfig.direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
      }
      if (a[key] < b[key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const toggleRowExpansion = (imagePackage) => {
    setExpandedRows(prev => ({
      ...prev,
      [imagePackage]: !prev[imagePackage]
    }));
  };

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/signin')
        return
      }
      setAuthChecked(true)
    })

    return () => unsubscribe()
  }, [router])

  // Load sensor images when auth is checked
  useEffect(() => {
    if (authChecked) {
      loadSensorImages()
    }
  }, [authChecked])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!authChecked) return

    const interval = setInterval(() => {
      loadSensorImages()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [authChecked])

  // Show loading only during initial auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          <p className="text-yellow-400 font-mono">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <Toaster position="top-right" />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Authentication Required</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={authCredentials.username}
                  onChange={(e) => setAuthCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-gray-200"
                  required
                  disabled={isAuthenticating}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={authCredentials.password}
                    onChange={(e) => setAuthCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-gray-200 pr-10"
                    required
                    disabled={isAuthenticating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 border border-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-mono">
            Sensor Images
          </h1>
          <div className="flex gap-4">
            <button
              onClick={loadSensorImages}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm flex items-center gap-2"
            >
              <svg 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-mono text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg">
            <p className="font-mono">{error}</p>
          </div>
        ) : sensorImages.length === 0 ? (
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <p className="text-gray-400 font-mono">No sensor images available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-yellow-500/20">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="w-8 px-4 py-3"></th>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase cursor-pointer hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Name <SortIcon column="name" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('version')}
                    className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase cursor-pointer hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Version <SortIcon column="version" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('package')}
                    className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase cursor-pointer hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Package <SortIcon column="package" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('size')}
                    className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase cursor-pointer hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Size <SortIcon column="size" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-yellow-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-500/10">
                {sortData(sensorImages, sortConfig.key).map((image, index) => (
                  <React.Fragment key={index}>
                    <tr className="bg-gray-800/30 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleRowExpansion(image.package)}
                          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                        >
                          <svg 
                            className={`w-4 h-4 transform transition-transform ${expandedRows[image.package] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-yellow-400">{image.name}</span>
                          {image.display_value && (
                            <span className="text-xs text-gray-400 mt-1">{image.display_value}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono">
                        {image.version}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full font-mono">
                          {image.package}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono">
                        {(image.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownload(image)}
                          disabled={downloadingImages[image.package]}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingImages[image.package] ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Preparing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[image.package] && (
                      <tr className="bg-gray-800/50">
                        <td className="px-4 py-4"></td>
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-4">
                            {/* SHA1 Hash */}
                            <div>
                              <span className="text-xs font-semibold text-yellow-400 uppercase">SHA1 Hash</span>
                              <p className="mt-1 text-xs text-gray-400 font-mono break-all">{image.sha1}</p>
                            </div>

                            {/* Supported Items */}
                            {image.item_list && image.item_list.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-yellow-400 uppercase">Supported Systems</span>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {image.item_list.map((item, idx) => (
                                    <span 
                                      key={idx} 
                                      className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded font-mono"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Additional Details */}
                            {image.description && (
                              <div>
                                <span className="text-xs font-semibold text-yellow-400 uppercase">Description</span>
                                <p className="mt-1 text-sm text-gray-300">{image.description}</p>
                              </div>
                            )}

                            {/* Release Date if available */}
                            {image.release_date && (
                              <div>
                                <span className="text-xs font-semibold text-yellow-400 uppercase">Release Date</span>
                                <p className="mt-1 text-sm text-gray-300">{new Date(image.release_date).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 