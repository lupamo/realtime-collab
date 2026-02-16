'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, teamsApi } from '@/lib/api'
import { Project } from '@/types'
import { Plus, FolderKanban, Loader2, X, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const PROJECT_COLORS = ['#1A56FF','#7C3AED','#00C781','#FF9500','#FF3B30','#0EA5E9']

export default function ProjectsPage() {
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })
  const { data: teams = [] }               = useQuery({ queryKey: ['teams'],    queryFn: teamsApi.list })

  const create = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created!'); setCreating(false) },
    onError: () => toast.error('Failed to create project'),
  })

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <p className="t-label" style={{ color: '#8A877E', marginBottom: 6 }}>Workspace</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F' }}>Projects</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FolderKanban size={26} color="#1A56FF" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0A0A0F', marginBottom: 8 }}>No projects yet</h3>
          <p style={{ color: '#8A877E', fontSize: '0.875rem', marginBottom: 24 }}>Create a project to start organizing your team&apos;s work.</p>
          <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={15} /> Create First Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          <button onClick={() => setCreating(true)}
            style={{ background: 'transparent', border: '2px dashed #E8E6DF', borderRadius: 12, padding: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A56FF'; e.currentTarget.style.background = '#EEF2FF40' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6DF'; e.currentTarget.style.background = 'transparent' }}>
            <Plus size={22} color="#C8C5BB" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8A877E' }}>New Project</span>
          </button>
        </div>
      )}

      {creating && (
        <CreateModal teams={teams} onClose={() => setCreating(false)}
          onSubmit={d => create.mutate(d)} loading={create.isPending} />
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const color = PROJECT_COLORS[project.id % PROJECT_COLORS.length]
  return (
    <Link href={`/dashboard/tasks?project_id=${project.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '22px', height: 160, display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
        {/* Color bar top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={17} color={color} />
          </div>
          <ArrowRight size={15} color="#C8C5BB" />
        </div>

        <div style={{ marginTop: 'auto' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: '#0A0A0F', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#8A877E' }}>
            Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  )
}

function CreateModal({ teams, onClose, onSubmit, loading }: {
  teams: { id: number; name: string }[]
  onClose: () => void
  onSubmit: (d: { name: string; description?: string; team_id: number }) => void
  loading: boolean
}) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id || 0)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>New Project</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSubmit({ name, description: desc || undefined, team_id: teamId }) }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Project name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign"
              required autoFocus className="input" />
          </div>
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this project about?"
              rows={2} className="input" style={{ resize: 'none' }} />
          </div>
          {teams.length > 0 && (
            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Team</label>
              <select value={teamId} onChange={e => setTeamId(Number(e.target.value))} className="input">
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {teams.length === 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#92400E' }}>
              Create a team first before creating a project.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading || !name || !teamId} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}