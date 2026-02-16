'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } }
})

function AuthInit() {
  const restore = useAuthStore(s => s.restoreSession)
  useEffect(() => { restore() }, [restore])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <QueryClientProvider client={qc}>
      <AuthInit />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'Syne, system-ui',
            fontSize: '13.5px',
            fontWeight: 500,
            background: '#0A0A0F',
            color: '#FAFAF8',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgb(0 0 0 / 0.2)',
          },
          success: { iconTheme: { primary: '#00C781', secondary: '#0A0A0F' } },
          error:   { iconTheme: { primary: '#FF3B30', secondary: '#0A0A0F' } },
        }}
      />
    </QueryClientProvider>
  )
}