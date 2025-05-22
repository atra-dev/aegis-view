'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-hot-toast'
import { getUserSettings, updateAppearanceSettings, updateNotificationSettings, updateUserSettings, updateSecuritySettings, getUserMFAStatus, updateDisplayName, updateUserPhoto } from '@/services/settings'
import { useRouter } from 'next/navigation'
import { logger } from '@/utils/logger'

export default function Settings() {
  const router = useRouter()
  const { user, userRole } = useAuth()
  const { theme, setTheme, fontSize, setFontSize } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [confirmPinCode, setConfirmPinCode] = useState('')
  const [isPinCodeEnabled, setIsPinCodeEnabled] = useState(false)
  const [currentPinCode, setCurrentPinCode] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [pinVerificationError, setPinVerificationError] = useState('')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings(user.uid)
        setSettings(userSettings)
        // Apply theme and font size from settings
        setTheme(userSettings.appearance.theme)
        setFontSize(userSettings.appearance.fontSize)
        // Set webhook URL from settings if it exists
        setWebhookUrl(userSettings.webhookUrl || '')
        // Set pin code settings
        setIsPinCodeEnabled(userSettings.security?.pinCodeEnabled || false)
        // Set display name
        setDisplayName(user?.displayName || '')
        // Set photo URL
        setPhotoURL(user?.photoURL || '')
        // Check MFA status
        const mfaStatus = await getUserMFAStatus(user.uid)
        setMfaEnabled(mfaStatus)
      } catch (error) {
        toast.error('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user, router])

  const handleSave = async () => {
    try {
      setIsLoading(true)
      
      // Update display name if changed
      if (displayName !== user?.displayName) {
        await updateDisplayName(user.uid, displayName)
      }

      await Promise.all([
        updateAppearanceSettings(user.uid, settings.appearance),
        updateNotificationSettings(user.uid, settings.notifications),
        updateUserSettings(user.uid, { 
          webhookUrl
        }),
        updateSecuritySettings(user.uid, {
          pinCode: pinCode || settings.security?.pinCode,
          pinCodeEnabled: isPinCodeEnabled
        })
      ])
      // Apply theme changes immediately
      setTheme(settings.appearance.theme)
      setFontSize(settings.appearance.fontSize)
      toast.success('Settings saved successfully')
      setIsEditing(false)
      setPinCode('')
      setConfirmPinCode('')
    } catch (error) {
      logger.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppearanceChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: value
      }
    }))
    
    // Apply theme changes immediately when in edit mode
    if (isEditing) {
      if (key === 'theme') {
        setTheme(value)
      } else if (key === 'fontSize') {
        setFontSize(value)
      }
    }
  }

  const handleNotificationChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [category]: {
          ...prev.notifications[category],
          [key]: value
        }
      }
    }))
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    try {
      setIsUploadingPhoto(true)
      const result = await updateUserPhoto(user.uid, file)
      setPhotoURL(result.photoURL)
      toast.success('Profile photo updated successfully')
    } catch (error) {
      logger.error('Error uploading photo:', error)
      toast.error('Failed to update profile photo')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const tabs = [
    {
      id: 'profile',
      name: 'Profile Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      name: 'Notification Preferences',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'security',
      name: 'Security Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      id: 'appearance',
      name: 'Appearance',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      id: 'api',
      name: 'API Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    }
  ]

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
        </div>
      )
    }

    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <img
                  src={photoURL || '/default-avatar.png'}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-2 border-yellow-500/20"
                />
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-yellow-500/20 text-yellow-400 p-2 rounded-full cursor-pointer hover:bg-yellow-500/30 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                    {isUploadingPhoto ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-400"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </label>
                )}
              </div>
              <p className="text-gray-400 font-mono text-sm">Click the camera icon to change your profile photo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Email</label>
                <input
                  type="email"
                  defaultValue={user?.email}
                  disabled
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Role</label>
                <input
                  type="text"
                  value={userRole ? userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Loading...'}
                  disabled
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 font-mono text-sm">Time Zone</label>
                <select
                  disabled={!isEditing}
                  defaultValue="Asia/Manila"
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                >
                  <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (GMT-4)</option>
                </select>
              </div>
            </div>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Sound Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings?.notifications?.sound?.enabled ?? true}
                      onChange={(e) => handleNotificationChange('sound', 'enabled', e.target.checked)}
                      disabled={!isEditing}
                      className="form-checkbox h-5 w-5 text-yellow-400 rounded border-yellow-500/20 bg-gray-800 disabled:opacity-50"
                    />
                    <span className="text-gray-300 font-mono">Enable Notification Sounds</span>
                  </label>
                </div>
                
                {settings?.notifications?.sound?.enabled && (
                  <div className="space-y-2">
                    <label className="text-gray-400 font-mono text-sm">Sound Volume</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings?.notifications?.sound?.volume ?? 0.5}
                        onChange={(e) => handleNotificationChange('sound', 'volume', parseFloat(e.target.value))}
                        disabled={!isEditing}
                        className="flex-1 disabled:opacity-50"
                      />
                      <span className="text-gray-400 font-mono text-sm w-12 text-right">
                        {Math.round((settings?.notifications?.sound?.volume ?? 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Email Notifications</h3>
              <div className="space-y-2">
                {Object.entries(settings?.notifications?.email || {}).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange('email', key, e.target.checked)}
                      disabled={!isEditing}
                      className="form-checkbox h-5 w-5 text-yellow-400 rounded border-yellow-500/20 bg-gray-800 disabled:opacity-50"
                    />
                    <span className="text-gray-300 font-mono">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">In-App Notifications</h3>
              <div className="space-y-2">
                {Object.entries(settings?.notifications?.inApp || {}).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange('inApp', key, e.target.checked)}
                      disabled={!isEditing}
                      className="form-checkbox h-5 w-5 text-yellow-400 rounded border-yellow-500/20 bg-gray-800 disabled:opacity-50"
                    />
                    <span className="text-gray-300 font-mono">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Session Pin Code</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isPinCodeEnabled}
                    onChange={(e) => {
                      setIsPinCodeEnabled(e.target.checked)
                      if (!e.target.checked) {
                        setPinCode('')
                        setConfirmPinCode('')
                        setCurrentPinCode('')
                        setIsVerifyingPin(false)
                        setPinVerificationError('')
                      }
                    }}
                    disabled={!isEditing}
                    className="form-checkbox h-5 w-5 text-yellow-400 rounded border-yellow-500/20 bg-gray-800 disabled:opacity-50"
                  />
                  <span className="text-gray-300 font-mono">Enable Session Pin Code</span>
                </label>
                
                {isPinCodeEnabled && (
                  <div className="space-y-4">
                    {settings?.security?.pinCode && !isVerifyingPin && (
                      <div className="space-y-2">
                        <label className="text-gray-400 font-mono text-sm">Current Pin Code</label>
                        <div className="flex space-x-2">
                          <input
                            type="password"
                            value={currentPinCode}
                            onChange={(e) => setCurrentPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={!isEditing}
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                            placeholder="Enter current 6-digit pin"
                          />
                          <button
                            onClick={() => {
                              if (currentPinCode === settings.security.pinCode) {
                                setIsVerifyingPin(true)
                                setPinVerificationError('')
                              } else {
                                setPinVerificationError('Incorrect pin code')
                              }
                            }}
                            disabled={!isEditing}
                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                          >
                            Verify
                          </button>
                        </div>
                        {pinVerificationError && (
                          <p className="text-red-400 text-sm">{pinVerificationError}</p>
                        )}
                      </div>
                    )}
                    
                    {(isVerifyingPin || !settings?.security?.pinCode) && (
                      <>
                        <div className="space-y-2">
                          <label className="text-gray-400 font-mono text-sm">
                            {settings?.security?.pinCode ? 'New Pin Code' : 'Set Pin Code'} (6 digits)
                          </label>
                          <input
                            type="password"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={!isEditing}
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                            placeholder={settings?.security?.pinCode ? "Enter new 6-digit pin" : "Enter 6-digit pin"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-gray-400 font-mono text-sm">Confirm Pin Code</label>
                          <input
                            type="password"
                            value={confirmPinCode}
                            onChange={(e) => setConfirmPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={!isEditing}
                            className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                            placeholder="Confirm 6-digit pin"
                          />
                        </div>
                        {pinCode && confirmPinCode && pinCode !== confirmPinCode && (
                          <p className="text-red-400 text-sm">Pin codes do not match</p>
                        )}
                        {pinCode && confirmPinCode && pinCode === confirmPinCode && (
                          <p className="text-green-400 text-sm">Pin codes match</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 font-mono">
                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    mfaEnabled 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {mfaEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  disabled={!isEditing}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    mfaEnabled
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  } disabled:opacity-50`}
                >
                  {mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Session Management</h3>
              <button
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-mono hover:bg-red-500/30 transition-colors"
              >
                Sign Out All Other Sessions
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Password</h3>
              <button
                disabled={!isEditing}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
              >
                Change Password
              </button>
            </div>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                {['dark', 'light', 'system'].map((themeOption) => (
                  <button
                    key={themeOption}
                    disabled={!isEditing}
                    onClick={() => handleAppearanceChange('theme', themeOption)}
                    className={`p-4 rounded-lg border font-mono ${
                      settings?.appearance?.theme === themeOption
                        ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                        : 'bg-gray-800/50 border-yellow-500/20 text-gray-400'
                    } disabled:opacity-50`}
                  >
                    {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Font Size</h3>
              <div className="space-y-2">
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={settings?.appearance?.fontSize || 14}
                  onChange={(e) => handleAppearanceChange('fontSize', parseInt(e.target.value))}
                  disabled={!isEditing}
                  className="w-full disabled:opacity-50"
                />
                <div className="flex justify-between text-gray-400 font-mono text-sm">
                  <span>Small</span>
                  <span>Medium</span>
                  <span>Large</span>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'api':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">API Keys</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    value="••••••••••••••••"
                    disabled
                    className="flex-1 bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono"
                  />
                  <button
                    disabled={!isEditing}
                    className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="text-gray-500 text-sm font-mono">
                  Last generated: 30 days ago
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-gray-300 font-mono font-bold">Webhook URLs</h3>
              <div className="space-y-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook-url.com"
                  disabled={!isEditing}
                  className="w-full bg-gray-800 text-gray-300 border border-yellow-500/20 rounded-lg p-2 font-mono disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B1120] min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 font-mono">Settings</h1>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg font-mono hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-mono hover:bg-yellow-500/30 transition-colors"
            >
              Edit Settings
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Tabs */}
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-2 p-3 rounded-lg font-mono transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-gray-800/30 rounded-lg p-6 border border-yellow-500/20">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 