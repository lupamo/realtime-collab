'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from '@/lib/api'
import { Team } from '@/types'
import { Plus, X, Loader2, Users, Crown, Shield, User, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const ROLE_CONFIG = {
  owner:  { label: 'Owner',  icon: Crown,  color: '#FF9500', bg: '#FFF7ED' },
  admin:  { label: 'Admin',  icon: Shield, color: '#1A56FF', bg: '#EEF2FF' },
  member: { label: 'Member', icon: User,   color: '#8A877E', bg: '#F5F4EF' },
  viewer: { label: 'Viewer', icon: Eye,    color: '#C8C5BB', bg: '#F5F4EF' },
}

export default function TeamPage() {
  const [creatingTeam, setCreatingTeam]   = useState(false)
  const [addingMember, setAddingMember]   = useState<Team | null>(null)
  const qc = useQueryClient()

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  })

  const createTeam = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team created!')
      setCreatingTeam(false)
    },
    onError: () => toast.error('Failed to create team'),
  })

  const addMember = useMutation({
    mutationFn: ({ teamId, email, role }: { teamId: number; email: string; role: string }) =>
      teamsApi.addMember(teamId, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Member added!')
      setAddingMember(null)
    },
    onError: () => toast.error('Failed to add member — check the email is registered'),
  })

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <p className="t-label" style={{ color: '#8A877E', marginBottom: 6 }}>Workspace</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F' }}>
            Teams
          </h1>
        </div>
        <button onClick={() => setCreatingTeam(true)} className="btn btn-primary">
          <Plus size={16} /> New Team
        </button>
      </div>

      {/* Empty state */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Users size={26} color="#1A56FF" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0A0A0F', marginBottom: 8 }}>
            No teams yet
          </h3>
          <p style={{ color: '#8A877E', fontSize: '0.875rem', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Create a team to collaborate with others. You need a team before you can create projects.
          </p>
          <button onClick={() => setCreatingTeam(true)} className="btn btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={15} /> Create First Team
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onAddMember={() => setAddingMember(team)}
            />
          ))}
        </div>
      )}

      {/* Create team modal */}
      {creatingTeam && (
        <CreateTeamModal
          onClose={() => setCreatingTeam(false)}
          onSubmit={data => createTeam.mutate(data)}
          loading={createTeam.isPending}
        />
      )}

      {/* Add member modal */}
      {addingMember && (
        <AddMemberModal
          team={addingMember}
          onClose={() => setAddingMember(null)}
          onSubmit={(email, role) => addMember.mutate({ teamId: addingMember.id, email, role })}
          loading={addMember.isPending}
        />
      )}
    </div>
  )
}

// ── Team Card ──────────────────────────────────────────────────────────────────

function TeamCard({ team, onAddMember }: { team: Team; onAddMember: () => void }) {
  return (
    <div className="card" style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Team avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `hsl(${(team.id * 60) % 360}, 70%, 94%)`,
            color: `hsl(${(team.id * 60) % 360}, 60%, 40%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
          }}>
            {team.name.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#0A0A0F', marginBottom: 3 }}>
              {team.name}
            </h3>
            {team.description && (
              <p style={{ fontSize: '0.8rem', color: '#8A877E' }}>{team.description}</p>
            )}
            <p style={{ fontSize: '0.72rem', color: '#C8C5BB', marginTop: 2 }}>
              Created {formatDistanceToNow(new Date(team.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <button
          onClick={onAddMember}
          className="btn btn-ghost"
          style={{ fontSize: '0.8rem', padding: '7px 14px' }}
        >
          <Plus size={14} /> Add Member
        </button>
      </div>

      {/* Team ID hint */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F5F4EF', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#C8C5BB' }}>Team ID:</span>
        <code style={{ fontSize: '0.72rem', color: '#8A877E', background: '#F5F4EF', padding: '2px 6px', borderRadius: 4, fontFamily: 'DM Mono, monospace' }}>
          {team.id}
        </code>
        <span style={{ fontSize: '0.72rem', color: '#C8C5BB', marginLeft: 8 }}>
          Use this when creating projects
        </span>
      </div>
    </div>
  )
}

// ── Create Team Modal ──────────────────────────────────────────────────────────

function CreateTeamModal({ onClose, onSubmit, loading }: {
  onClose: () => void
  onSubmit: (data: { name: string; description?: string }) => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>New Team</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); onSubmit({ name, description: desc || undefined }) }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>
              Team name
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering, Design, Marketing"
              required autoFocus className="input"
            />
          </div>

          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>
              Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What does this team work on?"
              rows={2} className="input" style={{ resize: 'none' }}
            />
          </div>

          {/* Info box */}
          <div style={{ background: '#EEF2FF', border: '1px solid #1A56FF20', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#1A56FF' }}>
            💡 You&apos;ll be the owner of this team. Create projects under this team after.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Member Modal ───────────────────────────────────────────────────────────

function AddMemberModal({ team, onClose, onSubmit, loading }: {
  team: Team
  onClose: () => void
  onSubmit: (email: string, role: string) => void
  loading: boolean
}) {
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState('member')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Add Member</h2>
            <p style={{ fontSize: '0.8rem', color: '#8A877E', marginTop: 2 }}>to {team.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8C5BB', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); onSubmit(email, role) }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required autoFocus className="input"
            />
            <p style={{ fontSize: '0.72rem', color: '#C8C5BB', marginTop: 5 }}>
              They must already have a Collab account
            </p>
          </div>

          <div>
            <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 8 }}>
              Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['member', 'admin', 'viewer'] as const).map(r => {
                const cfg = ROLE_CONFIG[r]
                const Icon = cfg.icon
                const active = role === r
                return (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                      border: `1.5px solid ${active ? cfg.color : '#E8E6DF'}`,
                      background: active ? cfg.bg : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Icon size={14} color={active ? cfg.color : '#C8C5BB'} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? cfg.color : '#8A877E' }}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Role description */}
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#F5F4EF', borderRadius: 8, fontSize: '0.75rem', color: '#8A877E' }}>
              {role === 'admin'  && 'Can manage team members and all projects'}
              {role === 'member' && 'Can create and edit tasks in all projects'}
              {role === 'viewer' && 'Can view tasks but cannot make changes'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !email} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}