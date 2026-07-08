import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCustomer, updateCustomer } from '../../api'
import Input from '../ui/Input'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function CustomerForm({ existing, onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    date:               existing?.date ?? today(),
    new_customers:      existing?.new_customers ?? '',
    returning_customers:existing?.returning_customers ?? '',
    notes:              existing?.notes ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const total = parseInt(form.new_customers || 0) + parseInt(form.returning_customers || 0)
  const retention = total > 0
    ? ((parseInt(form.returning_customers || 0) / total) * 100).toFixed(1)
    : null

  const mutation = useMutation({
    mutationFn: existing
      ? (d) => updateCustomer(existing.id, d)
      : createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer record saved.')
      onDone?.()
    },
    onError: (err) => toast.error(err.response?.data?.date?.[0] ?? 'Could not save record.'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="New Customers" type="number" min="0"
          value={form.new_customers} onChange={set('new_customers')} placeholder="0" required />
        <Input label="Returning Customers" type="number" min="0"
          value={form.returning_customers} onChange={set('returning_customers')} placeholder="0" required />
      </div>
      {total > 0 && (
        <div className="bg-indigo-50 rounded-xl p-3 text-sm flex items-center justify-between">
          <span className="text-indigo-700">Total: <strong>{total}</strong> customers</span>
          <span className="font-bold text-indigo-700">Retention: {retention}%</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea rows={2} value={form.notes} onChange={set('notes')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Any observations about customer patterns…" />
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
