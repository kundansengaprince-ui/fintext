import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInventoryRecords, getInventoryItems, getLowStockAlerts, deleteInventoryRecord } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import InventoryRecordForm from '../components/inventory/InventoryRecordForm'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Package, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 15

const inputCls = 'text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E3B2E] focus:border-transparent'
const inputStyle = { border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }

export default function InventoryPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [itemFilter, setItemFilter]       = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [page, setPage]                   = useState(1)

  const params = {
    ...(dateFrom   && { date_from: dateFrom }),
    ...(dateTo     && { date_to: dateTo }),
    ...(itemFilter && { item: itemFilter }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-records', params],
    queryFn: () => getInventoryRecords(params).then(r => r.data.results ?? r.data),
  })
  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems().then(r => r.data.results ?? r.data),
  })
  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => getLowStockAlerts().then(r => r.data),
    refetchInterval: 60_000,
  })

  const allRecords = data ?? []
  const totalPages = Math.ceil(allRecords.length / PAGE_SIZE)
  const records = allRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalWastage = allRecords.reduce((s, r) => s + parseFloat(r.wastage || 0), 0)

  const del = useMutation({
    mutationFn: (id) => deleteInventoryRecord(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-records'] }); toast.success('Record deleted.'); setConfirmDelete(null) },
    onError: () => toast.error('Could not delete record.'),
  })

  const openAdd   = () => { setEditing(null); setShowForm(true) }
  const openEdit  = (r) => { setEditing(r); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>Stock levels, usage, and wastage tracking</p>
        </div>
        {can.editInventory && <Button onClick={openAdd}><Plus size={15} /> Add Record</Button>}
      </div>

      {/* Low stock alert banner — gold accent */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#F1E6D0', borderLeft: '3px solid #C9A15C' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: '#C9A15C', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#8A6A2E' }}>
                Low Stock Alert — {lowStock.length} item{lowStock.length > 1 ? 's' : ''} need restocking
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStock.map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(201,161,92,0.15)', color: '#8A6A2E', border: '1px solid rgba(201,161,92,0.3)' }}>
                    {item.name} — {item.closing_quantity} {item.unit} left (reorder at {item.reorder_level})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {allRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Total Records', `${allRecords.length}`, '#0A2820'],
            ['Total Wastage', `${totalWastage.toFixed(2)} units`, totalWastage > 0 ? '#9C4B3E' : '#0A2820'],
            ['Items Tracked', `${items.length}`, '#0A2820'],
          ].map(([label, value, color]) => (
            <Card key={label} className="p-4">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#7A9184' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={itemFilter} onChange={e => { setItemFilter(e.target.value); setPage(1) }}
            className={`${inputCls} flex-1 min-w-[160px]`} style={inputStyle}>
            <option value="">All items</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
            <span className="text-sm" style={{ color: '#B7C4BC' }}>to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className={inputCls} style={inputStyle} />
          </div>
          {(itemFilter || dateFrom || dateTo) && (
            <button onClick={() => { setItemFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs font-medium" style={{ color: '#0E3B2E' }}>Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#B7C4BC' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-3" style={{ color: '#E2E9E5' }} />
            <p className="font-medium" style={{ color: '#7A9184' }}>No inventory records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E9E5' }}>
                    {['Date','Item','Opening','Received','Used','Wastage','Closing'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium ${i > 1 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#7A9184' }}>{h}</th>
                    ))}
                    {can.editInventory && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #FAFBF9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#0A2820' }}>{r.date}</td>
                      <td className="px-4 py-3" style={{ color: '#3D4F47' }}>{r.item_name ?? r.item}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#7A9184' }}>{r.opening_quantity}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#7A9184' }}>{r.quantity_received}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#7A9184' }}>{r.quantity_used}</td>
                      <td className="px-4 py-3 text-right">
                        <span style={{ fontWeight: 500, color: parseFloat(r.wastage) > 0 ? '#9C4B3E' : '#7A9184' }}>
                          {r.wastage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0A2820' }}>
                        {r.closing_quantity}
                      </td>
                      {can.editInventory && (
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

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Inventory Record' : 'Add Inventory Record'}>
        <InventoryRecordForm existing={editing} onDone={closeForm} />
      </Modal>
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Record">
        <p className="mb-6" style={{ color: '#7A9184' }}>
          Delete the inventory record for <strong style={{ color: '#0A2820' }}>{confirmDelete?.item_name}</strong> on <strong style={{ color: '#0A2820' }}>{confirmDelete?.date}</strong>?
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
