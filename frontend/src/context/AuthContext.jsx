import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api'

const AuthContext = createContext(null)

const INACTIVE_MS  = 10 * 60 * 1000  // 10 min before warning
const COUNTDOWN_S  = 60               // 60 s to react before auto-logout
const EVENTS       = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [business, setBusiness] = useState(() => {
    try { return JSON.parse(localStorage.getItem('business')) } catch { return null }
  })
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown]     = useState(COUNTDOWN_S)

  const inactiveTimer  = useRef(null)
  const countdownTimer = useRef(null)

  const clearTimers = () => {
    clearTimeout(inactiveTimer.current)
    clearInterval(countdownTimer.current)
  }

  const signOut = useCallback(async (reason) => {
    clearTimers()
    try { await apiLogout() } catch (_e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('business')
    if (reason === 'idle') localStorage.setItem('logout_reason', 'idle')
    setUser(null)
    setBusiness(null)
    setShowWarning(false)
  }, [])

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true)
    setCountdown(COUNTDOWN_S)
    let s = COUNTDOWN_S
    countdownTimer.current = setInterval(() => {
      s -= 1
      setCountdown(s)
      if (s <= 0) {
        clearInterval(countdownTimer.current)
        signOut('idle')
      }
    }, 1000)
  }, [signOut])

  const resetIdleTimer = useCallback(() => {
    if (!user) return
    clearTimers()
    setShowWarning(false)
    inactiveTimer.current = setTimeout(startWarningCountdown, INACTIVE_MS)
  }, [user, startWarningCountdown])

  // Attach/detach activity listeners when user is logged in
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(startWarningCountdown, INACTIVE_MS)
    EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }))
    return () => {
      clearTimeout(timer)
      clearTimers()
      EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer))
    }
  }, [user, resetIdleTimer, startWarningCountdown])

  const signIn = useCallback(async (credentials) => {
    const { data } = await apiLogin(credentials)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('business', JSON.stringify(data.business))
    localStorage.removeItem('logout_reason')
    setUser(data.user)
    setBusiness(data.business)
    return data.user
  }, [])

  const role = user?.role ?? null

  const can = {
    viewDashboard:  ['MANAGER', 'FINANCE_OFFICER', 'IT_ADMIN'].includes(role),
    viewSales:      ['MANAGER', 'CASHIER', 'FINANCE_OFFICER', 'IT_ADMIN'].includes(role),
    editSales:      ['MANAGER', 'CASHIER'].includes(role),
    viewExpenses:   ['MANAGER', 'FINANCE_OFFICER', 'IT_ADMIN'].includes(role),
    editExpenses:   ['MANAGER', 'FINANCE_OFFICER'].includes(role),
    viewInventory:  ['MANAGER', 'FINANCE_OFFICER', 'IT_ADMIN'].includes(role),
    editInventory:  ['MANAGER'].includes(role),
    viewCustomers:  ['MANAGER', 'FINANCE_OFFICER', 'FLOOR_STAFF', 'IT_ADMIN'].includes(role),
    editCustomers:  ['MANAGER', 'FLOOR_STAFF'].includes(role),
    computeScore:   ['MANAGER'].includes(role),
    viewReports:    ['MANAGER', 'FINANCE_OFFICER', 'IT_ADMIN'].includes(role),
    manageTeam:     ['MANAGER', 'IT_ADMIN'].includes(role),
  }

  return (
    <AuthContext.Provider value={{ user, business, role, can, signIn, signOut }}>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Still there?</h2>
            <p className="text-gray-400 text-sm mb-6">
              You've been inactive. You'll be signed out in{' '}
              <span className="text-yellow-400 font-semibold">{countdown}s</span>
            </p>
            <button
              onClick={resetIdleTimer}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Yes, keep me signed in
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) // eslint-disable-line react-refresh/only-export-components
