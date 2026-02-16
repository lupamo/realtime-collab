'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Loader2, Zap } from 'lucide-react'

const TESTIMONIAL = {
  quote: "Collab cut our sprint planning time in half. The real-time sync is just magic.",
  author: "Sarah K.", role: "Engineering Lead at Stripe"
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">

      {/* ── Left: Dark editorial panel ── */}
      <div className="auth-panel">
        {/* Background grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Accent blob */}
        <div style={{
          position: 'absolute', top: '20%', left: '-10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, #1A56FF22 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#1A56FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <span style={{ color: '#FAFAF8', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Collab</span>
        </div>

        {/* Main text */}
        <div style={{ position: 'relative' }}>
          <p style={{ color: '#8A877E', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            Real-time task management
          </p>
          <h2 style={{ color: '#FAFAF8', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 24 }}>
            Your team,<br />
            in perfect<br />
            sync.
          </h2>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[['10k+', 'Teams'], ['99.9%', 'Uptime'], ['< 50ms', 'Latency']].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ color: '#1A56FF', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ color: '#8A877E', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{ position: 'relative', borderTop: '1px solid #1E1E28', paddingTop: 28 }}>
          <p style={{ color: '#C8C5BB', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1A56FF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
              {TESTIMONIAL.author[0]}
            </div>
            <div>
              <div style={{ color: '#FAFAF8', fontSize: '0.8rem', fontWeight: 600 }}>{TESTIMONIAL.author}</div>
              <div style={{ color: '#8A877E', fontSize: '0.72rem' }}>{TESTIMONIAL.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="auth-form-side">
        <div style={{ width: '100%', maxWidth: 380 }} className="page-enter">

          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#0A0A0F', marginBottom: 8 }}>
              Sign in
            </h1>
            <p style={{ color: '#8A877E', fontSize: '0.9rem' }}>
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" style={{ color: '#1A56FF', fontWeight: 600, textDecoration: 'none' }}>
                Create one →
              </Link>
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="t-label" style={{ color: '#8A877E', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                className="input"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="t-label" style={{ color: '#8A877E' }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="input" style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#C8C5BB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="btn btn-primary" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in...</>
                : <><span>Sign in</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Demo shortcut */}
          <div style={{ marginTop: 24, padding: '14px 16px', background: '#F5F4EF', borderRadius: 10, border: '1px dashed #E8E6DF' }}>
            <p className="t-micro" style={{ color: '#8A877E', marginBottom: 8 }}>QUICK DEMO</p>
            <button onClick={() => { setEmail('demo@example.com'); setPassword('Demo123456!') }}
              style={{ fontSize: '0.8rem', color: '#1A56FF', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Fill demo credentials →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}