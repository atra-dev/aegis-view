'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, firedb } from '@/services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [userStatus, setUserStatus] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user role and status from Firestore
        const userDoc = await getDoc(doc(firedb, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserRole(userData.role)
          setUserStatus(userData.status)
        }
        setUser(user)
      } else {
        setUser(null)
        setUserRole(null)
        setUserStatus(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = {
    user,
    userRole,
    userStatus,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 