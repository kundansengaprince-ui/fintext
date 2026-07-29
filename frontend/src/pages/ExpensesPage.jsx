import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, deleteExpense, getExpenseCategories } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ExpenseForm from '../components/expenses/ExpenseForm'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Receipt, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Number(n).toLocaleString('en-RW')
const PAGE_SIZE = 15

const inputCls = 'text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E3B2E] focus:border-transparent'
const inputStyle = { border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }

export default function ExpensesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch]               = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [catFilter, setCatFilter]         = useState('')
  const [page, setPage]                   = useState(1)

  const params = {
    ...(dateFrom  && { date_from: dateFrom }),
    ...(dateTo    && { date_to: dateTo }),
    ...(catFilter && { category: catFilter }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpenses(params).then(r => r.data.results ?? r.data),
  })
  const { data: cats = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => getExpenseCategories().then(r => r.data.results ?? r.data),
  })

  const allRecords = data ?? []
  const filtered = search
    ? allRecords.filter(r => r.description?.toLowerCase().includes(search.toLowerCase()) || r.category_name?.toLowerCase().includes(search.toLowerCase()))
    : allRecords

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const records = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalExpenses = allRecords.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const topCategory = Object.entries(
    allRecords.reduce((acc, r) => { acc[r.category_name ?? 'Other'] = (acc[r.category_name ?? 'Other'] || 0) + parseFloat(r.amount || 0); return acc }, {})
  ).sort((a, b) => b[1] - a[1])[0]

  const del = useMutation({
    mutationFn: (id) => deleteExpense(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted.'); setConfirmDelete(null) },
    onError: () => toast.error('Could not delete expense.'),
  })

  const openAdd   = () => { setEditing(null); setShowForm(true) }
  const openEdit  = (r) => { setEditing(r); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>Track operational costs and expenditure</p>
        </div>
        {can.editExpenses && <Button onClick={openAdd}><Plus size={15} /> Add Expense</Button>}
      </div>

      {allRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Total Expenses', `RWF ${fmt(totalExpenses)}`],
            ['Records', `${allRecords.length}`],
            ['Top Category', topCategory ? topCategory[0] : '—'],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B7C4BC' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search description or category..."
              className={`w-full pl-8 pr-3 ${inputCls}`} style={inputStyle} />
          </div>
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}
            className={inputCls} style={inputStyle}>
            <option value="">All categories</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
            <span className="text-sm" style={{ color: '#B7C4BC' }}>to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
          </div>
          {(search || dateFrom || dateTo || catFilter) && (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setCatFilter(''); setPage(1) }}
              className="text-xs font-medium" style={{ color: '#0E3B2E' }}>Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#B7C4BC' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={40} className="mx-auto mb-3" style={{ color: '#E2E9E5' }} />
            <p className="font-medium" style={{ color: '#7A9184' }}>No expenses found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E9E5' }}>
                    {['Date','Category','Amount','Description','Receipt Ref'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium ${i === 2 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#7A9184' }}>{h}</th>
                    ))}
                    {can.editExpenses && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #FAFBF9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#0A2820' }}>{r.date}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(14,59,46,0.08)', color: '#0E3B2E' }}>
                          {r.category_name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
                        RWF {fmt(r.amount)}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#7A9184' }}>{r.description || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#B7C4BC' }}>{r.receipt_reference || '—'}</td>
                      {can.editExpenses && (
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
                <p className="text-xs" style={{ color: '#B7C4BC' }}>{filtered.length} records · page {page} of {totalPages}</p>
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

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <ExpenseForm existing={editing} onDone={closeForm} />
      </Modal>
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Expense">
        <p className="mb-6" style={{ color: '#7A9184' }}>
          Delete the expense of <strong style={{ color: '#0A2820' }}>RWF {fmt(confirmDelete?.amount)}</strong> on <strong style={{ color: '#0A2820' }}>{confirmDelete?.date}</strong>?
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
