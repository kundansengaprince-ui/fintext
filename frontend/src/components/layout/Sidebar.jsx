import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Receipt, Package, Users, UserCog, BarChart2, LogOut, ShieldCheck, ClipboardList, ShoppingCart, UtensilsCrossed, History } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/IMG_2569.PNG'

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
    { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    show: can.viewDashboard },
    { to: '/daily-entry',  icon: ClipboardList,   label: 'Daily Entry',  show: can.editSales || can.editExpenses || can.editInventory || can.editCustomers },
    { to: '/pos',          icon: ShoppingCart,    label: 'POS',          show: can.editSales },
    { to: '/transactions', icon: History,         label: 'Transactions', show: can.viewSales },
    { to: '/menu',         icon: UtensilsCrossed, label: 'Menu',         show: can.manageTeam },
    { to: '/sales',        icon: TrendingUp,      label: 'Sales',        show: can.viewSales },
    { to: '/expenses',     icon: Receipt,         label: 'Expenses',     show: can.viewExpenses },
    { to: '/inventory',    icon: Package,         label: 'Inventory',    show: can.viewInventory },
    { to: '/customers',    icon: Users,           label: 'Customers',    show: can.viewCustomers },
    { to: '/reports',      icon: BarChart2,       label: 'Reports',      show: can.viewReports },
    { to: '/team',         icon: UserCog,         label: 'Team',         show: can.manageTeam },
    { to: '/audit',        icon: ShieldCheck,     label: 'Audit Log',    show: can.manageTeam },
  ].filter(item => item.show)

  const initials = (user?.first_name?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: '#0A2820',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Brand lockup */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo} alt="FinText" style={{
            width: 34, height: 34, borderRadius: 9, objectFit: 'cover', flexShrink: 0,
          }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {business?.name ?? 'My Business'}
            </p>
            <p style={{ fontSize: 11, color: '#7A9184', margin: 0, marginTop: 2 }}>Health Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10, marginBottom: 2,
              fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
              background: isActive ? '#164C3B' : 'transparent',
              color: isActive ? '#fff' : '#7A9184',
            })}
            onMouseEnter={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A9184' }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', marginBottom: 4 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#164C3B', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#B7C4BC', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: '#7A9184', margin: 0, marginTop: 1 }}>
              {roleLabels[user?.role] ?? user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 10, border: 'none',
            background: 'transparent', color: '#7A9184', fontSize: 13,
            cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A9184' }}
        >
          <LogOut size={15} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
