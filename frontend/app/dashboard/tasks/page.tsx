'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { tasksApi, projectsApi, teamsApi } from '@/lib/api'
import { Task, TaskStatus, TaskPriority, TASK_PRIORITY_CONFIG, TASK_STATUS_CONFIG, KANBAN_COLS } from '@/types'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/store/auth'

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#8A877E', in_progress: '#1A56FF', in_review: '#7C3AED', done: '#00C781', archived: '#C8C5BB'
}

export default function TasksPage() {
  const params = useSearchParams()
  const projectId = params.get('project_id') ? Number(params.get('project_id')) : undefined
  const [creating, setCreating] = useState(false)
  const [selectedTask, setSelected] = useState<Task | null>(null)
  const qc = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', { project_id: projectId }],
    queryFn: () => tasksApi.list({ project_id: projectId }),
  })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })
  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.list })
  
  // Fetch all team members for all teams
  const teamIds = teams.map(t => t.id)
  const { data: allMembers = [] } = useQuery({
    queryKey: ['team-members', teamIds],
    queryFn: async () => {
      const memberPromises = teamIds.map(id => 
        teamsApi.getMembers(id).catch(() => [])
      )
      const results = await Promise.all(memberPromises)
      return teamIds.reduce((acc, id, index) => {
        acc[id] = results[index]
        return acc
      }, {} as Record<number, { user_id: number; role: string; user: { id: number; email: string; full_name: string | null } }[]>)
    },
    enabled: teamIds.length > 0,
  })

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task created!'); setCreating(false) },
    onError: () => toast.error('Failed to create task'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tasksApi.update>[1] }) => tasksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => toast.error('Update failed'),
  })

  const byStatus = KANBAN_COLS.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const projectName = projectId ? projects.find(p => p.id === projectId)?.name : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '28px 40px 20px', borderBottom: '1px solid #E8E6DF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
        <div>
          {projectName && <p className="t-label" style={{ color: '#8A877E', marginBottom: 4 }}>{projectName}</p>}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0F' }}>
            {projectName ? 'Board' : 'All Tasks'}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', color: '#8A877E', fontWeight: 500 }}>
            {tasks.filter(t => t.status !== 'archived').length} tasks
          </span>
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Loader2 size={24} color="#C8C5BB" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', padding: '24px 40px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {KANBAN_COLS.map(status => (
            <KanbanCol key={status} status={status} tasks={byStatus[status] || []} onTaskClick={setSelected} />
          ))}
        </div>
      )}

      {creating && (
        <CreateModal
          projects={projects}
          teams={teams}
          allMembers={allMembers}
          defaultProjectId={projectId}
          onClose={() => setCreating(false)}
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelected(null)}
          onStatusChange={s => {
            updateMutation.mutate({ id: selectedTask.id, data: { status: s, version: selectedTask.version } })
            setSelected({ ...selectedTask, status: s })
          }}
        />
      )}
    </div>
  )
}

