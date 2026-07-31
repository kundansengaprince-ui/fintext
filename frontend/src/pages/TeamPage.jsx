import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { validatePassword, passwordStrength } from '../utils/password'

const ROLES = [
  { value: 'MANAGER',         label: 'Manager / Owner' },
  { value: 'CASHIER',         label: 'Cashier' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'IT_ADMIN',        label: 'IT Admin' },
  { value: 'FLOOR_STAFF',     label: 'Waiter / Floor Staff' },
]

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success(existing ? 'Member updated.' : 'Member added.'); onDone?.() },
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
      if (errors.length > 0) { toast.error(`Password must contain: ${errors.join(', ')}.`); return }
    }
    mutation.mutate(payload)
  }

  const strength = passwordStrength(form.password)
  const strengthColor = strength?.level === 'strong' ? '#0E3B2E' : strength?.level === 'medium' ? '#8A6A2E' : '#9C4B3E'
  const strengthBar = (i) => {
    if (!strength) return '#E2E9E5'
    if (strength.level === 'strong') return '#0E3B2E'
    if (strength.level === 'medium' && i <= 1) return '#C9A15C'
    if (strength.level === 'weak' && i === 0) return '#9C4B3E'
    return '#E2E9E5'
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!existing && (
        <Input label="Username" value={form.username} onChange={set('username')} placeholder="e.g. john_doe" required />
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
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}>
          <strong style={{ color: '#3D4F47' }}>Access: </strong>
          {{
            MANAGER:         'Full access to all modules, can compute health scores',
            CASHIER:         'Sales module only - records daily transactions',
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
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: strengthBar(i) }} />
            ))}
          </div>
          <p className="text-xs" style={{ color: strengthColor }}>{strength.label} password</p>
        </div>
      )}
      {existing && (
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#3D4F47' }}>
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')}
            className="rounded" style={{ accentColor: '#0E3B2E' }} />
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
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded]           = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => getTeam().then(r => r.data),
  })
  const members = data ?? []

  const del = useMutation({
    mutationFn: (id) => deleteTeamMember(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Member removed.'); setConfirmDelete(null) },
    onError: (err) => toast.error(err.response?.data?.detail ?? 'Could not remove member.'),
  })

  const openAdd   = () => { setEditing(null); setShowForm(true) }
  const openEdit  = (m) => { setEditing(m); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Team</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>Staff accounts, roles, access levels and activity</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} /> Add Member</Button>
      </div>

      {members.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            ['Total Staff', members.length, '#0A2820'],
            ['Active', members.filter(m => m.is_active).length, '#0E3B2E'],
            ['Roles in Use', new Set(members.map(m => m.role)).size, '#0A2820'],
            ['Total Records Entered', 0, '#0A2820'],
          ].map(([label, value, color]) => (
            <Card key={label} className="p-4">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#B7C4BC' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto mb-3" style={{ color: '#E2E9E5' }} />
            <p className="font-medium" style={{ color: '#7A9184' }}>No team members yet.</p>
          </div>
        ) : (
          <div style={{ borderTop: 'none' }}>
            {members.map((m, idx) => {
              const isOpen = expanded === m.id
              return (
                <div key={m.id} style={idx > 0 ? { borderTop: '1px solid #E2E9E5' } : {}}>
                  <div className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setExpanded(isOpen ? null : m.id)}>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
                      style={{ background: '#164C3B', color: '#B7C4BC' }}>
                      {(m.first_name?.[0] ?? m.username[0]).toUpperCase()}
                    </div>

                    {/* Name + username */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#0A2820' }}>
                        {m.first_name || m.last_name ? `${m.first_name} ${m.last_name}`.trim() : m.username}
                      </p>
                      <p className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#B7C4BC' }}>@{m.username}</p>
                    </div>

                    {/* Role */}
                    <div className="w-40 shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(14,59,46,0.08)', color: '#0E3B2E', border: '1px solid rgba(14,59,46,0.15)' }}>
                        {ROLES.find(r => r.value === m.role)?.label ?? m.role}
                      </span>
                    </div>

                    {/* Contact */}
                    <div className="w-44 shrink-0 text-xs" style={{ color: '#7A9184' }}>
                      <p className="truncate">{m.email || '-'}</p>
                      <p>{m.phone || '-'}</p>
                    </div>

                    {/* Activity */}
                    <div className="w-32 shrink-0 text-center">
                      <p className="text-lg font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
                        {m.total_records ?? 0}
                      </p>
                      <p className="text-xs" style={{ color: '#B7C4BC' }}>records entered</p>
                    </div>

                    {/* Status */}
                    <div className="w-20 shrink-0 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: m.is_active ? '#0E3B2E' : '#B7C4BC' }}>
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ background: m.is_active ? '#0E3B2E' : '#B7C4BC' }} />
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#B7C4BC' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#0E3B2E'; e.currentTarget.style.background = 'rgba(14,59,46,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#B7C4BC'; e.currentTarget.style.background = 'transparent' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(m)} className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#B7C4BC' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#9C4B3E'; e.currentTarget.style.background = 'rgba(156,75,62,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#B7C4BC'; e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-6 py-4" style={{ background: '#FAFBF9', borderTop: '1px solid #E2E9E5' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A9184' }}>Responsibilities</p>
                      <p className="text-sm" style={{ color: '#3D4F47' }}>{m.responsibilities || '-'}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Team Member' : 'Add Team Member'} size="md">
        <MemberForm existing={editing} onDone={closeForm} />
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove Member">
        <p className="mb-6" style={{ color: '#7A9184' }}>
          Remove <strong style={{ color: '#0A2820' }}>{confirmDelete?.first_name || confirmDelete?.username}</strong> from the team?
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
