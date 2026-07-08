import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSale, updateSale, getSales } from '../../api'
import Input from '../ui/Input'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function SalesForm({ existing, onDone }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(existing?.date ?? today())

  // Check if a record already exists for the selected date
  const { data: existingForDate } = useQuery({
    queryKey: ['sales-check', date],
    queryFn: () => getSales({ date_from: date, date_to: date }).then(r => {
      const results = r.data.results ?? r.data
      return results.find(r => r.date === date) ?? null
    }),
    enabled: !existing && !!date,
  })

  const record = existing ?? existingForDate

  const [form, setForm] = useState({
    total_sales:      existing?.total_sales ?? '',
    food_sales:       existing?.food_sales ?? '',
    beverage_sales:   existing?.beverage_sales ?? '',
    num_transactions: existing?.num_transactions ?? '',
    notes:            existing?.notes ?? '',
  })

  // Populate form when existing record found for date
  useEffect(() => {
    if (existingForDate) {
      setForm({
        total_sales:      existingForDate.total_sales ?? '',
        food_sales:       existingForDate.food_sales ?? '',
        beverage_sales:   existingForDate.beverage_sales ?? '',
        num_transactions: existingForDate.num_transactions ?? '',
        notes:            existingForDate.notes ?? '',
      })
    }
  }, [existingForDate])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const food = parseFloat(form.food_sales)
  const bev  = parseFloat(form.beverage_sales)
  const derivedTotal = (!isNaN(food) && !isNaN(bev) && food >= 0 && bev >= 0)
    ? (food + bev).toFixed(2)
    : form.total_sales

  const avgTxn = derivedTotal && form.num_transactions
    ? (parseFloat(derivedTotal) / parseInt(form.num_transactions)).toFixed(0)
    : null

  const mutation = useMutation({
    mutationFn: (d) => record?.id ? updateSale(record.id, d) : createSale(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      toast.success(record?.id ? 'Sales record updated.' : 'Sales record saved.')
      onDone?.()
    },
    onError: (err) => {
      const d = err.response?.data
      const msg = d?.date?.[0] ?? d?.non_field_errors?.[0] ?? d?.detail ?? 'Could not save record.'
      toast.error(msg)
    },
  })

  const submit = (e) => {
    e.preventDefault()
    mutation.mutate({ date, ...form, total_sales: derivedTotal })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {existingForDate && !existing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          A record already exists for this date — editing it.
        </div>
      )}
      <Input label="Date" type="date" value={date}
        onChange={e => setDate(e.target.value)}
        disabled={!!existing}
        required />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Food Sales (RWF)" type="number" step="0.01" min="0"
          value={form.food_sales} onChange={set('food_sales')} placeholder="e.g. 500000" />
        <Input label="Beverage Sales (RWF)" type="number" step="0.01" min="0"
          value={form.beverage_sales} onChange={set('beverage_sales')} placeholder="e.g. 350000" />
      </div>

      <Input label="Total Sales (RWF)" type="number" step="0.01" min="0"
        value={derivedTotal} onChange={set('total_sales')} placeholder="Auto-calculated or enter manually" required />

      <Input label="Number of Transactions" type="number" min="0"
        value={form.num_transactions} onChange={set('num_transactions')} placeholder="e.g. 85" />

      {avgTxn && (
        <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-indigo-600">Avg. per transaction</span>
          <span className="font-bold text-indigo-700">RWF {parseInt(avgTxn).toLocaleString('en-RW')}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea rows={2} value={form.notes} onChange={set('notes')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Any special events or remarks..." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : record?.id ? 'Update Record' : 'Save Record'}
        </Button>
      </div>
    </form>
  )
}
