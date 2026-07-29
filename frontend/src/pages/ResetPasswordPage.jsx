import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPassword } from '../api'
import AuthLayout, {
  BrandLockup, AuthCard, AuthInput, AuthButton, AuthBranding,
} from '../components/auth/AuthLayout'

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match.'); return }
    setLoading(true)
    try {
      await resetPassword({ uid, token, password })
      toast.success('Password reset! Please sign in.')
      navigate('/login')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail.join(' ') : detail || 'Reset failed. The link may have expired.')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout>
      <BrandLockup
        title="Set new password"
        subtitle="Choose a strong password for your account"
      />

      <AuthCard>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AuthInput
            label="New password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoFocus
          />
          <AuthInput
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
            error={confirm && password !== confirm}
          />
          {confirm && password !== confirm && (
            <p style={{ fontSize: 12, color: '#9C4B3E', margin: '-8px 0 0' }}>Passwords do not match.</p>
          )}
          <AuthButton loading={loading ? 'Resetting…' : false}>Reset password</AuthButton>
        </form>
      </AuthCard>

      <Link to="/login" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 13, color: '#9AABA4', textDecoration: 'none', marginTop: 20,
      }}>
        <ArrowLeft size={14} /> Back to sign in
      </Link>
      <AuthBranding />
    </AuthLayout>
  )
}
