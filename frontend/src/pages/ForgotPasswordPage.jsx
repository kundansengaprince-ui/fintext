import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { forgotPassword } from '../api'
import AuthLayout, {
  BrandLockup, AuthCard, AuthInput, AuthButton, AuthBranding,
} from '../components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <BrandLockup
        title="Forgot password?"
        subtitle="Enter your email and we'll send you a reset link"
      />

      <AuthCard>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(14,59,46,0.08)', border: '1.5px solid rgba(14,59,46,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Mail size={22} style={{ color: '#0E3B2E' }} />
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: '#1A2420', margin: '0 0 10px' }}>
              Check your inbox
            </p>
            <p style={{ fontSize: 13.5, color: '#6B7B74', lineHeight: 1.7, margin: '0 0 20px' }}>
              If <strong style={{ color: '#1A2420' }}>{email}</strong> is registered, you'll receive a reset link shortly. Check your spam folder if you don't see it.
            </p>
            <Link to="/login" style={{ fontSize: 13, color: '#C9A15C', fontWeight: 600, textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AuthInput
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
            <AuthButton loading={loading ? 'Sending…' : false}>Send reset link</AuthButton>
          </form>
        )}
      </AuthCard>

      {!sent && (
        <Link to="/login" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 13, color: '#9AABA4', textDecoration: 'none', marginTop: 20,
        }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      )}
      <AuthBranding />
    </AuthLayout>
  )
}
