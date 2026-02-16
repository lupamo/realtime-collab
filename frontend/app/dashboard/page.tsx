'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { tasksApi, projectsApi } from '@/lib/api'
import { Task, TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG } from '@/types'
import { CheckSquare, FolderKanban, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)

  const { data: tasks = [] }    = useQuery({ queryKey: ['tasks'],    queryFn: () => tasksApi.list() })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const urgent     = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length

  const recent = [...tasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F', marginBottom: 6 }}>
          {greeting}, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: '#8A877E', fontSize: '0.9rem' }}>
          Here&apos;s a snapshot of your workspace today.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'Total Tasks',  value: total,      icon: <CheckSquare size={18} />,  accent: '#1A56FF', bg: '#EEF2FF' },
          { label: 'In Progress',  value: inProgress,  icon: <TrendingUp size={18} />,   accent: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Completed',    value: done,        icon: <CheckSquare size={18} />,  accent: '#00C781', bg: '#F0FDF9' },
          { label: 'Urgent',       value: urgent,      icon: <Clock size={18} />,        accent: '#FF3B30', bg: '#FFF5F5' },
        ].map(({ label, value, icon, accent, bg }) => (
          <div key={label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {icon}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: '#8A877E', marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>

        {/* Recent tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#0A0A0F' }}>Recent activity</h2>
            <Link href="/dashboard/tasks" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#1A56FF', fontWeight: 600, textDecoration: 'none' }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>

          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {recent.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <CheckSquare size={32} color="#E8E6DF" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#8A877E', fontSize: '0.875rem' }}>No tasks yet</p>
                <Link href="/dashboard/tasks" style={{ color: '#1A56FF', fontSize: '0.8rem', fontWeight: 600 }}>Create your first task →</Link>
              </div>
            ) : (
              recent.map((task, i) => <TaskRow key={task.id} task={task} last={i === recent.length - 1} />)
            )}
          </div>
        </div>

        {/* Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#0A0A0F' }}>Projects</h2>
            <Link href="/dashboard/projects" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#1A56FF', fontWeight: 600, textDecoration: 'none' }}>
              All <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.length === 0 ? (
              <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
                <FolderKanban size={28} color="#E8E6DF" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#8A877E', fontSize: '0.8rem' }}>No projects yet</p>
                <Link href="/dashboard/projects" style={{ color: '#1A56FF', fontSize: '0.78rem', fontWeight: 600 }}>Create one →</Link>
              </div>
            ) : (
              projects.slice(0, 4).map(p => {
                const pt = tasks.filter(t => t.project_id === p.id)
                const pct = pt.length ? Math.round(pt.filter(t => t.status === 'done').length / pt.length * 100) : 0
                const colors = ['#1A56FF','#7C3AED','#00C781','#FF9500','#FF3B30']
                const c = colors[p.id % colors.length]
                return (
                  <Link key={p.id} href={`/dashboard/tasks?project_id=${p.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ padding: '14px 16px' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#1A56FF40')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#E8E6DF')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0A0A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: '0.72rem', color: '#8A877E', flexShrink: 0 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: '#F5F4EF', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#8A877E' }}>{pt.length} tasks</div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, last }: { task: Task; last: boolean }) {
  const st = TASK_STATUS_CONFIG[task.status]
  const pr = TASK_PRIORITY_CONFIG[task.priority]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: last ? 'none' : '1px solid #F5F4EF', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: pr.dot === 'bg-mist' ? '#C8C5BB' : pr.dot === 'bg-warn' ? '#FF9500' : pr.dot === 'bg-punch animate-pulse' || pr.dot === 'bg-punch' ? '#FF3B30' : '#C8C5BB', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0A0A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <div style={{ fontSize: '0.72rem', color: '#8A877E', marginTop: 1 }}>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</div>
      </div>
      <span className="badge" style={{ background: st.bg === 'bg-sand' ? '#F5F4EF' : st.bg === 'bg-accent-light' ? '#EEF2FF' : st.bg === 'bg-violet/10' ? '#F5F3FF' : '#F0FDF9', color: st.color === 'text-smoke' ? '#8A877E' : st.color === 'text-accent' ? '#1A56FF' : st.color === 'text-violet' ? '#7C3AED' : '#00C781', flexShrink: 0 }}>
        {st.label}
      </span>
    </div>
  )
}