function KanbanCol({ status, tasks, onTaskClick }: {
  status: TaskStatus; tasks: Task[]; onTaskClick: (t: Task) => void
}) {
  const color = STATUS_COLORS[status]
  const cfg = TASK_STATUS_CONFIG[status]
  return (
    <div className="kanban-col" style={{ minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '2px solid', borderColor: color + '30' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A877E', flex: 1 }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: color, background: color + '18', padding: '2px 7px', borderRadius: 99 }}>
          {tasks.length}
        </span>
      </div>
      {tasks.map(t => (
        <TaskCardItem key={t.id} task={t} onClick={() => onTaskClick(t)} />
      ))}
    </div>
  )
}

function TaskCardItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const pr = TASK_PRIORITY_CONFIG[task.priority]
  return (
    <div className="task-card" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: pr.dot, flexShrink: 0 }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: pr.color }}>{pr.label}</span>
      </div>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.35, marginBottom: 10 }}>{task.title}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.7rem', color: '#C8C5BB' }}>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
        {task.assignee && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #1A56FF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
            {(task.assignee.full_name || task.assignee.email).slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateModal({ projects, teams, allMembers, defaultProjectId, onClose, onSubmit, loading }: {
  projects: { id: number; name: string; team_id: number }[]
  teams: { id: number; name: string }[]
  allMembers: Record<number, { user_id: number; role: string; user: { id: number; email: string; full_name: string | null } }[]>
  defaultProjectId?: number; onClose: () => void; onSubmit: (d: Parameters<typeof tasksApi.create>[0]) => void; loading: boolean
}) {
  const user = useAuthStore(s => s.user)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || 0)
  const [assignedTo, setAssignedTo] = useState<number | null>(null)

  // Get team members for selected project
  const selectedProject = projects.find(p => p.id === projectId)
  const selectedTeam = teams.find(t => t.id === selectedProject?.team_id)
  const teamMembers = selectedProject?.team_id ? (allMembers[selectedProject.team_id] || []).map(m => m.user) : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>New Task</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault()
          if (!projectId) { toast.error('Select a project'); return }
          onSubmit({ title, description: desc || undefined, priority, project_id: projectId, assigned_to: assignedTo || undefined })
        }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" required autoFocus className="input" />
          </div>
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add details..." rows={2} className="input" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="input">
                {(['low','medium','high','urgent'] as TaskPriority[]).map(p => (<option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>))}
              </select>
            </div>
            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Project</label>
              <select value={projectId} onChange={e => setProjectId(Number(e.target.value))} className="input">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          
          {/* Assign to team member dropdown */}
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>
              Assign to <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <select value={assignedTo || ''} onChange={e => setAssignedTo(e.target.value ? Number(e.target.value) : null)} className="input">
              <option value="">Unassigned</option>
              {user && <option value={user.id}>👤 Me ({user.full_name || user.email})</option>}
              {teamMembers.filter(m => m.id !== user?.id).map(member => (
                <option key={member.id} value={member.id}>{member.full_name || member.email}</option>
              ))}
            </select>
            {teamMembers.length === 0 && (
              <p style={{ fontSize: '0.72rem', color: '#C8C5BB', marginTop: 5 }}>
                No team members. Add members to {selectedTeam?.name || 'your team'} first.
              </p>
            )}
          </div>

          {projects.length === 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#92400E' }}>Create a project first.</div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading || !title || !projectId} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskDetail({ task, onClose, onStatusChange }: {
  task: Task; onClose: () => void; onStatusChange: (s: TaskStatus) => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A877E' }}>Task #{task.id}</span>
            <span className="badge" style={{ background: TASK_PRIORITY_CONFIG[task.priority].bg, color: TASK_PRIORITY_CONFIG[task.priority].color }}>
              {TASK_PRIORITY_CONFIG[task.priority].label}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0F', marginBottom: 10, lineHeight: 1.2 }}>{task.title}</h2>
        {task.description && (<p style={{ fontSize: '0.875rem', color: '#8A877E', lineHeight: 1.65, marginBottom: 20 }}>{task.description}</p>)}
        <div style={{ marginBottom: 20 }}>
          <p className="t-label" style={{ color: '#8A877E', marginBottom: 10 }}>Status</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KANBAN_COLS.map(s => {
              const active = task.status === s
              const c = STATUS_COLORS[s]
              return (
                <button key={s} onClick={() => onStatusChange(s)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${active ? c : '#E8E6DF'}`, background: active ? c + '18' : 'transparent', color: active ? c : '#8A877E', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {TASK_STATUS_CONFIG[s].label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #F5F4EF', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Created', formatDistanceToNow(new Date(task.created_at), { addSuffix: true })],
            ['Updated', formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })],
            ['Version', `v${task.version}`],
            task.assignee ? ['Assigned to', task.assignee.full_name || task.assignee.email] : null,
          ].filter((row): row is string[] => row !== null).map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#C8C5BB', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: '#8A877E', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}