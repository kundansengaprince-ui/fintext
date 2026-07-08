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
    ...(dateFrom    && { date_from: dateFrom }),
    ...(dateTo      && { date_to: dateTo }),
    ...(itemFilter  && { item: itemFilter }),
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock levels, usage, and wastage tracking</p>
        </div>
        {can.editInventory && <Button onClick={openAdd}><Plus size={15} /> Add Record</Button>}
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Low Stock Alert — {lowStock.length} item{lowStock.length > 1 ? 's' : ''} need restocking</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStock.map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">
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
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{allRecords.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Wastage</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{totalWastage.toFixed(2)} units</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Items Tracked</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={itemFilter} onChange={e => { setItemFilter(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[160px]">
            <option value="">All items</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(itemFilter || dateFrom || dateTo) && (
            <button onClick={() => { setItemFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No inventory records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Opening</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Received</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Used</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Wastage</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Closing</th>
                    {can.editInventory && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.date}</td>
                      <td className="px-4 py-3 text-gray-700">{r.item_name ?? r.item}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.opening_quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.quantity_received}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.quantity_used}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${parseFloat(r.wastage) > 0 ? 'text-red-500' : 'text-gray-600'}`}>{r.wastage}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.closing_quantity}</td>
                      {can.editInventory && (
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

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Inventory Record' : 'Add Inventory Record'}>
        <InventoryRecordForm existing={editing} onDone={closeForm} />
      </Modal>
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Record">
        <p className="text-gray-600 mb-6">Delete the inventory record for <strong>{confirmDelete?.item_name}</strong> on <strong>{confirmDelete?.date}</strong>?</p>
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
