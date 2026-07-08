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

  const retentionColor = (rate) => {
    const r = parseFloat(rate)
    if (r >= 60) return 'text-green-600 bg-green-50'
    if (r >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Customer Retention</h1>
          <p className="text-sm text-gray-500 mt-0.5">New vs. returning customer tracking</p>
        </div>
        {can.editCustomers && <Button onClick={openAdd}><Plus size={15} /> Add Record</Button>}
      </div>

      {allRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Customers Served</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCustomers.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Retention Rate</p>
            <p className={`text-2xl font-bold mt-1 ${avgRetention >= 60 ? 'text-green-600' : avgRetention >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {avgRetention}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Days Recorded</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{allRecords.length}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No customer records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">New</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Returning</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Retention Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Notes</th>
                    {can.editCustomers && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.date}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.new_customers}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.returning_customers}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.total_customers}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${retentionColor(r.retention_rate)}`}>
                          {parseFloat(r.retention_rate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.notes || '—'}</td>
                      {can.editCustomers && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">{allRecords.length} records · page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
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
        <p className="text-gray-600 mb-6">Delete the customer record for <strong>{confirmDelete?.date}</strong>?</p>
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
