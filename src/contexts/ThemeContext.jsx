'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { getUserSettings } from '@/services/settings'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    const loadThemeSettings = async () => {
      if (user) {
        try {
          const settings = await getUserSettings(user.uid)
          setTheme(settings.appearance.theme)
          setFontSize(settings.appearance.fontSize)
        } catch (error) {
          console.error('Error loading theme settings:', error)
        }
      }
    }

    loadThemeSettings()
  }, [user])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark')
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.classList.add(systemTheme)
    } else {
      document.documentElement.classList.add(theme)
    }

    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [theme, fontSize])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      if (theme === 'system') {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 