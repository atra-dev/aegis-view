'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/services/firebase'
import SpecialistStatistics from './SpecialistStatistics'

export default function StatisticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/signin')
        return
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) return null

  return <SpecialistStatistics />
}
