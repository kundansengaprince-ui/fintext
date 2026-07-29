import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout, {
  BrandLockup, AuthCard, AuthInput, AuthButton,
  OAuthButtons, AuthDivider, AuthFooter, AuthBranding,
} from '../components/auth/AuthLayout'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const savedBusiness = (() => {
    try { return JSON.parse(localStorage.getItem('business'))?.name || null } catch { return null }
  })()
  const idleLogout = localStorage.getItem('logout_reason') === 'idle'
  if (idleLogout) localStorage.removeItem('logout_reason')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(form)
      navigate('/')
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        toast.error('Too many attempts. Please wait a minute and try again.')
      } else {
        toast.error('Invalid username or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}/login/?next=/oauth-success`
  }

  return (
    <AuthLayout>
      <BrandLockup
        title={savedBusiness ? `Welcome back` : 'Welcome back'}
        subtitle={savedBusiness ? savedBusiness : 'Business health dashboard'}
      />

      <AuthCard>
        {/* Idle logout warning */}
        {idleLogout && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#FEF9EC', border: '1px solid #F0D98A',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#7A5C1E',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            You were signed out due to inactivity.
          </div>
        )}

        <OAuthButtons onGoogle={() => handleOAuth('google')} onApple={() => handleOAuth('apple')} />
        <AuthDivider label="or sign in with username" />

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AuthInput
            label="Username"
            type="text"
            value={form.username}
            onChange={set('username')}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#3D4F47' }}>Password</span>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                style={{ fontSize: 13, color: '#C9A15C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
              >
                Forgot password?
              </button>
            </div>
            <AuthInput
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              rightSlot={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AABA4', display: 'flex', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          <div style={{ marginTop: 4 }}>
            <AuthButton loading={loading ? 'Signing in…' : false}>Sign in</AuthButton>
          </div>
        </form>
      </AuthCard>

      <AuthFooter
        linkTo="/contact"
        preText="Need access?"
        linkLabel="Request onboarding"
      />
      <AuthBranding />
    </AuthLayout>
  )
}
