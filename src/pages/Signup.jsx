import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'
import './Signup.css'

const ROLES = ['Staff', 'Admin']

export default function Signup({ onNavigateLogin }) {
  const { signup } = useAuth()
  const [form, setForm] = useState({ username: '', name: '', email: '', contact: '', role: 'Staff', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Admin approval modal state
  const [approvalModal, setApprovalModal] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPwd, setAdminPwd] = useState('')
  const [showAdminPwd, setShowAdminPwd] = useState(false)
  const [approvalError, setApprovalError] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)

  const sf = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); setGlobalError('') }

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required.'
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters.'
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Only letters, numbers, and underscores allowed.'
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (form.contact && !/^[0-9+\-\s()]{7,15}$/.test(form.contact)) e.contact = 'Enter a valid contact number.'
    if (!form.password) e.password = 'Password is required.'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must include at least one uppercase letter.'
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must include at least one number.'
    if (!form.confirm) e.confirm = 'Please re-type your password.'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Step 1: Validate form, then open approval modal
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    setAdminUser(''); setAdminPwd(''); setApprovalError('')
    setApprovalModal(true)
  }

  // Step 2: Verify admin then create account (single API call)
  const handleApprove = async () => {
    if (!adminUser.trim()) { setApprovalError('Please enter the admin username.'); return }
    if (!adminPwd) { setApprovalError('Please enter the admin password.'); return }
    setApprovalLoading(true)
    const result = await signup({
      username: form.username,
      name: form.name,
      email: form.email,
      contact: form.contact,
      role: form.role,
      password: form.password,
      adminUsername: adminUser.trim(),
      adminPassword: adminPwd,
    })
    setApprovalLoading(false)
    if (!result.ok) { setApprovalError(result.error); return }
    setApprovalModal(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card animate-scale-in">
          <div className="login-card__header">
            <img src="/CachePrints_Logo.png" alt="CachePrints Logo" className="login-card__logo-img" />
            <p className="login-card__subtitle">Inventory Management System</p>
          </div>
          <div className="login-card__body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d0d0d', marginBottom: 6 }}>Account Created!</h2>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 22 }}>Your account has been approved and created. You can now sign in.</p>
            <button className="login-form__btn" onClick={onNavigateLogin}>Go to Sign In</button>
          </div>
        </div>
        <p className="login-page__credit">CachePrint's © {new Date().getFullYear()}</p>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card signup-card animate-scale-in">
        <div className="login-card__header">
          <img src="/CachePrints_Logo.png" alt="CachePrints Logo" className="login-card__logo-img" />
          <p className="login-card__subtitle">Inventory Management System</p>
        </div>

        <div className="login-card__body">
          <h1 className="login-card__title">Create Account</h1>
          <p className="login-card__desc">Fill in your details. An Administrator must approve the account creation.</p>

          {globalError && <div className="login-form__error animate-fade-in" style={{ marginBottom: 14 }}>⚠ {globalError}</div>}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="signup-row">
              <div className="login-form__group">
                <label className="login-form__label">Username *</label>
                <input className={`login-form__input ${errors.username ? 'input-err' : ''}`} value={form.username} onChange={e => sf('username', e.target.value)} placeholder="e.g. JuanD" autoComplete="username" />
                {errors.username && <p className="signup-field-error">{errors.username}</p>}
              </div>
              <div className="login-form__group">
                <label className="login-form__label">Full Name *</label>
                <input className={`login-form__input ${errors.name ? 'input-err' : ''}`} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Juan Dela Cruz" />
                {errors.name && <p className="signup-field-error">{errors.name}</p>}
              </div>
            </div>

            <div className="signup-row">
              <div className="login-form__group">
                <label className="login-form__label">Email Address *</label>
                <input className={`login-form__input ${errors.email ? 'input-err' : ''}`} type="email" value={form.email} onChange={e => sf('email', e.target.value)} placeholder="juan@email.com" />
                {errors.email && <p className="signup-field-error">{errors.email}</p>}
              </div>
              <div className="login-form__group">
                <label className="login-form__label">Contact Number</label>
                <input className={`login-form__input ${errors.contact ? 'input-err' : ''}`} value={form.contact} onChange={e => sf('contact', e.target.value)} placeholder="09xx xxx xxxx" />
                {errors.contact && <p className="signup-field-error">{errors.contact}</p>}
              </div>
            </div>

            <div className="login-form__group">
              <label className="login-form__label">Role *</label>
              <div className="signup-role-group">
                {ROLES.map(r => (
                  <button key={r} type="button" className={`signup-role-btn ${form.role === r ? 'signup-role-btn--active' : ''}`} onClick={() => sf('role', r)}>
                    <span className="signup-role-icon">{r === 'Admin' ? '◈' : '◧'}</span>
                    <span className="signup-role-label">{r}</span>
                    <span className="signup-role-desc">{r === 'Admin' ? 'Full system access' : 'Limited access'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="signup-row">
              <div className="login-form__group">
                <label className="login-form__label">Password *</label>
                <div className="login-form__pw-wrap">
                  <input className={`login-form__input ${errors.password ? 'input-err' : ''}`} type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => sf('password', e.target.value)} placeholder="Min 6 · 1 uppercase · 1 number" autoComplete="new-password" />
                  <button type="button" className="login-form__pw-toggle" onClick={() => setShowPwd(p => !p)}>{showPwd ? '🙈' : '👁'}</button>
                </div>
                {errors.password && <p className="signup-field-error">{errors.password}</p>}
              </div>
              <div className="login-form__group">
                <label className="login-form__label">Re-type Password *</label>
                <div className="login-form__pw-wrap">
                  <input className={`login-form__input ${errors.confirm ? 'input-err' : ''}`} type={showConf ? 'text' : 'password'} value={form.confirm} onChange={e => sf('confirm', e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
                  <button type="button" className="login-form__pw-toggle" onClick={() => setShowConf(p => !p)}>{showConf ? '🙈' : '👁'}</button>
                </div>
                {errors.confirm && <p className="signup-field-error">{errors.confirm}</p>}
                {form.confirm && form.password && form.confirm === form.password && !errors.confirm && (
                  <p style={{ fontSize: 11, color: '#2e7d32', marginTop: 3 }}>✓ Passwords match</p>
                )}
              </div>
            </div>

            <div className="signup-pwd-hint">
              Password: min. 6 characters, at least 1 uppercase letter, 1 number.
            </div>

            <button type="submit" className="login-form__btn">
              Continue to Admin Approval →
            </button>
          </form>

          <div className="login-card__footer">
            <p>Already have an account?{' '}
              <button className="login-card__link" onClick={onNavigateLogin}>Sign in</button>
            </p>
          </div>
        </div>
      </div>

      {/* ── Admin Approval Modal ── */}
      {approvalModal && (
        <div className="approval-overlay" onClick={e => e.target === e.currentTarget && setApprovalModal(false)}>
          <div className="approval-card animate-scale-in">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: '#0d0d0d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>🔐</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0d0d0d', marginBottom: 4 }}>Admin Approval Required</h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                An Administrator must verify and approve this account creation.<br />
                Please enter the admin credentials below.
              </p>
            </div>

            <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#888' }}>New account</span>
                <strong style={{ color: '#0d0d0d' }}>@{form.username}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Role</span>
                <strong style={{ color: '#0d0d0d' }}>{form.role}</strong>
              </div>
            </div>

            {approvalError && (
              <div style={{ background: '#fdecea', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 13, borderLeft: '3px solid #e53935', marginBottom: 14 }}>
                ⚠ {approvalError}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="login-form__label" style={{ display: 'block', marginBottom: 6 }}>Admin Username</label>
              <input
                className="login-form__input"
                style={{ background: '#fff' }}
                value={adminUser}
                onChange={e => { setAdminUser(e.target.value); setApprovalError('') }}
                placeholder="Admin username"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="login-form__label" style={{ display: 'block', marginBottom: 6 }}>Admin Password</label>
              <div className="login-form__pw-wrap">
                <input
                  className="login-form__input"
                  style={{ background: '#fff' }}
                  type={showAdminPwd ? 'text' : 'password'}
                  value={adminPwd}
                  onChange={e => { setAdminPwd(e.target.value); setApprovalError('') }}
                  placeholder="Admin password"
                  onKeyDown={e => e.key === 'Enter' && handleApprove()}
                />
                <button type="button" className="login-form__pw-toggle" onClick={() => setShowAdminPwd(p => !p)}>{showAdminPwd ? '🙈' : '👁'}</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="login-form__btn" style={{ background: '#f0f0f0', color: '#444', flex: 1 }} onClick={() => setApprovalModal(false)}>Cancel</button>
              <button
                className={`login-form__btn ${approvalLoading ? 'login-form__btn--loading' : ''}`}
                style={{ flex: 2 }}
                disabled={approvalLoading}
                onClick={handleApprove}
              >
                {approvalLoading ? 'Verifying…' : 'Approve & Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="login-page__credit">CachePrint's © {new Date().getFullYear()}</p>
    </div>
  )
}
