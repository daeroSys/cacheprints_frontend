import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import './PageCommon.css'
import './Account.css'

export default function Account() {
  const { currentUser, updateProfile, changePassword } = useAuth()
  const isStaff = currentUser?.role === 'Staff'

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    contact: currentUser?.contact || '',
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const [pwdModal, setPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ old: '', newPwd: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState({})
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)

  const pf = (k, v) => setProfileForm(p => ({ ...p, [k]: v }))
  const pwf = (k, v) => setPwdForm(p => ({ ...p, [k]: v }))

  const validateProfile = () => {
    const e = {}
    if (!profileForm.name.trim()) e.name = 'Full name is required.'
    if (!profileForm.email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) e.email = 'Enter a valid email.'
    setProfileErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfile()) return
    setProfileLoading(true)
    const result = await updateProfile(profileForm)
    setProfileLoading(false)
    if (!result.ok) {
      setProfileErrors({ name: result.error })
      return
    }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  const validatePwd = () => {
    const e = {}
    if (!pwdForm.old) e.old = 'Enter your current password.'
    if (!pwdForm.newPwd) e.newPwd = 'Enter a new password.'
    else if (pwdForm.newPwd.length < 6) e.newPwd = 'Must be at least 6 characters.'
    else if (!/[A-Z]/.test(pwdForm.newPwd)) e.newPwd = 'Must contain at least one uppercase letter.'
    else if (!/[0-9]/.test(pwdForm.newPwd)) e.newPwd = 'Must contain at least one number.'
    if (!pwdForm.confirm) e.confirm = 'Re-type your new password.'
    else if (pwdForm.confirm !== pwdForm.newPwd) e.confirm = 'Passwords do not match.'
    setPwdErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChangePwd = async () => {
    if (!validatePwd()) return
    setPwdLoading(true)
    const result = await changePassword(pwdForm.old, pwdForm.newPwd)
    setPwdLoading(false)
    if (!result.ok) { setPwdErrors(p => ({ ...p, old: result.error })); return }
    setPwdSaved(true)
    setPwdForm({ old: '', newPwd: '', confirm: '' })
    setTimeout(() => { setPwdSaved(false); setPwdModal(false) }, 1800)
  }

  const roleBadgeColor = currentUser?.role === 'Admin' ? '#0d0d0d' : '#1565c0'
  const avatarInitials = (currentUser?.name || currentUser?.username || 'U').slice(0, 2).toUpperCase()

  return (
    <div>
      <PageHeader title="My Account" subtitle="Manage your profile and account settings" />

      <div className="account-layout">
        {/* Profile card */}
        <div className="account-profile-card animate-fade-up">
          <div className="account-avatar-wrap">
            <div className="account-avatar">{avatarInitials}</div>
          </div>
          <p className="account-username">@{currentUser?.username}</p>
          <span className="account-role-badge" style={{ background: roleBadgeColor }}>
            {currentUser?.role}
          </span>
          <div className="account-meta">
            <div className="account-meta-row"><span>Member since</span><strong>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : '—'}</strong></div>
            <div className="account-meta-row"><span>Username</span><strong>{currentUser?.username}</strong></div>
            <div className="account-meta-row"><span>Role</span><strong>{currentUser?.role}</strong></div>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => { setPwdModal(true); setPwdErrors({}); setPwdSaved(false) }}>
            🔒 Change Password
          </button>
        </div>

        {/* Edit profile form */}
        <div className="account-form-card animate-fade-up delay-1">
          <h3 className="section-card__title" style={{ marginBottom: 20 }}>Profile Information</h3>

          <div className="form-group">
            <label className="form-label">Full Name * <span style={{ fontSize: 10, background: '#fdecea', color: '#c62828', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600 }}>Locked</span></label>
            <input
              className="form-input"
              value={profileForm.name}
              disabled
              style={{ background: 'var(--gray-surface)', color: 'var(--gray-mid)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address * <span style={{ fontSize: 10, background: '#fdecea', color: '#c62828', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600 }}>Locked</span></label>
            <input
              className="form-input"
              type="email"
              value={profileForm.email}
              disabled
              style={{ background: 'var(--gray-surface)', color: 'var(--gray-mid)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Number <span style={{ fontSize: 10, background: '#fdecea', color: '#c62828', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600 }}>Locked</span></label>
            <input
              className="form-input"
              value={profileForm.contact}
              disabled
              style={{ background: 'var(--gray-surface)', color: 'var(--gray-mid)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: 4 }}>
            <label className="form-label">Username</label>
            <input className="form-input" value={currentUser?.username || ''} disabled style={{ background: 'var(--gray-surface)', color: 'var(--gray-mid)', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 3 }}>Username cannot be changed after account creation.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" value={currentUser?.role || ''} disabled style={{ background: 'var(--gray-surface)', color: 'var(--gray-mid)', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 3 }}>Role is assigned by the administrator.</p>
          </div>

          <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8f9fa', borderRadius: 'var(--radius-md)', border: '1px dashed var(--gray-border)' }}>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5 }}>
              <strong>Note:</strong> Profile information is managed by the system administrator. If you need to update your details, please contact your IT support or administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={pwdModal} onClose={() => setPwdModal(false)} title="Change Password" size="sm">
        {pwdSaved ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
            <p style={{ fontWeight: 600, color: '#2e7d32', fontSize: 15 }}>Password changed successfully!</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input className={`form-input ${pwdErrors.old ? 'input-error' : ''}`} type={showOld ? 'text' : 'password'} value={pwdForm.old} onChange={e => pwf('old', e.target.value)} placeholder="Your current password" style={{ paddingRight: 40 }} />
                <button type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowOld(p => !p)}>{showOld ? '🙈' : '👁️'}</button>
              </div>
              {pwdErrors.old && <p className="field-error">{pwdErrors.old}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <div style={{ position: 'relative' }}>
                <input className={`form-input ${pwdErrors.newPwd ? 'input-error' : ''}`} type={showNew ? 'text' : 'password'} value={pwdForm.newPwd} onChange={e => pwf('newPwd', e.target.value)} placeholder="Min 6 chars, 1 uppercase, 1 number" style={{ paddingRight: 40 }} />
                <button type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowNew(p => !p)}>{showNew ? '🙈' : '👁️'}</button>
              </div>
              {pwdErrors.newPwd && <p className="field-error">{pwdErrors.newPwd}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Re-type New Password *</label>
              <div style={{ position: 'relative' }}>
                <input className={`form-input ${pwdErrors.confirm ? 'input-error' : ''}`} type={showConf ? 'text' : 'password'} value={pwdForm.confirm} onChange={e => pwf('confirm', e.target.value)} placeholder="Repeat new password" style={{ paddingRight: 40 }} />
                <button type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowConf(p => !p)}>{showConf ? '🙈' : '👁️'}</button>
              </div>
              {pwdErrors.confirm && <p className="field-error">{pwdErrors.confirm}</p>}
              {pwdForm.confirm && pwdForm.newPwd && pwdForm.confirm === pwdForm.newPwd && !pwdErrors.confirm && (
                <p style={{ fontSize: 11, color: '#2e7d32', marginTop: 3 }}>✓ Passwords match</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPwdModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleChangePwd} disabled={pwdLoading}>
                {pwdLoading ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
