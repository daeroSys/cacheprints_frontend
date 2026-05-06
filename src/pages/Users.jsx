import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import './PageCommon.css'
import './Users.css'

export default function Users() {
  const { users, archiveUser, adminUpdateUser, currentUser } = useAuth()
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('All')
  const [confirmUser,  setConfirmUser]  = useState(null) // user to delete
  const [confirmInput, setConfirmInput] = useState('')
  const [confirmError, setConfirmError] = useState('')

  // Edit Modal
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', contact: '', role: 'Staff' })
  const [editLoading, setEditLoading] = useState(false)
  const [editErrors, setEditErrors] = useState({})

  // Only show active (non-archived) users
  const activeUsers = useMemo(() => users.filter(u => !u.isArchived), [users])

  const filtered = useMemo(() => {
    return activeUsers.filter(u => {
      const mRole = roleFilter === 'All' || u.role === roleFilter
      const mSearch = !search.trim() ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      return mRole && mSearch
    })
  }, [activeUsers, search, roleFilter])

  const { page, setPage, totalPages, paginated, total } = usePagination(filtered, 10)

  const adminCount = activeUsers.filter(u => u.role === 'Admin').length
  const staffCount = activeUsers.filter(u => u.role === 'Staff').length

  const avatarColor = (role) => role === 'Admin' ? '#0d0d0d' : '#1565c0'

  const openDelete = (user) => {
    setConfirmUser(user)
    setConfirmInput('')
    setConfirmError('')
  }

  const handleDelete = () => {
    if (confirmInput.trim() !== confirmUser.username) {
      setConfirmError(`Type the username exactly as shown: "${confirmUser.username}"`)
      return
    }
    archiveUser(confirmUser.id)
    setConfirmUser(null)
  }

  const openEdit = (user) => {
    setEditModal(user)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      contact: user.contact || '',
      role: user.role || 'Staff'
    })
    setEditErrors({})
  }

  const handleUpdate = async () => {
    const e = {}
    if (!editForm.name.trim()) e.name = 'Full name is required'
    if (!editForm.email.trim()) e.email = 'Email is required'
    setEditErrors(e)
    if (Object.keys(e).length > 0) return

    setEditLoading(true)
    const res = await adminUpdateUser(editModal.id, editForm)
    setEditLoading(false)
    if (res.ok) {
      setEditModal(null)
    } else {
      setEditErrors({ name: res.error })
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${activeUsers.length} active user${activeUsers.length !== 1 ? 's' : ''} — ${adminCount} Admin · ${staffCount} Staff`}
      />

      <div className="page-toolbar animate-fade-up delay-1">
        <input
          className="toolbar-search"
          style={{ width: 300 }}
          placeholder="Search by name, username, or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="toolbar-filters">
          {['All', 'Admin', 'Staff'].map(r => (
            <button
              key={r}
              className={`filter-chip ${roleFilter === r ? 'filter-chip--active' : ''}`}
              onClick={() => { setRoleFilter(r); setPage(1) }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="users-grid animate-fade-up delay-2">
        {paginated.map((user, i) => {
          const isDefaultAdmin = user.id === 'u-admin'
          return (
            <div key={user.id} className="user-card" style={{ animationDelay:`${i*40}ms` }}>
              {/* Delete button — top-right corner, hidden for default admin */}
              {/* Actions — top-right corner */}
              <div className="user-card__actions">
                {(user.role === 'Staff' || user.id === currentUser?.id) && (
                  <button
                    className="user-card__action-btn user-card__action-btn--edit"
                    onClick={() => openEdit(user)}
                    title={`Edit @${user.username}`}
                  >
                    ✎
                  </button>
                )}
                {user.role === 'Staff' && !isDefaultAdmin && (
                  <button
                    className="user-card__action-btn user-card__action-btn--delete"
                    onClick={() => openDelete(user)}
                    title={`Archive @${user.username}`}
                  >
                    🗑
                  </button>
                )}
              </div>

              {/* Default admin badge */}
              {isDefaultAdmin && (
                <div className="user-card__system-badge" title="Default system account — cannot be deleted">
                  ⚙ System
                </div>
              )}

              {/* Avatar */}
              <div className="user-card__avatar" style={{ background: avatarColor(user.role) }}>
                {(user.name?.[0] || user.username?.[0] || 'U').toUpperCase()}
              </div>

              {/* Name + username */}
              <div className="user-card__info">
                <p className="user-card__name">{user.name || '—'}</p>
                <p className="user-card__username">@{user.username}</p>
              </div>

              {/* Role badge */}
              <span className="user-card__role" style={{ background: avatarColor(user.role) }}>
                {user.role}
              </span>

              {/* Details */}
              <div className="user-card__details">
                <div className="user-card__detail-row">
                  <span className="user-card__detail-label">Email</span>
                  <span className="user-card__detail-val">{user.email || '—'}</span>
                </div>
                <div className="user-card__detail-row">
                  <span className="user-card__detail-label">Contact</span>
                  <span className="user-card__detail-val">{user.contact || '—'}</span>
                </div>
                <div className="user-card__detail-row">
                  <span className="user-card__detail-label">Joined</span>
                  <span className="user-card__detail-val">{user.createdAt || '—'}</span>
                </div>
                <div className="user-card__detail-row">
                  <span className="user-card__detail-label">Approved by</span>
                  <span className="user-card__detail-val" style={{ color: user.approvedBy ? '#2e7d32' : 'var(--gray-light)', fontWeight: user.approvedBy ? 600 : 400 }}>
                    {user.approvedBy
                      ? `@${user.approvedBy}`
                      : isDefaultAdmin
                        ? 'System (default)'
                        : '—'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {paginated.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state__icon">◧</div>
            <p className="empty-state__text">No users found</p>
            <p className="empty-state__sub">Try adjusting your search or filter.</p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!confirmUser} onClose={() => setConfirmUser(null)} title="Archive User Account" size="sm">
        {confirmUser && (
          <>
            {/* Warning header */}
            <div style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:'var(--radius-md)', padding:'14px 16px', marginBottom:18, display:'flex', gap:12, alignItems:'flex-start' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
              <div>
                <p style={{ fontWeight:700, color:'#c62828', fontSize:14, marginBottom:4 }}>This action will archive the account</p>
                <p style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>
                  The account <strong>@{confirmUser.username}</strong> ({confirmUser.name}) will be moved to the Archive. The user will no longer be able to log in. This can be reversed by restoring the account from the Archive tab.
                </p>
              </div>
            </div>

            {/* User info */}
            <div style={{ background:'var(--gray-surface)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background: confirmUser.role==='Admin'?'#0d0d0d':'#1565c0', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, flexShrink:0 }}>
                  {(confirmUser.name?.[0] || confirmUser.username?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight:600, fontSize:14, color:'var(--black)' }}>{confirmUser.name}</p>
                  <p style={{ fontSize:12, color:'var(--gray-mid)' }}>@{confirmUser.username} · {confirmUser.role}</p>
                </div>
              </div>
            </div>

            {/* Confirm by typing username */}
            <div className="form-group">
              <label className="form-label">
                To confirm, type the username: <strong style={{ color:'#c62828' }}>{confirmUser.username}</strong>
              </label>
              <input
                className={`form-input ${confirmError ? 'input-error' : ''}`}
                value={confirmInput}
                onChange={e => { setConfirmInput(e.target.value); setConfirmError('') }}
                placeholder={`Type "${confirmUser.username}" to confirm`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
              />
              {confirmError && <p className="field-error">{confirmError}</p>}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmUser(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Archive Account
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Account: @${editModal?.username}`} size="sm">
        {editModal && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className={`form-input ${editErrors.name ? 'input-error' : ''}`}
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Full Name"
              />
              {editErrors.name && <p className="field-error">{editErrors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className={`form-input ${editErrors.email ? 'input-error' : ''}`}
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email Address"
              />
              {editErrors.email && <p className="field-error">{editErrors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                className="form-input"
                value={editForm.contact}
                onChange={e => setEditForm(p => ({ ...p, contact: e.target.value }))}
                placeholder="Contact Number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={editForm.role}
                onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={editLoading}>
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
