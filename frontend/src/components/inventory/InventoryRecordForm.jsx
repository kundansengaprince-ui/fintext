import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInventoryRecord, updateInventoryRecord, getInventoryItems } from '../../api'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function InventoryRecordForm({ existing, onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    date:              existing?.date ?? today(),
    item:              existing?.item ?? '',
    opening_quantity:  existing?.opening_quantity ?? '',
    quantity_received: existing?.quantity_received ?? '0',
    quantity_used:     existing?.quantity_used ?? '',
    wastage:           existing?.wastage ?? '0',
    notes:             existing?.notes ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => getInventoryItems().then(r => r.data.results ?? r.data),
  })

  const mutation = useMutation({
    mutationFn: existing
      ? (d) => updateInventoryRecord(existing.id, d)
      : createInventoryRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-records'] })
      toast.success('Inventory record saved.')
      onDone?.()
    },
    onError: (err) => toast.error(err.response?.data?.non_field_errors?.[0] ?? 'Could not save record.'),
  })

  const closing =
    parseFloat(form.opening_quantity || 0) +
    parseFloat(form.quantity_received || 0) -
    parseFloat(form.quantity_used || 0) -
    parseFloat(form.wastage || 0)

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
        <Select label="Item" value={form.item} onChange={set('item')} required>
          <option value="">Select item…</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Opening Qty" type="number" step="0.01" min="0"
          value={form.opening_quantity} onChange={set('opening_quantity')} required />
        <Input label="Qty Received" type="number" step="0.01" min="0"
          value={form.quantity_received} onChange={set('quantity_received')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Qty Used" type="number" step="0.01" min="0"
          value={form.quantity_used} onChange={set('quantity_used')} required />
        <Input label="Wastage" type="number" step="0.01" min="0"
          value={form.wastage} onChange={set('wastage')} />
      </div>
      <div className="bg-gray-50 rounded-xl p-3 text-sm flex items-center justify-between">
        <span className="text-gray-600">Calculated Closing Qty</span>
        <span className="font-bold text-gray-900">{isNaN(closing) ? '—' : closing.toFixed(2)}</span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : (existing ? 'Update' : 'Save Record')}
        </Button>
      </div>
    </form>
  )
}
