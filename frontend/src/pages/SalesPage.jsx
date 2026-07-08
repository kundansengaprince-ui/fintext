import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSales, deleteSale } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SalesForm from '../components/sales/SalesForm'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Number(n).toLocaleString('en-RW')
const PAGE_SIZE = 15

export default function SalesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [page, setPage]               = useState(1)

  const params = {
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo   && { date_to: dateTo }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sales', params],
    queryFn: () => getSales(params).then(r => r.data.results ?? r.data),
  })

  const allRecords = data ?? []
  const filtered = search
    ? allRecords.filter(r => r.date.includes(search))
    : allRecords

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const records = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalRevenue = allRecords.reduce((s, r) => s + parseFloat(r.total_sales || 0), 0)

  const del = useMutation({
    mutationFn: (id) => deleteSale(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Record deleted.')
      setConfirmDelete(null)
    },
    onError: () => toast.error('Could not delete record.'),
  })

  const openAdd  = () => { setEditing(null); setShowForm(true) }
  const openEdit = (r) => { setEditing(r); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily revenue and transaction data</p>
        </div>
        {can.editSales && (
          <Button onClick={openAdd}><Plus size={15} /> Add Record</Button>
        )}
      </div>

      {allRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">RWF {fmt(totalRevenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Records</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{allRecords.length} days</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Daily Sales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              RWF {fmt(allRecords.length ? (totalRevenue / allRecords.length).toFixed(0) : 0)}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by date..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(search || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total Sales</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Food</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Beverages</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Transactions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Avg/Txn</th>
                    {can.editSales && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">RWF {fmt(r.total_sales)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.food_sales ? `RWF ${fmt(r.food_sales)}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.beverage_sales ? `RWF ${fmt(r.beverage_sales)}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.num_transactions ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {r.avg_transaction_value ? `RWF ${fmt(parseFloat(r.avg_transaction_value).toFixed(0))}` : '—'}
                      </td>
                      {can.editSales && (
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
                <p className="text-xs text-gray-500">{filtered.length} records · page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Sales Record' : 'Add Sales Record'}>
        <SalesForm existing={editing} onDone={closeForm} />
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Record">
        <p className="text-gray-600 mb-6">Delete the sales record for <strong>{confirmDelete?.date}</strong>? This cannot be undone.</p>
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
