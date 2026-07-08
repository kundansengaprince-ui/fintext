import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTransactions, createTransaction } from '../api'
import api from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import { Receipt, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Ban } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fmt     = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })
const PAGE_SIZE = 20

const STATUS_STYLE = {
  completed: 'bg-emerald-50 text-emerald-700',
  voided:    'bg-red-50 text-red-600',
  open:      'bg-yellow-50 text-yellow-700',
}

export default function TransactionsPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [page, setPage]               = useState(1)
  const [expanded, setExpanded]       = useState(null)
  const [confirmVoid, setConfirmVoid] = useState(null)

  const params = {
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo   && { date_to:   dateTo   }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => getTransactions(params).then(r => r.data.results ?? r.data),
  })

  const allTxns  = data ?? []
  const totalPages = Math.ceil(allTxns.length / PAGE_SIZE)
  const txns     = allTxns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalRevenue = allTxns
    .filter(t => t.status === 'completed')
    .reduce((s, t) => s + parseFloat(t.total || 0), 0)

  const voidTxn = useMutation({
    mutationFn: (id) => api.patch(`/pos/transactions/${id}/`, { status: 'voided' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Transaction voided.')
      setConfirmVoid(null)
    },
    onError: () => toast.error('Could not void transaction.'),
  })

  const toggleExpand = (id) => setExpanded(e => e === id ? null : id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All POS orders — full audit trail</p>
        </div>
      </div>

      {allTxns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">RWF {fmt(totalRevenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {allTxns.filter(t => t.status === 'completed').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Voided</p>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {allTxns.filter(t => t.status === 'voided').length}
            </p>
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
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No transactions found.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {txns.map(txn => (
                <div key={txn.id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(txn.id)}
                  >
                    <div className="text-gray-400">
                      {expanded === txn.id
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">#{txn.id}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[txn.status] ?? ''}`}>
                          {txn.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {txn.date} · {new Date(txn.created_at).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}
                        {txn.created_by_name && ` · ${txn.created_by_name}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 shrink-0">RWF {fmt(txn.total)}</p>
                    {can.editSales && txn.status === 'completed' && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmVoid(txn) }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Void transaction"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>

                  {/* Expanded line items */}
                  {expanded === txn.id && txn.items?.length > 0 && (
                    <div className="bg-gray-50 px-12 py-3 space-y-1.5 border-t border-gray-100">
                      {txn.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}× {item.menu_item_name}
                            <span className="text-xs text-gray-400 ml-2">@ RWF {fmt(item.unit_price)}</span>
                          </span>
                          <span className="font-medium text-gray-800">RWF {fmt(item.subtotal)}</span>
                        </div>
                      ))}
                      {txn.notes && (
                        <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 mt-2">Note: {txn.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">{allTxns.length} transactions · page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronRightIcon size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={!!confirmVoid} onClose={() => setConfirmVoid(null)} title="Void Transaction">
        <p className="text-gray-600 mb-2">
          Void transaction <strong>#{confirmVoid?.id}</strong> for <strong>RWF {fmt(confirmVoid?.total)}</strong>?
        </p>
        <p className="text-sm text-red-500 mb-6">This will remove it from today's sales total.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmVoid(null)}>Cancel</Button>
          <Button variant="danger" disabled={voidTxn.isPending} onClick={() => voidTxn.mutate(confirmVoid.id)}>
            {voidTxn.isPending ? 'Voiding…' : 'Void Transaction'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
