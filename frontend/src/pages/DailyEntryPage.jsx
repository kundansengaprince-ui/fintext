import { useState } from 'react'
import { ChevronDown, ChevronRight, TrendingUp, Receipt, Package, Users, CheckCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import SalesForm from '../components/sales/SalesForm'
import ExpenseForm from '../components/expenses/ExpenseForm'
import InventoryRecordForm from '../components/inventory/InventoryRecordForm'
import CustomerForm from '../components/customers/CustomerForm'

const today = () => new Date().toISOString().split('T')[0]

const sections = [
  { key: 'sales',     label: 'Sales',     icon: TrendingUp },
  { key: 'expense',   label: 'Expense',   icon: Receipt    },
  { key: 'inventory', label: 'Inventory', icon: Package    },
  { key: 'customers', label: 'Customers', icon: Users      },
]

function Section({ label, icon: Icon, open, onToggle, done, children }) {
  return (
    <Card>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          {done
            ? <CheckCircle size={18} style={{ color: '#0E3B2E' }} />
            : <Icon size={18} style={{ color: open ? '#0E3B2E' : '#7A9184' }} />
          }
          <span className="font-semibold" style={{ color: done ? '#0E3B2E' : '#0A2820' }}>{label}</span>
          {done && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(14,59,46,0.08)', color: '#0E3B2E' }}>
              Saved
            </span>
          )}
        </div>
        {open
          ? <ChevronDown size={16} style={{ color: '#7A9184' }} />
          : <ChevronRight size={16} style={{ color: '#B7C4BC' }} />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4" style={{ borderTop: '1px solid #E2E9E5' }}>
          {children}
        </div>
      )}
    </Card>
  )
}

export default function DailyEntryPage() {
  const [date, setDate] = useState(today())
  const [open, setOpen] = useState('sales')
  const [saved, setSaved] = useState({})

  const toggle  = (key) => setOpen(o => o === key ? null : key)
  const markDone = (key) => { setSaved(s => ({ ...s, [key]: true })); setOpen(null) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Daily Entry</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7A9184' }}>Log all data for a single day in one place</p>
      </div>

      <Card className="px-5 py-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium shrink-0" style={{ color: '#3D4F47' }}>Entry Date</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved({}) }}
            className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E3B2E]"
            style={{ border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }}
          />
          {Object.keys(saved).length > 0 && (
            <span className="text-xs font-medium" style={{ color: '#0E3B2E' }}>
              {Object.keys(saved).length} of {sections.length} sections saved
            </span>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {sections.map(({ key, label, icon }) => (
          <Section key={key} label={label} icon={icon} done={!!saved[key]}
            open={open === key} onToggle={() => toggle(key)}>
            {key === 'sales'     && <SalesForm existing={{ date }} onDone={() => markDone('sales')} prefillDate={date} />}
            {key === 'expense'   && <ExpenseForm existing={{ date }} onDone={() => markDone('expense')} prefillDate={date} />}
            {key === 'inventory' && <InventoryRecordForm existing={{ date }} onDone={() => markDone('inventory')} prefillDate={date} />}
            {key === 'customers' && <CustomerForm existing={{ date }} onDone={() => markDone('customers')} prefillDate={date} />}
          </Section>
        ))}
      </div>
    </div>
  )
}
