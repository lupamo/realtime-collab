 'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isLoading) router.replace(isAuthenticated ? '/dashboard' : '/auth/login')
  }, [isAuthenticated, isLoading, router])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E8E6DF', borderTopColor: '#1A56FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}