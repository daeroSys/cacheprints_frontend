import { useState, useEffect } from 'react'
import { AppProvider, useApp, setCurrentUserRef } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'
import Materials from './pages/Materials'
import Stock from './pages/Stock'
import Transactions from './pages/Transactions'
import Purchases from './pages/Purchases'
import Orders from './pages/Orders'
import Production from './pages/Production'
import DesignFiles from './pages/DesignFiles'
import Reports from './pages/Reports'
import Archive from './pages/Archive'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'
import Users from './pages/Users'

// ── Authenticated shell ──────────────────────────────────────
function AppInner() {
  const [page, setPage] = useState('dashboard')
  const { lowStockItems } = useApp()
  const criticalCount = lowStockItems.filter(m => m.status === 'Critical').length
  const lowCount = lowStockItems.filter(m => m.status === 'Low').length
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'Admin'

  // Keep AppContext aware of current user for activity logging
  useEffect(() => { setCurrentUserRef(currentUser) }, [currentUser])

  // Staff-restricted pages fallback
  const STAFF_PAGES = ['dashboard', 'materials', 'stock', 'transactions', 'purchases', 'orders', 'production', 'designs', 'reports', 'account']

  const safePage = (!isAdmin && !STAFF_PAGES.includes(page)) ? 'dashboard' : page

  const render = () => {
    switch (safePage) {
      case 'dashboard': return <Dashboard onNav={setPage} />
      case 'materials': return <Materials />
      case 'stock': return <Stock />
      case 'transactions': return <Transactions />
      case 'purchases': return <Purchases onNav={setPage} />
      case 'orders': return <Orders />
      case 'production': return <Production />
      case 'designs': return <DesignFiles />
      case 'reports': return <Reports />
      case 'archive': return isAdmin ? <Archive onNav={setPage} /> : <Dashboard onNav={setPage} />
      case 'activity': return isAdmin ? <ActivityLog /> : <Dashboard onNav={setPage} />
      case 'users': return isAdmin ? <Users /> : <Dashboard onNav={setPage} />
      case 'settings': return isAdmin ? <Settings /> : <Dashboard onNav={setPage} />
      case 'account': return <Account />
      default: return <Dashboard onNav={setPage} />
    }
  }

  return (
    <AppLayout activePage={safePage} onNav={setPage} lowStockCount={lowCount} criticalStockCount={criticalCount}>
      {render()}
    </AppLayout>
  )
}

// ── Auth gate ────────────────────────────────────────────────
function AuthGate() {
  const { currentUser, loading } = useAuth()
  const [authPage, setAuthPage] = useState('login')

  // Show loading screen while checking for existing session
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f5f5f5',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid #e0e0e0',
          borderTopColor: '#0d0d0d',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#888', fontSize: 14 }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!currentUser) {
    if (authPage === 'signup') return <Signup onNavigateLogin={() => setAuthPage('login')} />
    return <Login onNavigateSignup={() => setAuthPage('signup')} />
  }

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
