import { useState } from 'react'
import { ChevronDown, ChevronRight, TrendingUp, Receipt, Package, Users } from 'lucide-react'
import Card from '../components/ui/Card'
import SalesForm from '../components/sales/SalesForm'
import ExpenseForm from '../components/expenses/ExpenseForm'
import InventoryRecordForm from '../components/inventory/InventoryRecordForm'
import CustomerForm from '../components/customers/CustomerForm'

const today = () => new Date().toISOString().split('T')[0]

const sections = [
  { key: 'sales',     label: 'Sales',     icon: TrendingUp, color: 'text-indigo-600' },
  { key: 'expense',   label: 'Expense',   icon: Receipt,    color: 'text-orange-500' },
  { key: 'inventory', label: 'Inventory', icon: Package,    color: 'text-emerald-600' },
  { key: 'customers', label: 'Customers', icon: Users,      color: 'text-blue-600' },
]

function Section({ label, icon: Icon, color, open, onToggle, children }) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={color} />
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </Card>
  )
}

export default function DailyEntryPage() {
  const [date, setDate] = useState(today())
  const [open, setOpen] = useState('sales')
  const [saved, setSaved] = useState({})

  const toggle = (key) => setOpen(o => o === key ? null : key)
  const markDone = (key) => { setSaved(s => ({ ...s, [key]: true })); setOpen(null) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log all data for a single day in one place</p>
      </div>

      <Card className="px-5 py-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 shrink-0">Entry Date</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved({}) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {Object.keys(saved).length > 0 && (
            <span className="text-xs text-emerald-600 font-medium">
              {Object.keys(saved).length} of {sections.length} sections saved
            </span>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {sections.map(({ key, label, icon, color }) => (
          <Section
            key={key}
            label={label}
            icon={icon}
            color={saved[key] ? 'text-emerald-500' : color}
            open={open === key}
            onToggle={() => toggle(key)}
          >
            {key === 'sales' && (
              <SalesForm existing={{ date }} onDone={() => markDone('sales')} prefillDate={date} />
            )}
            {key === 'expense' && (
              <ExpenseForm existing={{ date }} onDone={() => markDone('expense')} prefillDate={date} />
            )}
            {key === 'inventory' && (
              <InventoryRecordForm existing={{ date }} onDone={() => markDone('inventory')} prefillDate={date} />
            )}
            {key === 'customers' && (
              <CustomerForm existing={{ date }} onDone={() => markDone('customers')} prefillDate={date} />
            )}
          </Section>
        ))}
      </div>
    </div>
  )
}
