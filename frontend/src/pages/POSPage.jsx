import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMenuItems, createTransaction } from '../api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle, Save, X } from 'lucide-react'
import useDraft from '../utils/useDraft'

const today = () => new Date().toISOString().split('T')[0]
const fmt   = (n) => Number(n).toLocaleString('en-RW', { maximumFractionDigits: 0 })

const DRAFT_KEY = 'pos_draft'
const CAT_LABEL = { food: 'Food', beverage: 'Beverages', other: 'Other' }

export default function POSPage() {
  const qc = useQueryClient()
  const [date, setDate]         = useState(today())
  const [notes, setNotes]       = useState('')
  const [lastTxn, setLastTxn]   = useState(null)
  const [cartOpen, setCartOpen] = useState(false)   // mobile cart drawer

  const [cart, setCart, clearDraft, hasDraft] = useDraft(DRAFT_KEY, {})

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => getMenuItems({ available_only: true }).then(r => r.data.results ?? r.data),
  })

  const categories = [...new Set(menuItems.map(i => i.category))]

  const addItem = (item) =>
    setCart(c => ({ ...c, [item.id]: { ...item, qty: (c[item.id]?.qty ?? 0) + 1 } }))

  const changeQty = (id, delta) =>
    setCart(c => {
      const next = (c[id]?.qty ?? 0) + delta
      if (next <= 0) { const { [id]: _, ...rest } = c; return rest }
      return { ...c, [id]: { ...c[id], qty: next } }
    })

  const cartItems = Object.values(cart)
  const total     = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0)
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0)

  const complete = useMutation({
    mutationFn: () => createTransaction({
      date,
      notes,
      status: 'completed',
      items: cartItems.map(i => ({ menu_item: i.id, quantity: i.qty })),
    }),
    onSuccess: (res) => {
      setLastTxn(res.data)
      clearDraft()
      setNotes('')
      setCartOpen(false)
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory-records'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast.success(`Order #${res.data.id} saved — RWF ${fmt(res.data.total)}`)
    },
    onError: () => toast.error('Could not save order.'),
  })

  const OrderPanel = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ShoppingCart size={16} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-800">Current Order</h2>
        {itemCount > 0 && (
          <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
            {itemCount} items
          </span>
        )}
        {/* Close button — mobile only */}
        <button onClick={() => setCartOpen(false)} className="lg:hidden ml-2 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {cartItems.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No items added yet</p>
        ) : (
          cartItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">RWF {fmt(item.price)} each</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => changeQty(item.id, -1)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                  <Minus size={12} />
                </button>
                <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                <button onClick={() => changeQty(item.id, 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors">
                  <Plus size={12} />
                </button>
                <button onClick={() => changeQty(item.id, -item.qty)}
                  className="w-7 h-7 rounded-full hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-sm font-semibold text-gray-900 w-20 text-right shrink-0">
                RWF {fmt(parseFloat(item.price) * item.qty)}
              </p>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">RWF {fmt(total)}</span>
          </div>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          <Button className="w-full justify-center" disabled={complete.isPending} onClick={() => complete.mutate()}>
            <CheckCircle size={15} />
            {complete.isPending ? 'Saving…' : 'Complete Order'}
          </Button>
          <button onClick={clearDraft} className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors">
            Clear order
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-6rem)]">

      {/* ── Left: menu grid ── */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-24 lg:pb-0 pr-0 lg:pr-1">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tap items to add to order</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hasDraft && cartItems.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
                <Save size={12} /> Draft restored
              </span>
            )}
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* Last order confirmation */}
        {lastTxn && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Order #{lastTxn.id} saved — RWF {fmt(lastTxn.total)}</p>
              <p className="text-xs text-emerald-500">Sales &amp; inventory updated automatically</p>
            </div>
            <button onClick={() => setLastTxn(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Menu items */}
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading menu…</div>
        ) : menuItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 font-medium">No menu items yet.</p>
            <p className="text-gray-400 text-sm mt-1">Ask a manager to add items in Menu Management.</p>
          </Card>
        ) : (
          categories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {CAT_LABEL[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {menuItems.filter(i => i.category === cat).map(item => {
                  const inCart = cart[item.id]?.qty ?? 0
                  return (
                    <button key={item.id} onClick={() => addItem(item)}
                      className={`relative text-left p-4 rounded-2xl border-2 transition-all active:scale-95
                        ${inCart > 0
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                        }`}
                    >
                      {inCart > 0 && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                          {inCart}
                        </span>
                      )}
                      <p className="font-semibold text-gray-800 text-sm leading-snug pr-6">{item.name}</p>
                      <p className="text-indigo-600 font-bold text-sm mt-1">RWF {fmt(item.price)}</p>
                      {item.inventory_item_name && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">📦 {item.inventory_item_name}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Right: order panel — desktop sidebar ── */}
      <div className="hidden lg:flex w-80 shrink-0">
        <Card className="flex-1 flex flex-col overflow-hidden w-full">
          <OrderPanel />
        </Card>
      </div>

      {/* ── Mobile: sticky cart button + slide-up drawer ── */}
      <div className="lg:hidden">
        {/* Sticky cart button */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-lg font-semibold text-sm active:scale-95 transition-transform"
          >
            <ShoppingCart size={18} />
            {itemCount > 0 ? `${itemCount} items · RWF ${fmt(total)}` : 'Cart'}
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Backdrop */}
        {cartOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
        )}

        {/* Slide-up drawer */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 max-h-[85vh] flex flex-col
          ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <OrderPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
