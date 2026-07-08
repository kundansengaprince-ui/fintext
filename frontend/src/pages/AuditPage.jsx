import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import api from '../api/client'
import { ShieldCheck, LogIn, LogOut, Plus, Pencil, Trash2, Activity, Search, X } from 'lucide-react'

const ACTION_META = {
  CREATE:  { icon: Plus,        color: 'bg-emerald-50 text-emerald-600', label: 'Created'       },
  UPDATE:  { icon: Pencil,      color: 'bg-blue-50 text-blue-600',       label: 'Updated'       },
  DELETE:  { icon: Trash2,      color: 'bg-red-50 text-red-600',         label: 'Deleted'       },
  LOGIN:   { icon: LogIn,       color: 'bg-indigo-50 text-indigo-600',   label: 'Logged In'     },
  LOGOUT:  { icon: LogOut,      color: 'bg-gray-100 text-gray-500',      label: 'Logged Out'    },
  COMPUTE: { icon: Activity,    color: 'bg-purple-50 text-purple-600',   label: 'Computed Score'},
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

  const filterBtn = (val, current) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
      val === current
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
    }`

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Every action taken in the system — who did what and when.
        </p>
      </div>

      {/* Search + Filters */}
      <Card>
        {/* Search bar */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user or action detail…"
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Module</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {MODULES.map(m => (
              <button key={m} className={filterBtn(m, module)}
                onClick={() => { setModule(m); setPage(1) }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Action</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {ACTIONS.map(a => (
              <button key={a} className={filterBtn(a, action)}
                onClick={() => { setAction(a); setPage(1) }}>{a}</button>
            ))}
          </div>
        </div>
      </Card>

      {/* Log table */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">
            {total} event{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={!hasPrev}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors">
              ← Prev
            </button>
            <span className="text-xs text-gray-400">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasNext}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors">
              Next →
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No audit events found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const meta = ACTION_META[log.action] ?? ACTION_META.CREATE
              const Icon = meta.icon
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Action icon */}
                  <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={14} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{log.user_display}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                        {log.action_display}
                      </span>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {log.module}
                      </span>
                    </div>
                    {log.detail && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{log.detail}</p>
                    )}
                  </div>

                  {/* Timestamp + IP */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{fmt(log.timestamp)}</p>
                    {log.ip_address && (
                      <p className="text-xs text-gray-300 mt-0.5 font-mono">{log.ip_address}</p>
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
