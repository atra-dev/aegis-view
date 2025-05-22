{/*'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDataSensors } from '@/services/stellar';
import { auth } from '@/services/firebase';
import { ChevronDown, ChevronUp, Search, Filter, RefreshCw } from 'lucide-react';
import { getAuthToken } from '@/services/auth';
import { toast, Toaster } from 'react-hot-toast';

export default function DataSensorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [authCredentials, setAuthCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'connected', 'disconnected'
  const [filterPlatform, setFilterPlatform] = useState('all');

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);

    try {
      const { success, token, error } = await getAuthToken(
        authCredentials.username,
        authCredentials.password
      );

      if (success && token) {
        localStorage.setItem('stellar_token', token);
        setShowAuthModal(false);
        await loadDataSensors();
      } else {
        setError(error || 'Authentication failed');
        toast.error(error || 'Authentication failed');
      }
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadDataSensors = async () => {
    if (!authChecked) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching data sensors...');
      const result = await fetchDataSensors();
      console.log('Data sensors result:', {
        success: result.success,
        hasData: !!result.sensors,
        dataType: typeof result.sensors,
        isArray: Array.isArray(result.sensors),
        dataLength: Array.isArray(result.sensors) ? result.sensors.length : 'N/A',
        sampleData: result.sensors?.[0]
      });
      
      if (!result.success) {
        if (result.error === 'Authentication required') {
          setShowAuthModal(true);
          return;
        }
        throw new Error(result.error);
      }

      const sensors = Array.isArray(result.sensors) ? result.sensors : [];
      console.log('Setting data sensors:', {
        length: sensors.length,
        isArray: Array.isArray(sensors)
      });
      setSensors(sensors);
    } catch (err) {
      console.error('Error loading data sensors:', err);
      setError(err.message || 'Failed to load data sensors');
      toast.error(err.message || 'Failed to load data sensors');
      setSensors([]);
    } finally {
      setLoading(false);
    }
  };

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router]);

  // Load data sensors when auth is checked
  useEffect(() => {
    if (authChecked) {
      loadDataSensors();
    }
  }, [authChecked]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!authChecked) return;

    const interval = setInterval(() => {
      loadDataSensors();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authChecked]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSensors = [...sensors].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Get unique platforms for filter
  const platforms = [...new Set(sensors.map(sensor => sensor.platform))].filter(Boolean);

  // Filter sensors based on status and platform
  const filteredSensors = sortedSensors.filter(sensor => {
    const matchesSearch = (
      sensor.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.sensor_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.os?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.cust_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'connected' && sensor.connection_status === 'connected') ||
      (filterStatus === 'disconnected' && sensor.connection_status !== 'connected');

    const matchesPlatform = filterPlatform === 'all' || sensor.platform === filterPlatform;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const toggleRow = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          <p className="text-yellow-400 font-mono">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <Toaster position="top-right" />

     
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
            Data Sensors
          </h1>
          <div className="flex gap-4">
            <button
              onClick={loadDataSensors}
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
        ) : sensors.length === 0 ? (
          <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/20">
            <p className="text-gray-400 font-mono">No data sensors available.</p>
          </div>
        ) : (
          <div className="space-y-4">
          
            <div className="bg-gray-800/50 rounded-lg border border-yellow-500/20 p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sensors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50"
                    >
                      <option value="all">All Status</option>
                      <option value="connected">Connected</option>
                      <option value="disconnected">Disconnected</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-yellow-500/50"
                    >
                      <option value="all">All Platforms</option>
                      {platforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

        
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Showing {filteredSensors.length} of {sensors.length} sensors</span>
              <button
                onClick={loadDataSensors}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

         
            <div className="overflow-x-auto rounded-lg border border-yellow-500/20">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase">Basic Info</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase">System Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase">License</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-yellow-400 uppercase">Additional Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10">
                  {filteredSensors.map((sensor) => (
                    <tr key={sensor._id} className="bg-gray-800/30 hover:bg-gray-700/30 transition-colors">
                  
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div>
                            <div className="font-semibold text-yellow-400">{sensor.hostname}</div>
                            <div className="text-sm text-gray-400">ID: {sensor.sensor_id}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-300">
                              <span className="text-gray-400">Platform:</span> {sensor.platform}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">OS:</span> {sensor.os}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Version:</span> {sensor.sw_version}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Customer:</span> {sensor.cust_name}
                            </div>
                          </div>
                        </div>
                      </td>

                  
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full font-mono ${
                              sensor.connection_status === 'connected' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {sensor.connection_status}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full font-mono ${
                              sensor.service_status === 'running' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {sensor.service_status}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="text-gray-300">
                              <span className="text-gray-400">CPU:</span> {sensor.cpu_usage}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Memory:</span> {sensor.mem_usage}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Disk:</span> {sensor.disk_usage}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Last Stats:</span> {sensor.last_stats_time}
                            </div>
                          </div>
                        </div>
                      </td>

                   
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm space-y-1">
                            <div className="text-gray-300">
                              <span className="text-gray-400">NAT IP:</span> {sensor.nat_ip_address}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Local IP:</span> {sensor.local_ip_address}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Interface:</span> {sensor.packet_forwarding_interface}
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="text-gray-300">
                              <span className="text-gray-400">Inbound:</span> {sensor.inbytes_total}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Outbound:</span> {sensor.outbytes_total}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Tunnel:</span> {sensor.tunnel_enabled === 'true' ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                      </td>

                    
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm space-y-1">
                            <div className="text-gray-300">
                              <span className="text-gray-400">License:</span> {sensor.license}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">License APT:</span> {sensor.license_apt}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">License IDs:</span> {sensor.license_ids}
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-300">
                              <span className="text-gray-400">Need Upgrade:</span> {sensor.need_upgrade}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Module Version:</span> {sensor.module_version}
                            </div>
                          </div>
                        </div>
                      </td>

                
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm space-y-1">
                            <div className="text-gray-300">
                              <span className="text-gray-400">Mode:</span> {sensor.mode}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Feature:</span> {sensor.feature}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Timezone:</span> {sensor.timezone}
                            </div>
                            <div className="text-gray-300">
                              <span className="text-gray-400">Auth State:</span> {sensor.auth_state_code}
                            </div>
                          </div>
                          {sensor.message && (
                            <div className="text-sm">
                              <div className="text-gray-300">
                                <span className="text-gray-400">Message:</span> {sensor.message}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} */}