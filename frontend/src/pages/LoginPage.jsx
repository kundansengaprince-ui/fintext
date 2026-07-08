import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

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

  const inputCls = 'w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/50">
            <Activity size={32} className="text-white" />
          </div>
          {savedBusiness ? (
            <>
              <p className="text-indigo-400 text-xs font-medium uppercase tracking-widest mb-1">Welcome back</p>
              <h1 className="text-2xl font-bold text-white text-center">{savedBusiness}</h1>
              <p className="text-gray-400 text-sm mt-1">Sign in to your dashboard</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-indigo-300 text-sm mt-1">Business Health Dashboard</p>
            </>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {idleLogout && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm rounded-xl px-4 py-3 mb-6">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              You were signed out due to inactivity.
            </div>
          )}

          {/* ── OAuth buttons ── */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl transition-colors text-sm"
            >
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
              <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.8 0 108.2 2.6 168.6 71.9zm-174.5-89.3c-27.5-32.5-64.7-58.1-116.9-58.1-8.3 0-16.6.6-24.9 1.9 1.3-8.3 1.9-16.6 1.9-24.9 0-71.9-30.2-147.9-86.1-197.3C343.5 24.2 296.4 0 248.2 0c-1.3 0-2.6 0-3.9.6 1.3 9.6 1.9 19.2 1.9 28.8 0 68.1-26.9 140.6-75.3 191.7-43.4 46.4-103.1 74.6-163.4 74.6 0 1.3-.6 2.6-.6 3.9 0 58.7 18.6 115.1 52.4 162.2 38.2 52.4 96.2 87.5 158.4 87.5 30.2 0 58.7-9.6 86.1-19.2 27.5-9.6 55-19.2 82.5-19.2 27.5 0 55 9.6 82.5 19.2 27.5 9.6 55 19.2 86.1 19.2 62.2 0 120.2-35.1 158.4-87.5 33.8-47.1 52.4-103.5 52.4-162.2 0-1.3-.6-2.6-.6-3.9-51.7 0-100.7-22.3-136.4-55.5z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or sign in with username</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                className={inputCls}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className={`${inputCls} pr-11`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </span>
                : 'Sign in'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Need access?{' '}
          <Link to="/contact" className="text-indigo-400 hover:text-indigo-300 font-medium">Request onboarding</Link>
        </p>

        {/* Branding */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <ShieldCheck size={12} className="text-gray-600" />
          <span className="text-gray-600 text-xs">
            Fintext &middot; Powered by{' '}
            <span className="text-gray-500 font-medium">Mitch Hub</span>
          </span>
        </div>
      </div>
    </div>
  )
}
