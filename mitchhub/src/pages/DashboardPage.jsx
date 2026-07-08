import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, CheckCircle, Clock, XCircle, Eye, RefreshCw, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMitchHubDashboard, updateClientRequest } from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  PENDING:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  REVIEWED:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ONBOARDED: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED:  'bg-red-500/20 text-red-400 border-red-500/30',
}

const TYPE_COLORS = {
  RESTAURANT: 'bg-orange-500/20 text-orange-400',
  BAR:        'bg-purple-500/20 text-purple-400',
  CAFE:       'bg-amber-500/20 text-amber-400',
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-gray-400 text-sm">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate          = useNavigate()
  const qc                = useQueryClient()
  const [tab, setTab]     = useState('clients')
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['mitch-hub'],
    queryFn: () => getMitchHubDashboard().then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => updateClientRequest(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['mitch-hub']); toast.success('Status updated.') },
    onError:   () => toast.error('Failed to update.'),
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const { total_clients, active_clients, pending_requests, clients = [], requests = [] } = data || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Mitch Hub Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Signed in as <span className="text-violet-400">{user?.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => qc.invalidateQueries(['mitch-hub'])}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 bg-white/5 border border-white/10 px-4 py-2 rounded-xl transition-colors"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Building2}   label="Total clients"    value={total_clients}    color="bg-violet-500/20 text-violet-400" />
          <StatCard icon={CheckCircle} label="Active clients"   value={active_clients}   color="bg-green-500/20 text-green-400" />
          <StatCard icon={Clock}       label="Pending requests" value={pending_requests} color="bg-yellow-500/20 text-yellow-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['clients', 'requests'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {t === 'clients' ? `Clients (${total_clients ?? 0})` : `Requests (${requests.length})`}
            </button>
          ))}
        </div>

        {/* Clients */}
        {tab === 'clients' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Business</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Manager</th>
                  <th className="text-left px-5 py-3">Location</th>
                  <th className="text-left px-5 py-3">Users</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-12">No clients onboarded yet.</td></tr>
                )}
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg ${TYPE_COLORS[c.business_type] || 'bg-gray-500/20 text-gray-400'}`}>
                        {c.business_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300 text-xs">{c.manager || '—'}</td>
                    <td className="px-5 py-3 text-gray-400">{c.location || '—'}</td>
                    <td className="px-5 py-3 text-gray-300">{c.user_count}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${c.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Business</th>
                  <th className="text-left px-5 py-3">Contact</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Location</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-12">No requests yet.</td></tr>
                )}
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{r.business_name}</p>
                      <p className="text-gray-500 text-xs">{r.business_type}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{r.contact_name}</td>
                    <td className="px-5 py-3 text-gray-400">{r.email}</td>
                    <td className="px-5 py-3 text-gray-400">{r.location || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg border ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(r)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                        <select
                          value={r.status}
                          onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                          className="text-xs bg-gray-800 border border-white/10 text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {['PENDING', 'REVIEWED', 'ONBOARDED', 'REJECTED'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-bold text-lg">{selected.business_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            {[
              ['Type',     selected.business_type],
              ['Contact',  selected.contact_name],
              ['Email',    selected.email],
              ['Phone',    selected.phone || '—'],
              ['Location', selected.location || '—'],
              ['Status',   selected.status],
              ['Date',     new Date(selected.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-400">{k}</span>
                <span className="text-white">{v}</span>
              </div>
            ))}
            {selected.message && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-gray-400 text-xs mb-1">Message</p>
                <p className="text-gray-300 text-sm">{selected.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
