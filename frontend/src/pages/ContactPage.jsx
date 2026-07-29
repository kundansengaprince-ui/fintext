import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { submitClientRequest } from '../api'
import AuthLayout, {
  BrandLockup, AuthCard, AuthInput, AuthSelect, AuthTextarea,
  AuthButton, AuthBranding, sectionLabel,
} from '../components/auth/AuthLayout'

const BUSINESS_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'BAR',        label: 'Bar' },
  { value: 'CAFE',       label: 'Café' },
]

export default function ContactPage() {
  const [form, setForm] = useState({
    business_name: '', business_type: 'RESTAURANT',
    contact_name: '', email: '', phone: '', location: '', message: '',
  })
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await submitClientRequest(form)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout>
      <BrandLockup
        title="Get your business on FinText"
        subtitle="Fill in your details and our team will reach out to onboard you"
      />

      <AuthCard maxWidth={500}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(14,59,46,0.08)', border: '1.5px solid rgba(14,59,46,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle size={22} style={{ color: '#0E3B2E' }} />
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: '#1A2420', margin: '0 0 10px' }}>
              Request received!
            </p>
            <p style={{ fontSize: 13.5, color: '#6B7B74', lineHeight: 1.7, margin: '0 0 20px' }}>
              Thanks <strong style={{ color: '#1A2420' }}>{form.contact_name}</strong>. Our team will review your request and contact you at{' '}
              <strong style={{ color: '#1A2420' }}>{form.email}</strong> within 1–2 business days.
            </p>
            <Link to="/login" style={{ fontSize: 13, color: '#C9A15C', fontWeight: 600, textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={sectionLabel}>Your business</p>

            <AuthInput label="Business name" value={form.business_name} onChange={set('business_name')} placeholder="e.g. The Grand Café" required />
            <AuthSelect label="Business type" value={form.business_type} onChange={set('business_type')}>
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </AuthSelect>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AuthInput label="Location" value={form.location} onChange={set('location')} placeholder="City, Country" />
              <AuthInput label="Phone" value={form.phone} onChange={set('phone')} placeholder="+250 7xx xxx xxx" />
            </div>

            <p style={{ ...sectionLabel, marginTop: 6 }}>Contact person</p>

            <AuthInput label="Your name" value={form.contact_name} onChange={set('contact_name')} placeholder="Full name" required />
            <AuthInput label="Email address" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            <AuthTextarea
              label={<>Message <span style={{ color: '#9AABA4', fontWeight: 400 }}>(optional)</span></>}
              rows={3}
              value={form.message}
              onChange={set('message')}
              placeholder="Tell us a bit about your business and what you're looking for…"
            />

            <div style={{ marginTop: 4 }}>
              <AuthButton loading={loading ? 'Submitting…' : false}>Submit request</AuthButton>
            </div>
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
