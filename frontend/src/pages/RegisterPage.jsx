import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Activity, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { register as apiRegister, checkUsername } from '../api'
import { useAuth } from '../context/AuthContext'

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

// Only block characters that are outright invalid — never complain about length while typing
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
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-yellow-300', 'bg-green-400']
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {PW_RULES.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? colors[passed - 1] : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {PW_RULES.map(r => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.test(password)
              ? <Check size={11} className="text-green-400 shrink-0" />
              : <X size={11} className="text-gray-500 shrink-0" />}
            <span className={`text-xs ${r.test(password) ? 'text-green-400' : 'text-gray-500'}`}>{r.label}</span>
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

  // Username check state
  const [unStatus, setUnStatus] = useState(null) // null | 'checking' | 'ok' | 'format_error' | 'taken'
  const [unError, setUnError]   = useState('')
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  // Real-time username validation
  useEffect(() => {
    const value = form.username
    if (!value) { setUnStatus(null); setUnError(''); setSuggestions([]); return }

    const formatErr = validateUsernameFormat(value)
    if (formatErr) {
      setUnStatus('format_error')
      setUnError(formatErr)
      setSuggestions([])
      return
    }

    // Format is fine — debounce the server availability check
    setUnStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await checkUsername(value)
        if (data.available) {
          setUnStatus('ok')
          setUnError('')
          setSuggestions([])
        } else {
          setUnStatus('taken')
          setUnError(data.error || 'Username not available.')
          setSuggestions(data.suggestions || [])
        }
      } catch {
        setUnStatus(null)
      }
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
      const msg = data ? Object.values(data).flat().join(' ') : 'Registration failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider) => {
    // Redirect to allauth's OAuth flow — it will redirect back after auth
    window.location.href = `/api/auth/oauth/${provider}/login/?next=/oauth-success`
  }

  const inputCls = 'w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelCls = 'text-sm font-medium text-gray-300'

  const unBorderCls = form.username
    ? unStatus === 'ok'           ? 'border-green-500 focus:ring-green-500'
    : unStatus === 'taken'        ? 'border-red-500 focus:ring-red-500'
    : unStatus === 'format_error' ? 'border-yellow-500 focus:ring-yellow-500'
    : ''
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/50">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-indigo-300 text-sm mt-1">Business Health Dashboard</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {/* ── OAuth buttons ── */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {/* Google SVG */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 border border-white/20 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {/* Apple SVG */}
              <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.8 0 108.2 2.6 168.6 71.9zm-174.5-89.3c-27.5-32.5-64.7-58.1-116.9-58.1-8.3 0-16.6.6-24.9 1.9 1.3-8.3 1.9-16.6 1.9-24.9 0-71.9-30.2-147.9-86.1-197.3C343.5 24.2 296.4 0 248.2 0c-1.3 0-2.6 0-3.9.6 1.3 9.6 1.9 19.2 1.9 28.8 0 68.1-26.9 140.6-75.3 191.7-43.4 46.4-103.1 74.6-163.4 74.6 0 1.3-.6 2.6-.6 3.9 0 58.7 18.6 115.1 52.4 162.2 38.2 52.4 96.2 87.5 158.4 87.5 30.2 0 58.7-9.6 86.1-19.2 27.5-9.6 55-19.2 82.5-19.2 27.5 0 55 9.6 82.5 19.2 27.5 9.6 55 19.2 86.1 19.2 62.2 0 120.2-35.1 158.4-87.5 33.8-47.1 52.4-103.5 52.4-162.2 0-1.3-.6-2.6-.6-3.9-51.7 0-100.7-22.3-136.4-55.5z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or register with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">

            {/* ── Business ── */}
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Business</p>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Business name</label>
              <input className={inputCls} value={form.business_name} onChange={set('business_name')} placeholder="e.g. The Grand Café" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Business type</label>
              <select
                className="w-full rounded-xl bg-gray-800 border border-white/20 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.business_type}
                onChange={set('business_type')}
              >
                {BUSINESS_TYPES.map(t => (
                  <option key={t.value} value={t.value} className="bg-gray-800 text-white">{t.label}</option>
                ))}
              </select>
            </div>

            {/* ── Owner account ── */}
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider pt-2">Owner account</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>First name</label>
                <input className={inputCls} value={form.first_name} onChange={set('first_name')} placeholder="First" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Last name</label>
                <input className={inputCls} value={form.last_name} onChange={set('last_name')} placeholder="Last" />
              </div>
            </div>

            {/* Username with live check */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Username</label>
              <div className="relative">
                <input
                  className={`${inputCls} pr-10 ${unBorderCls}`}
                  value={form.username}
                  onChange={set('username')}
                  placeholder="e.g. john.doe"
                  required
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {unStatus === 'checking' && <Loader2 size={16} className="text-gray-400 animate-spin" />}
                  {unStatus === 'ok'       && <Check size={16} className="text-green-400" />}
                  {(unStatus === 'taken' || unStatus === 'format_error') && <X size={16} className="text-red-400" />}
                </div>
              </div>
              {/* Live feedback only — no static hint */}
              {unError && (
                <p className={`text-xs mt-1 ${unStatus === 'format_error' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {unError}
                </p>
              )}
              {unStatus === 'ok' && (
                <p className="text-xs mt-1 text-green-400">Username available!</p>
              )}

              {/* Suggestions when taken */}
              {unStatus === 'taken' && suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1.5">Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, username: s }))}
                        className="text-xs bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 px-3 py-1 rounded-lg transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`${inputCls} pr-11`}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Create a strong password"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Confirm password</label>
              <div className="relative">
                <input
                  type={showCpw ? 'text' : 'password'}
                  className={`${inputCls} pr-11 ${confirm && !confirmMatch ? 'border-red-500 focus:ring-red-500' : ''}`}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
                <button type="button" onClick={() => setShowCpw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showCpw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {confirm && !confirmMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !usernameOk || !passwordValid || !confirmMatch}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
