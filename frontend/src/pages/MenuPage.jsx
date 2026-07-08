import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, getInventoryItems } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, UtensilsCrossed, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })

const EMPTY = { name: '', category: 'food', price: '', inventory_item: '', inventory_qty_per_sale: '1', is_available: true }

export default function MenuPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm]                   = useState(EMPTY)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => getMenuItems().then(r => r.data.results ?? r.data),
  })
  const { data: invItems = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems().then(r => r.data.results ?? r.data),
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const openAdd  = () => { setForm(EMPTY); setEditing(null); setShowForm(true) }
  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      inventory_item: item.inventory_item ?? '',
      inventory_qty_per_sale: item.inventory_qty_per_sale ?? '1',
      is_available: item.is_available,
    })
    setEditing(item)
    setShowForm(true)
  }

  const save = useMutation({
    mutationFn: (data) => editing ? updateMenuItem(editing.id, data) : createMenuItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success(editing ? 'Menu item updated.' : 'Menu item added.')
      setShowForm(false)
    },
    onError: () => toast.error('Could not save menu item.'),
  })

  const toggle = useMutation({
    mutationFn: (item) => updateMenuItem(item.id, { is_available: !item.is_available }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
    onError: () => toast.error('Could not update availability.'),
  })

  const del = useMutation({
    mutationFn: (id) => deleteMenuItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success('Menu item deleted.')
      setConfirmDelete(null)
    },
    onError: () => toast.error('Could not delete item.'),
  })

  const categories = ['food', 'beverage', 'other']
  const catLabel   = { food: 'Food', beverage: 'Beverage', other: 'Other' }
  const catColor   = { food: 'bg-orange-50 text-orange-700', beverage: 'bg-blue-50 text-blue-700', other: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add items the cashier can sell at the POS</p>
        </div>
        {can.manageTeam && <Button onClick={openAdd}><Plus size={15} /> Add Item</Button>}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No menu items yet.</p>
            <p className="text-gray-400 text-sm mt-1">Add your first item to start using the POS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Linked Inventory</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Qty/Sale</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Available</th>
                  {can.manageTeam && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!item.is_available ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor[item.category]}`}>
                        {catLabel[item.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">RWF {fmt(item.price)}</td>
                    <td className="px-4 py-3 text-gray-500">{item.inventory_item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.inventory_qty_per_sale}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle.mutate(item)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        {item.is_available
                          ? <ToggleRight size={22} className="text-emerald-500" />
                          : <ToggleLeft size={22} />
                        }
                      </button>
                    </td>
                    {can.manageTeam && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setConfirmDelete(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Menu Item' : 'Add Menu Item'}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="space-y-4">
          <Input label="Item Name" value={form.name} onChange={set('name')} placeholder="e.g. Primus Beer" required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={set('category')}>
              {categories.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}
            </Select>
            <Input label="Price (RWF)" type="number" min="1" step="1" value={form.price} onChange={set('price')} placeholder="e.g. 1500" required />
          </div>
          <Select label="Linked Inventory Item (optional)" value={form.inventory_item} onChange={set('inventory_item')}>
            <option value="">None — no stock deduction</option>
            {invItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </Select>
          {form.inventory_item && (
            <Input
              label="Inventory units consumed per sale"
              type="number" min="0.001" step="0.001"
              value={form.inventory_qty_per_sale}
              onChange={set('inventory_qty_per_sale')}
              placeholder="e.g. 1 bottle per beer sold"
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Menu Item">
        <p className="text-gray-600 mb-6">Delete <strong>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" disabled={del.isPending} onClick={() => del.mutate(confirmDelete.id)}>
            {del.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
