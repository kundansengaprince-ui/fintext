import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { submitClientRequest } from '../api'

const BUSINESS_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'BAR',        label: 'Bar' },
  { value: 'CAFE',       label: 'Café' },
]

const inputCls = 'w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'text-sm font-medium text-gray-300'

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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/50">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Get your business on Fintext</h1>
          <p className="text-indigo-300 text-sm mt-1 text-center">
            Fill in your details and our team will reach out to onboard you
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <p className="text-white font-semibold text-lg">Request received!</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Thanks <span className="text-white">{form.contact_name}</span>. Our team will review your request and contact you at{' '}
                <span className="text-white">{form.email}</span> within 1–2 business days.
              </p>
              <Link to="/login" className="inline-block mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Your business</p>

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
                    <option key={t.value} value={t.value} className="bg-gray-800">{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Location</label>
                  <input className={inputCls} value={form.location} onChange={set('location')} placeholder="City, Country" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+250 7xx xxx xxx" />
                </div>
              </div>

              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider pt-2">Contact person</p>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Your name</label>
                <input className={inputCls} value={form.contact_name} onChange={set('contact_name')} placeholder="Full name" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Email address</label>
                <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Message <span className="text-gray-500 font-normal">(optional)</span></label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Tell us a bit about your business and what you're looking for…"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Submitting…
                    </span>
                  : 'Submit request'
                }
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-sm mt-6 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  )
}
