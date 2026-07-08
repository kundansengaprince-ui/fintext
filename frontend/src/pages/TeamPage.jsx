import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Users, TrendingUp, Receipt, Package, UserCheck } from 'lucide-react'
import { validatePassword, passwordStrength } from '../utils/password'

const ROLES = [
  { value: 'MANAGER',         label: 'Manager / Owner' },
  { value: 'CASHIER',         label: 'Cashier' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'IT_ADMIN',        label: 'IT Admin' },
  { value: 'FLOOR_STAFF',     label: 'Waiter / Floor Staff' },
]

const roleColors = {
  MANAGER:         'bg-purple-100 text-purple-700',
  CASHIER:         'bg-blue-100 text-blue-700',
  FINANCE_OFFICER: 'bg-green-100 text-green-700',
  IT_ADMIN:        'bg-gray-100 text-gray-700',
  FLOOR_STAFF:     'bg-yellow-100 text-yellow-700',
}

const roleIcons = {
  MANAGER:         '👑',
  CASHIER:         '🧾',
  FINANCE_OFFICER: '💼',
  IT_ADMIN:        '⚙️',
  FLOOR_STAFF:     '🍽️',
}

const activityItems = (m) => []

const emptyForm = {
  username: '', first_name: '', last_name: '', email: '',
  role: 'FLOOR_STAFF', phone: '', password: '', is_active: true,
}

function MemberForm({ existing, onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(existing ? {
    first_name: existing.first_name, last_name: existing.last_name,
    email: existing.email, role: existing.role,
    phone: existing.phone, password: '', is_active: existing.is_active,
  } : { ...emptyForm })

  const set = (k) => (e) => setForm(f => ({
    ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }))

  const mutation = useMutation({
    mutationFn: existing ? (d) => updateTeamMember(existing.id, d) : createTeamMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success(existing ? 'Member updated.' : 'Member added.')
      onDone?.()
    },
    onError: (err) => {
      const msg = err.response?.data?.username?.[0] ?? err.response?.data?.password?.[0] ?? 'Could not save member.'
      toast.error(msg)
    },
  })

  const submit = (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (existing && !payload.password) {
      delete payload.password
    } else if (payload.password) {
      const errors = validatePassword(payload.password)
      if (errors.length > 0) {
        toast.error(`Password must contain: ${errors.join(', ')}.`)
        return
      }
    }
    mutation.mutate(payload)
  }

  const strength = passwordStrength(form.password)

  return (
    <form onSubmit={submit} className="space-y-4">
      {!existing && (
        <Input label="Username" value={form.username} onChange={set('username')}
          placeholder="e.g. john_doe" required />
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" value={form.first_name} onChange={set('first_name')} placeholder="Jean" />
        <Input label="Last Name"  value={form.last_name}  onChange={set('last_name')}  placeholder="Claude" />
      </div>
      <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="user@republlounge.rw" />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Role" value={form.role} onChange={set('role')} required>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+250 7XX XXX XXX" />
      </div>
      {form.role && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <strong>Access: </strong>
          {ROLES.find(r => r.value === form.role) && {
            MANAGER:         'Full access to all modules, can compute health scores',
            CASHIER:         'Sales module only — records daily transactions',
            FINANCE_OFFICER: 'Expenses (full) + Sales, Inventory, Customers (view only)',
            IT_ADMIN:        'Team management + dashboard and data (view only)',
            FLOOR_STAFF:     'Customer retention records only',
          }[form.role]}
        </p>
      )}
      <Input
        label={existing ? 'New Password (leave blank to keep)' : 'Password'}
        type="password"
        value={form.password}
        onChange={set('password')}
        placeholder={existing ? '••••••••' : 'Min. 8 chars, uppercase, number, special'}
        required={!existing}
      />
      {form.password && strength && (
        <div className="space-y-1 -mt-2">
          <div className="flex gap-1">
            {['weak','medium','strong'].map((l, i) => (
              <div key={l} className={`h-1 flex-1 rounded-full transition-colors ${
                strength.level === 'weak'   && i === 0 ? 'bg-red-500' :
                strength.level === 'medium' && i <= 1  ? 'bg-yellow-400' :
                strength.level === 'strong'             ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />
            ))}
          </div>
          <p className={`text-xs ${
            strength.level === 'strong' ? 'text-emerald-600' :
            strength.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
          }`}>{strength.label} password</p>
        </div>
      )}
      {existing && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          Account active
        </label>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : existing ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  )
}

export default function TeamPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded]       = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => getTeam().then(r => r.data),
  })
  const members = data ?? []

  const del = useMutation({
    mutationFn: (id) => deleteTeamMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success('Member removed.')
      setConfirmDelete(null)
    },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Could not remove member.'),
  })

  const openAdd  = () => { setEditing(null); setShowForm(true) }
  const openEdit = (m) => { setEditing(m); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const totalRecords = 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Staff accounts, roles, access levels and activity</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} /> Add Member</Button>
      </div>

      {/* Summary cards */}
      {members.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{members.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{members.filter(m => m.is_active).length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Roles in Use</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(members.map(m => m.role)).size}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records Entered</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalRecords}</p>
          </Card>
        </div>
      )}

      {/* Member table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => {
              const isOpen = expanded === m.id
              const activity = activityItems(m)
              return (
                <div key={m.id}>
                  <div
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : m.id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 text-sm">
                      {(m.first_name?.[0] ?? m.username[0]).toUpperCase()}
                    </div>

                    {/* Name + username */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">
                        {m.first_name || m.last_name
                          ? `${m.first_name} ${m.last_name}`.trim()
                          : m.username}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">@{m.username}</p>
                    </div>

                    {/* Role */}
                    <div className="w-40 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        <span>{roleIcons[m.role]}</span>
                        {ROLES.find(r => r.value === m.role)?.label ?? m.role}
                      </span>
                    </div>

                    {/* Contact */}
                    <div className="w-44 shrink-0 text-xs text-gray-500">
                      <p className="truncate">{m.email || '—'}</p>
                      <p>{m.phone || '—'}</p>
                    </div>

                    {/* Activity summary */}
                    <div className="w-32 shrink-0 text-center">
                      <p className="text-lg font-bold text-gray-800">{m.total_records ?? 0}</p>
                      <p className="text-xs text-gray-400">records entered</p>
                    </div>

                    {/* Status */}
                    <div className="w-20 shrink-0 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(m)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail row */}
                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Responsibilities</p>
                          <p className="text-sm text-gray-700">{m.responsibilities}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Contributions</p>
                          {activity.length === 0 ? (
                            <p className="text-sm text-gray-400">No records entered yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {activity.map(({ icon: Icon, label, count, color }) => (
                                <div key={label} className="flex items-center gap-2 text-sm">
                                  <Icon size={14} className={color} />
                                  <span className="text-gray-600">{label}:</span>
                                  <span className="font-semibold text-gray-800">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={closeForm}
        title={editing ? 'Edit Team Member' : 'Add Team Member'} size="md">
        <MemberForm existing={editing} onDone={closeForm} />
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Member">
        <p className="text-gray-600 mb-6">
          Remove <strong>{confirmDelete?.first_name || confirmDelete?.username}</strong> from the team?
          Their account will be permanently deleted.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" disabled={del.isPending} onClick={() => del.mutate(confirmDelete.id)}>
            {del.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
