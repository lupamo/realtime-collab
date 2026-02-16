'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Settings, LogOut, Zap } from 'lucide-react'

const NAV = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/projects', icon: FolderKanban,    label: 'Projects' },
  { href: '/dashboard/tasks',    icon: CheckSquare,     label: 'My Tasks' },
  { href: '/dashboard/team',     icon: Users,           label: 'Team' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuthStore()
  const router  = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #E8E6DF', borderTopColor: '#1A56FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!isAuthenticated) return null

  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E8E6DF', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>

        {/* Logo */}
        <div style={{ height: 58, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderBottom: '1px solid #F5F4EF' }}>
          <div style={{ width: 30, height: 30, background: '#1A56FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.03em', color: '#0A0A0F' }}>Collab</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A56FF', background: '#EEF2FF', padding: '2px 6px', borderRadius: 4 }}>BETA</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F5F4EF' }}>
            <Link href="/dashboard/settings" className="nav-item">
              <Settings size={16} /> Settings
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 14px', borderTop: '1px solid #F5F4EF', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1A56FF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0A0A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#8A877E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
          <button onClick={async () => { await logout(); router.push('/auth/login') }}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FF3B30')}
            onMouseLeave={e => (e.currentTarget.style.color = '#C8C5BB')}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div className="page-enter">{children}</div>
      </main>
    </div>
  )
}