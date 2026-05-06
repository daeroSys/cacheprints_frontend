import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login({ onNavigateSignup }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Please enter your username or ID number.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    const result = await login(username.trim(), password)
    setLoading(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="login-page">
      <div className="login-card animate-scale-in">

        {/* ── Black header section ── */}
        <div className="login-card__header">
          <img src="/CachePrints_Logo.png" alt="CachePrints Logo" className="login-card__logo-img" />
          <p className="login-card__subtitle">Inventory Management System</p>
        </div>

        {/* ── White form body ── */}
        <div className="login-card__body">
          <h1 className="login-card__title">Sign In</h1>
          <p className="login-card__desc">Enter your credentials to access the system.</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-form__group">
              <label className="login-form__label">Username or ID Number</label>
              <input
                className="login-form__input"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="e.g. Admin"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="login-form__group">
              <label className="login-form__label">Password</label>
              <div className="login-form__pw-wrap">
                <input
                  className="login-form__input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" className="login-form__pw-toggle" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-form__error animate-fade-in">
                ⚠ {error}
              </div>
            )}

            <button type="submit" className={`login-form__btn ${loading ? 'login-form__btn--loading' : ''}`} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="login-card__footer">
            <p>Don't have an account?{' '}
              <button className="login-card__link" onClick={onNavigateSignup}>Create account</button>
            </p>
          </div>
        </div>
      </div>

      <p className="login-page__credit">CachePrint's © {new Date().getFullYear()}</p>
    </div>
  )
}
