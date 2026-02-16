'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Loader2, Zap, Check } from 'lucide-react'

const FEATURES = [
  'Real-time collaboration with your team',
  'Kanban boards & task management',
  'WebSocket-powered live updates',
  'Role-based access control',
]

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const router = useRouter()

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 4 : 3
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#FF3B30', '#FF9500', '#00C781', '#00C781']

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(email, password, fullName)
      toast.success('Account created! Welcome 🎉')
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error?.response?.data?.detail || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">

      {/* ── Left: dark panel ── */}
      <div className="auth-panel">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '-15%', width: 350, height: 350, background: 'radial-gradient(circle, #7C3AED22 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#1A56FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <span style={{ color: '#FAFAF8', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Collab</span>
        </div>

        <div style={{ position: 'relative' }}>
          <h2 style={{ color: '#FAFAF8', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 32 }}>
            Everything your<br />team needs.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C78118', border: '1px solid #00C78140', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} color="#00C781" strokeWidth={3} />
                </div>
                <span style={{ color: '#C8C5BB', fontSize: '0.875rem' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', borderTop: '1px solid #1E1E28', paddingTop: 24 }}>
          <p style={{ color: '#8A877E', fontSize: '0.8rem' }}>
            Free to start — no credit card required.
          </p>
        </div>
      </div>

      {/* ── Right: register form ── */}
      <div className="auth-form-side">
        <div style={{ width: '100%', maxWidth: 380 }} className="page-enter">

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F', marginBottom: 8 }}>
              Create account
            </h1>
            <p style={{ color: '#8A877E', fontSize: '0.9rem' }}>
              Already have one?{' '}
              <Link href="/auth/login" style={{ color: '#1A56FF', fontWeight: 600, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="John Doe" autoFocus className="input" />
            </div>

            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="input" />
            </div>

            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters" required minLength={8}
                  className="input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#C8C5BB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= pwStrength ? strengthColor[pwStrength] : '#E8E6DF', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: strengthColor[pwStrength], minWidth: 40 }}>
                    {strengthLabel[pwStrength]}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="btn btn-primary" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating account...</>
                : <><span>Create account</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: '0.75rem', color: '#C8C5BB', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}