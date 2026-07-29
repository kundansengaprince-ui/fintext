import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { register as apiRegister, checkUsername } from '../api'
import { useAuth } from '../context/AuthContext'
import AuthLayout, {
  BrandLockup, AuthCard, AuthInput, AuthSelect, AuthButton,
  OAuthButtons, AuthDivider, AuthBranding, labelStyle, sectionLabel,
} from '../components/auth/AuthLayout'

const BUSINESS_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'BAR',        label: 'Bar' },
  { value: 'CAFE',       label: 'Café' },
]

const PW_RULES = [
  { label: '8+ characters',             test: (p) => p.length >= 8 },
  { label: 'Uppercase letter',          test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',          test: (p) => /[a-z]/.test(p) },
  { label: 'Number',                    test: (p) => /\d/.test(p) },
  { label: 'Special character (!@#$…)', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(p) },
]

function validateUsernameFormat(value) {
  if (!value) return null
  if (value.length > 30) return 'Maximum 30 characters.'
  if (!/^[a-zA-Z0-9._]+$/.test(value)) return 'Only letters, numbers, . and _ allowed.'
  if (value.startsWith('.') || value.endsWith('.')) return 'Cannot start or end with a period.'
  if (value.includes('..')) return 'Cannot contain consecutive periods.'
  return null
}

function PasswordStrength({ password }) {
  if (!password) return null
  const passed = PW_RULES.filter(r => r.test(password)).length
  const colors = ['#9C4B3E', '#C9A15C', '#C9A15C', '#5A8A76', '#0E3B2E']
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {PW_RULES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < passed ? colors[passed - 1] : '#E8EDEB',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {PW_RULES.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {r.test(password)
              ? <Check size={10} style={{ color: '#0E3B2E', flexShrink: 0 }} />
              : <X size={10} style={{ color: '#9AABA4', flexShrink: 0 }} />}
            <span style={{ fontSize: 11.5, color: r.test(password) ? '#0E3B2E' : '#9AABA4' }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [form, setForm] = useState({
    business_name: '', business_type: 'RESTAURANT',
    first_name: '', last_name: '', username: '', email: '', password: '',
  })
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCpw, setShowCpw]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [unStatus, setUnStatus] = useState(null)
  const [unError, setUnError]   = useState('')
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    const value = form.username
    if (!value) { setUnStatus(null); setUnError(''); setSuggestions([]); return }
    const formatErr = validateUsernameFormat(value)
    if (formatErr) { setUnStatus('format_error'); setUnError(formatErr); setSuggestions([]); return }
    setUnStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await checkUsername(value)
        if (data.available) { setUnStatus('ok'); setUnError(''); setSuggestions([]) }
        else { setUnStatus('taken'); setUnError(data.error || 'Username not available.'); setSuggestions(data.suggestions || []) }
      } catch { setUnStatus(null) }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [form.username])

  const passwordValid = PW_RULES.every(r => r.test(form.password))
  const confirmMatch  = form.password === confirm
  const usernameOk    = unStatus === 'ok'

  const submit = async (e) => {
    e.preventDefault()
    if (!usernameOk)    { toast.error('Please choose a valid, available username.'); return }
    if (!passwordValid) { toast.error('Password does not meet requirements.'); return }
    if (!confirmMatch)  { toast.error('Passwords do not match.'); return }
    setLoading(true)
    try {
      await apiRegister(form)
      await signIn({ username: form.username, password: form.password })
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Registration failed.')
    } finally { setLoading(false) }
  }

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}/login/?next=/oauth-success`
  }

  return (
    <AuthLayout>
      <BrandLockup title="Create your account" subtitle="Business health dashboard" />

      <AuthCard maxWidth={500}>
        <OAuthButtons onGoogle={() => handleOAuth('google')} onApple={() => handleOAuth('apple')} />
        <AuthDivider label="or register with email" />

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={sectionLabel}>Your business</p>

          <AuthInput label="Business name" value={form.business_name} onChange={set('business_name')} placeholder="e.g. The Grand Café" required />
          <AuthSelect label="Business type" value={form.business_type} onChange={set('business_type')}>
            {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </AuthSelect>

          <p style={{ ...sectionLabel, marginTop: 6 }}>Owner account</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <AuthInput label="First name" value={form.first_name} onChange={set('first_name')} placeholder="First" required />
            <AuthInput label="Last name"  value={form.last_name}  onChange={set('last_name')}  placeholder="Last" />
          </div>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={labelStyle}>Username</label>
            <AuthInput
              value={form.username} onChange={set('username')}
              placeholder="e.g. john.doe" required autoComplete="off"
              error={unStatus === 'taken' || unStatus === 'format_error'}
              success={unStatus === 'ok'}
              rightSlot={
                unStatus === 'checking' ? <Loader2 size={15} style={{ color: '#9AABA4', animation: 'spin 1s linear infinite' }} /> :
                unStatus === 'ok'       ? <Check size={15} style={{ color: '#0E3B2E' }} /> :
                (unStatus === 'taken' || unStatus === 'format_error') ? <X size={15} style={{ color: '#9C4B3E' }} /> : null
              }
            />
            {unError && <p style={{ fontSize: 12, color: unStatus === 'format_error' ? '#C9A15C' : '#9C4B3E', margin: '2px 0 0' }}>{unError}</p>}
            {unStatus === 'ok' && <p style={{ fontSize: 12, color: '#0E3B2E', margin: '2px 0 0' }}>Username available!</p>}
            {unStatus === 'taken' && suggestions.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <p style={{ fontSize: 12, color: '#9AABA4', marginBottom: 6 }}>Try one of these:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {suggestions.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, username: s }))}
                      style={{ fontSize: 12, background: 'rgba(14,59,46,0.06)', border: '1px solid rgba(14,59,46,0.15)', color: '#0E3B2E', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AuthInput label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={labelStyle}>Password</label>
            <AuthInput
              type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              placeholder="Create a strong password" required
              rightSlot={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AABA4', display: 'flex', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirm */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={labelStyle}>Confirm password</label>
            <AuthInput
              type={showCpw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password" required
              error={confirm && !confirmMatch}
              rightSlot={
                <button type="button" onClick={() => setShowCpw(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AABA4', display: 'flex', padding: 0 }}>
                  {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            {confirm && !confirmMatch && <p style={{ fontSize: 12, color: '#9C4B3E', margin: '2px 0 0' }}>Passwords do not match.</p>}
          </div>

          <div style={{ marginTop: 4 }}>
            <AuthButton loading={loading ? 'Creating account…' : false} disabled={!usernameOk || !passwordValid || !confirmMatch}>
              Create account
            </AuthButton>
          </div>
        </form>
      </AuthCard>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#9AABA4', margin: '20px 0 0' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#C9A15C', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
      </p>
      <AuthBranding />
    </AuthLayout>
  )
}
