'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function RedisManagement() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [expiry, setExpiry] = useState('3600')
  const [selectedKey, setSelectedKey] = useState(null)
  const [selectedValue, setSelectedValue] = useState(null)

  // Fetch all keys
  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/redis')
      const data = await response.json()
      if (data.success) {
        setKeys(data.data)
      }
    } catch (error) {
      console.error('Error fetching keys:', error)
      toast.error('Failed to fetch Redis keys')
    } finally {
      setLoading(false)
    }
  }

  // Fetch value for a specific key
  const fetchValue = async (key) => {
    try {
      const response = await fetch(`/api/redis?key=${encodeURIComponent(key)}`)
      const data = await response.json()
      if (data.success) {
        setSelectedValue(data.data)
      }
    } catch (error) {
      console.error('Error fetching value:', error)
      toast.error('Failed to fetch value')
    }
  }

  // Add new key-value pair
  const addKeyValue = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: newKey,
          value: newValue,
          expiry: parseInt(expiry),
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Cache entry added successfully')
        setNewKey('')
        setNewValue('')
        fetchKeys()
      } else {
        toast.error(data.message || 'Failed to add cache entry')
      }
    } catch (error) {
      console.error('Error adding key-value:', error)
      toast.error('Failed to add cache entry')
    }
  }

  // Delete a key
  const deleteKey = async (key) => {
    try {
      const response = await fetch(`/api/redis?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Cache entry deleted successfully')
        if (selectedKey === key) {
          setSelectedKey(null)
          setSelectedValue(null)
        }
        fetchKeys()
      } else {
        toast.error(data.message || 'Failed to delete cache entry')
      }
    } catch (error) {
      console.error('Error deleting key:', error)
      toast.error('Failed to delete cache entry')
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  useEffect(() => {
    if (selectedKey) {
      fetchValue(selectedKey)
    }
  }, [selectedKey])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">Redis Management</h1>
          <button
            onClick={fetchKeys}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Cache Entry */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-cyan-400">Add New Cache Entry</h2>
            <form onSubmit={addKeyValue} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Value</label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 h-32"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Expiry (seconds)</label>
                <input
                  type="number"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  min="1"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Add Entry
              </button>
            </form>
          </div>

          {/* Cache Entries */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-cyan-400">Cache Entries</h2>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              </div>
            ) : keys.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No cache entries found</p>
            ) : (
              <div className="space-y-4">
                {keys.map((key) => (
                  <div
                    key={key}
                    className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 hover:border-cyan-500 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedKey(key)}
                        className="text-gray-200 hover:text-cyan-400 truncate flex-1 text-left"
                      >
                        {key}
                      </button>
                      <button
                        onClick={() => deleteKey(key)}
                        className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    {selectedKey === key && selectedValue && (
                      <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-600">
                        <pre className="text-gray-300 whitespace-pre-wrap break-words">
                          {typeof selectedValue === 'object'
                            ? JSON.stringify(selectedValue, null, 2)
                            : selectedValue}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 