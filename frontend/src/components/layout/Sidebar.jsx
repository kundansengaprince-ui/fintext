import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Receipt, Package, Users, UserCog, BarChart2, LogOut, Activity, ShieldCheck, ClipboardList, ShoppingCart, UtensilsCrossed, History } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const roleColors = {
  MANAGER:         'bg-purple-100 text-purple-700',
  CASHIER:         'bg-blue-100 text-blue-700',
  FINANCE_OFFICER: 'bg-green-100 text-green-700',
  IT_ADMIN:        'bg-gray-100 text-gray-700',
  FLOOR_STAFF:     'bg-yellow-100 text-yellow-700',
}

const roleLabels = {
  MANAGER:         'Manager',
  CASHIER:         'Cashier',
  FINANCE_OFFICER: 'Finance Officer',
  IT_ADMIN:        'IT Admin',
  FLOOR_STAFF:     'Floor Staff',
}

export default function Sidebar() {
  const { user, business, can, signOut } = useAuth()

  const navItems = [
    { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  show: can.viewDashboard },
    { to: '/daily-entry', icon: ClipboardList,    label: 'Daily Entry',  show: can.editSales || can.editExpenses || can.editInventory || can.editCustomers },
    { to: '/pos',          icon: ShoppingCart,    label: 'POS',               show: can.editSales },
    { to: '/transactions', icon: History,         label: 'Transactions',      show: can.viewSales },
    { to: '/menu',         icon: UtensilsCrossed, label: 'Menu',              show: can.manageTeam },
    { to: '/sales',       icon: TrendingUp,       label: 'Sales',        show: can.viewSales },
    { to: '/expenses',  icon: Receipt,         label: 'Expenses',   show: can.viewExpenses },
    { to: '/inventory', icon: Package,         label: 'Inventory',  show: can.viewInventory },
    { to: '/customers', icon: Users,           label: 'Customers',  show: can.viewCustomers },
    { to: '/reports',   icon: BarChart2,    label: 'Reports',    show: can.viewReports },
    { to: '/team',      icon: UserCog,      label: 'Team',       show: can.manageTeam },
    { to: '/audit',     icon: ShieldCheck,  label: 'Audit Log',  show: can.manageTeam },
  ].filter(item => item.show)

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Activity size={18} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{business?.name ?? 'My Business'}</p>
            <p className="text-xs text-gray-400">Health Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: NavIcon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-indigo-600 text-white'
                 : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <NavIcon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
            {(user?.first_name?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user?.role] ?? 'bg-gray-700 text-gray-300'}`}>
              {roleLabels[user?.role] ?? user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
