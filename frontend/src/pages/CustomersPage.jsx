import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomers, deleteCustomer } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomerForm from '../components/customers/CustomerForm'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 15

const inputCls = 'text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E3B2E] focus:border-transparent'
const inputStyle = { border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }

const retentionStyle = (rate) => {
  const r = parseFloat(rate)
  if (r >= 60) return { background: 'rgba(14,59,46,0.08)', color: '#0E3B2E' }
  if (r >= 40) return { background: 'rgba(201,161,92,0.12)', color: '#8A6A2E' }
  return { background: 'rgba(156,75,62,0.08)', color: '#9C4B3E' }
}

export default function CustomersPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [page, setPage]                   = useState(1)

  const params = {
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo   && { date_to: dateTo }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params).then(r => r.data.results ?? r.data),
  })

  const allRecords = data ?? []
  const totalPages = Math.ceil(allRecords.length / PAGE_SIZE)
  const records = allRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const avgRetention = allRecords.length
    ? (allRecords.reduce((s, r) => s + parseFloat(r.retention_rate || 0), 0) / allRecords.length).toFixed(1)
    : null
  const totalCustomers = allRecords.reduce((s, r) => s + parseInt(r.total_customers || 0), 0)

  const avgColor = avgRetention >= 60 ? '#0E3B2E' : avgRetention >= 40 ? '#8A6A2E' : '#9C4B3E'

  const del = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Record deleted.'); setConfirmDelete(null) },
    onError: () => toast.error('Could not delete record.'),
  })

  const openAdd   = () => { setEditing(null); setShowForm(true) }
  const openEdit  = (r) => { setEditing(r); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Customer Retention</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>New vs. returning customer tracking</p>
        </div>
        {can.editCustomers && <Button onClick={openAdd}><Plus size={15} /> Add Record</Button>}
      </div>

      {allRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>Total Customers Served</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
              {totalCustomers.toLocaleString()}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>Avg Retention Rate</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: avgColor }}>
              {avgRetention}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>Days Recorded</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
              {allRecords.length}
            </p>
          </Card>
        </div>
      )}

      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
            <span className="text-sm" style={{ color: '#B7C4BC' }}>to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs font-medium" style={{ color: '#0E3B2E' }}>Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#B7C4BC' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto mb-3" style={{ color: '#E2E9E5' }} />
            <p className="font-medium" style={{ color: '#7A9184' }}>No customer records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E9E5' }}>
                    {['Date','New','Returning','Total','Retention Rate','Notes'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium ${i >= 1 && i <= 4 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#7A9184' }}>{h}</th>
                    ))}
                    {can.editCustomers && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #FAFBF9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#0A2820' }}>{r.date}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#7A9184' }}>{r.new_customers}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#7A9184' }}>{r.returning_customers}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: '#0A2820' }}>{r.total_customers}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={retentionStyle(r.retention_rate)}>
                          {parseFloat(r.retention_rate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#B7C4BC' }}>{r.notes || '-'}</td>
                      {can.editCustomers && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#B7C4BC' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#0E3B2E'; e.currentTarget.style.background = 'rgba(14,59,46,0.07)' }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#B7C4BC'; e.currentTarget.style.background = 'transparent' }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#B7C4BC' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#9C4B3E'; e.currentTarget.style.background = 'rgba(156,75,62,0.07)' }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#B7C4BC'; e.currentTarget.style.background = 'transparent' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #E2E9E5' }}>
                <p className="text-xs" style={{ color: '#B7C4BC' }}>{allRecords.length} records · page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: '#7A9184' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: '#7A9184' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Customer Record' : 'Add Customer Record'}>
        <CustomerForm existing={editing} onDone={closeForm} />
      </Modal>
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Record">
        <p className="mb-6" style={{ color: '#7A9184' }}>
          Delete the customer record for <strong style={{ color: '#0A2820' }}>{confirmDelete?.date}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" disabled={del.isPending} onClick={() => del.mutate(confirmDelete.id)}>
            {del.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
