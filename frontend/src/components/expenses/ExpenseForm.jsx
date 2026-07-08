import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExpense, updateExpense, getExpenseCategories } from '../../api'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function ExpenseForm({ existing, onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    date:              existing?.date ?? today(),
    category:          existing?.category ?? '',
    amount:            existing?.amount ?? '',
    description:       existing?.description ?? '',
    receipt_reference: existing?.receipt_reference ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: cats = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => getExpenseCategories().then(r => r.data.results ?? r.data),
  })

  const mutation = useMutation({
    mutationFn: existing
      ? (d) => updateExpense(existing.id, d)
      : createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense saved.')
      onDone?.()
    },
    onError: () => toast.error('Could not save expense.'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <Input label="Date" type="date" value={form.date} onChange={set('date')} required />
      <Select label="Category" value={form.category} onChange={set('category')} required>
        <option value="">Select a category…</option>
        {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Input label="Amount (RWF)" type="number" step="0.01" min="0.01"
        value={form.amount} onChange={set('amount')} placeholder="e.g. 120000" required />
      <Input label="Receipt Reference" value={form.receipt_reference}
        onChange={set('receipt_reference')} placeholder="Optional receipt number" />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea rows={2} value={form.description} onChange={set('description')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="What was this expense for?" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : (existing ? 'Update' : 'Save Expense')}
        </Button>
      </div>
    </form>
  )
}
