import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import './Header.css'

const PAGE_TITLES = {
  dashboard:'Dashboard', materials:'Materials Database',
  stock:'Stock Level Tracking', transactions:'Inventory Transactions',
  purchases:'Purchase Management', orders:'Job Orders',
  production:'Production Tracking', designs:'Design File Storage',
  reports:'Reports & Analytics', archive:'Archive',
  activity:'Activity Log', settings:'Settings', account:'My Account',
}

export default function Header({ activePage, lowStockCount, criticalStockCount, onNav }) {
  const { currentUser, logout } = useAuth()
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  // Close account dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const avatarInitials = (currentUser?.name || currentUser?.username || 'A').slice(0, 2).toUpperCase()

  const handleLogout = () => {
    setAccountOpen(false)
    logout()
  }

  const handleAccount = () => {
    setAccountOpen(false)
    onNav('account')
  }

  return (
    <header className="header">
      <div className="header__left">
        <h2 className="header__page-title">{PAGE_TITLES[activePage] || 'Dashboard'}</h2>
      </div>
      <div className="header__right">
        {/* Notification bell */}
        <div className="header__notif-wrap">
          <button className="header__icon-btn" onClick={() => { setNotifOpen(o=>!o); setAccountOpen(false) }} aria-label="Notifications">
            <span className="header__icon">🔔</span>
            {(lowStockCount + criticalStockCount) > 0 && <span className="header__notif-dot">{lowStockCount + criticalStockCount}</span>}
          </button>
          {notifOpen && (
            <div className="header__notif-dropdown animate-scale-in">
              <p className="header__notif-title">Notifications</p>
              {criticalStockCount > 0 && (
                <div className="header__notif-item header__notif-item--danger"><span>🚨</span><span>{criticalStockCount} material{criticalStockCount>1?'s':''} at critical stock</span></div>
              )}
              {lowStockCount > 0 && (
                <div className="header__notif-item header__notif-item--warn"><span>⚠</span><span>{lowStockCount} material{lowStockCount>1?'s':''} at low stock</span></div>
              )}
              {(lowStockCount + criticalStockCount) === 0 && (
                <p className="header__notif-empty">No new notifications</p>
              )}
            </div>
          )}
        </div>

        {/* Account button + dropdown */}
        <div className="header__account-wrap" ref={accountRef}>
          <button
            className={`header__account ${accountOpen ? 'header__account--open' : ''}`}
            onClick={() => { setAccountOpen(o=>!o); setNotifOpen(false) }}
          >
            <div className="header__avatar">{avatarInitials}</div>
            <div className="header__account-info">
              <span className="header__account-name">{currentUser?.name || currentUser?.username || 'Admin'}</span>
              <span className="header__account-role">{currentUser?.role || 'Admin'}</span>
            </div>
            <span className="header__account-chevron">{accountOpen ? '▴' : '▾'}</span>
          </button>

          {accountOpen && (
            <div className="header__account-dropdown animate-scale-in">
              <div className="header__acct-user">
                <div className="header__acct-avatar">{avatarInitials}</div>
                <div>
                  <p className="header__acct-name">{currentUser?.name || currentUser?.username}</p>
                  <p className="header__acct-email">{currentUser?.email || ''}</p>
                </div>
              </div>
              <div className="header__acct-divider" />
              <button className="header__acct-item" onClick={handleAccount}>
                <span className="header__acct-icon">◧</span>
                Account
              </button>
              <button className="header__acct-item header__acct-item--danger" onClick={handleLogout}>
                <span className="header__acct-icon">↩</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
