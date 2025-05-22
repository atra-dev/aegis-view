'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRouter } from 'next/navigation'
import { CreateMultiFactorAuthentication } from '@/components/CreateMultiFactorAuthentication'
import { Loading } from '@/components/Loading'

export default function MFAPage() {
    const currentUser = useCurrentUser()
    const router = useRouter()

    if (currentUser === 'loading') {
        return <Loading />
    }

    if (!currentUser) {
        router.push('/auth/signin')
        return null
    }

    return <CreateMultiFactorAuthentication currentUser={currentUser} />
} 