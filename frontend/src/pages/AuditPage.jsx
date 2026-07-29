import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import api from '../api/client'
import { ShieldCheck, LogIn, LogOut, Plus, Pencil, Trash2, Activity, Search, X } from 'lucide-react'

const ACTION_META = {
  CREATE:  { icon: Plus,     label: 'Created',        color: '#0E3B2E', bg: 'rgba(14,59,46,0.08)'  },
  UPDATE:  { icon: Pencil,   label: 'Updated',        color: '#7A9184', bg: 'rgba(122,145,132,0.1)' },
  DELETE:  { icon: Trash2,   label: 'Deleted',        color: '#9C4B3E', bg: 'rgba(156,75,62,0.08)'  },
  LOGIN:   { icon: LogIn,    label: 'Logged In',      color: '#0E3B2E', bg: 'rgba(14,59,46,0.08)'  },
  LOGOUT:  { icon: LogOut,   label: 'Logged Out',     color: '#7A9184', bg: 'rgba(122,145,132,0.1)' },
  COMPUTE: { icon: Activity, label: 'Computed Score', color: '#8A6A2E', bg: 'rgba(201,161,92,0.1)'  },
}

const MODULES = ['All', 'Auth', 'Sales', 'Expenses', 'Inventory', 'Customers', 'Dashboard', 'Team']
const ACTIONS = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'COMPUTE']

function fmt(ts) {
  return new Date(ts).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AuditPage() {
  const [module, setModule] = useState('All')
  const [action, setAction] = useState('All')
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const params = {
    page,
    ...(module !== 'All' && { module }),
    ...(action !== 'All' && { action }),
    ...(search            && { search }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => api.get('/audit/', { params }).then(r => r.data),
    keepPreviousData: true,
  })

  const logs    = data?.results ?? []
  const total   = data?.count ?? 0
  const hasNext = !!data?.next
  const hasPrev = !!data?.previous

  const filterBtn = (val, current) => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.1s', border: 'none',
    background: val === current ? '#0E3B2E' : '#FAFBF9',
    color: val === current ? '#fff' : '#7A9184',
    outline: val === current ? 'none' : '1px solid #E2E9E5',
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} style={{ color: '#0E3B2E' }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Audit Log</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: '#7A9184' }}>
          Every action taken in the system — who did what and when.
        </p>
      </div>

      <Card>
        <div className="px-6 pt-4 pb-3" style={{ borderBottom: '1px solid #E2E9E5' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B7C4BC' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user or action detail…"
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E3B2E]"
              style={{ border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#B7C4BC' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E2E9E5' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A9184' }}>Filter by Module</p>
          <div className="flex flex-wrap gap-2">
            {MODULES.map(m => (
              <button key={m} style={filterBtn(m, module)} onClick={() => { setModule(m); setPage(1) }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A9184' }}>Filter by Action</p>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(a => (
              <button key={a} style={filterBtn(a, action)} onClick={() => { setAction(a); setPage(1) }}>{a}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E2E9E5' }}>
          <p className="text-sm font-semibold" style={{ color: '#0A2820' }}>
            {total} event{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={!hasPrev}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}>
              ← Prev
            </button>
            <span className="text-xs" style={{ color: '#B7C4BC' }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasNext}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}>
              Next →
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm" style={{ color: '#B7C4BC' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck size={36} className="mx-auto mb-3" style={{ color: '#E2E9E5' }} />
            <p className="text-sm" style={{ color: '#B7C4BC' }}>No audit events found.</p>
          </div>
        ) : (
          <div>
            {logs.map((log, idx) => {
              const meta = ACTION_META[log.action] ?? ACTION_META.CREATE
              const Icon = meta.icon
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 transition-colors"
                  style={idx > 0 ? { borderTop: '1px solid #E2E9E5' } : {}}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#0A2820' }}>{log.user_display}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}>
                        {log.action_display}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}>
                        {log.module}
                      </span>
                    </div>
                    {log.detail && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: '#7A9184' }}>{log.detail}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: '#7A9184' }}>{fmt(log.timestamp)}</p>
                    {log.ip_address && (
                      <p className="text-xs mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#B7C4BC' }}>
                        {log.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
