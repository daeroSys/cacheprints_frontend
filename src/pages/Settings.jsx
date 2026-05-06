import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import { get, post, del } from '../utils/api'
import './PageCommon.css'
import './Settings.css'

export default function Settings() {
  const { currentUser } = useAuth()
  const [shopName, setShopName] = useState("CachePrint's")
  const [email,    setEmail]    = useState('admin@cacheprints.com')
  const [saved,    setSaved]    = useState(false)

  // ── Backup state ──
  const [backups,        setBackups]        = useState([])
  const [backupLoading,  setBackupLoading]  = useState(false)
  const [backupMsg,      setBackupMsg]      = useState(null)  // { type: 'success'|'error', text }
  const [restoreConfirm, setRestoreConfirm] = useState(null)  // filename to confirm
  const [restoring,      setRestoring]      = useState(false)

  const fetchBackups = useCallback(async () => {
    try {
      const data = await get('/backups')
      if (data.ok) setBackups(data.backups || [])
    } catch (err) {
      console.error('Failed to fetch backups:', err.message)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }


  // ── Backup Actions ──
  const handleCreateBackup = async () => {
    setBackupLoading(true)
    setBackupMsg(null)
    try {
      const data = await post('/backups')
      if (data.ok) {
        setBackupMsg({ type: 'success', text: `Backup created: ${data.filename}` })
        fetchBackups()
      } else {
        setBackupMsg({ type: 'error', text: data.error || 'Failed to create backup.' })
      }
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message || 'Failed to create backup.' })
    } finally {
      setBackupLoading(false)
      setTimeout(() => setBackupMsg(null), 4000)
    }
  }

  const handleRestore = async () => {
    if (!restoreConfirm) return
    setRestoring(true)
    setBackupMsg(null)
    try {
      const data = await post('/backups/restore', { filename: restoreConfirm })
      if (data.ok) {
        const total = Object.values(data.restored || {}).reduce((a, b) => a + b, 0)
        setBackupMsg({ type: 'success', text: `Restored ${total} documents from ${restoreConfirm}. Refreshing...` })
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setBackupMsg({ type: 'error', text: data.error || 'Restore failed.' })
      }
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message || 'Restore failed.' })
    } finally {
      setRestoring(false)
      setRestoreConfirm(null)
    }
  }

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup "${filename}"?`)) return
    try {
      await del(`/backups/${filename}`)
      fetchBackups()
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message || 'Delete failed.' })
      setTimeout(() => setBackupMsg(null), 4000)
    }
  }

  const formatBackupDate = (filename) => {
    try {
      // backup_2026-05-04T14-01-00-000Z.json → readable date
      const ts = filename
        .replace('backup_', '')
        .replace('.json', '')
        .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z')
      const d = new Date(ts)
      if (isNaN(d.getTime())) return filename
      return d.toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    } catch {
      return filename
    }
  }

  const latestBackup = backups[0] || null

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and preferences" />

      <div className="settings-grid">
        <div className="section-card animate-fade-up delay-1">
          <h3 className="section-card__title">Shop Information</h3>
          <div className="form-group">
            <label className="form-label">Shop Name</label>
            <input className="form-input" value={shopName} onChange={e => setShopName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        <div className="section-card animate-fade-up delay-2">
          <h3 className="section-card__title">User Roles</h3>
          <div className="settings-role-row">
            <div>
              <p className="settings-role-name">Administrator</p>
              <p className="settings-role-desc">Full access to all features, reports, settings, archive, activity log, and user management.</p>
            </div>
            <span className="settings-role-badge settings-role-badge--admin">Admin</span>
          </div>
          <div className="settings-role-row">
            <div>
              <p className="settings-role-name">Staff</p>
              <p className="settings-role-desc">
                Can record &amp; receive purchases, input production progress, edit design files, and generate reports.
                <br />
                <span style={{ color:'#c62828', fontSize:11, marginTop:4, display:'block' }}>
                  Cannot: add materials, adjust stock, edit/archive orders, archive records, access Archive, Activity Log, or Settings.
                </span>
              </p>
            </div>
            <span className="settings-role-badge">Staff</span>
          </div>
        </div>

        {/* ── Backup & Restore ── */}
        <div className="section-card animate-fade-up delay-3">
          <h3 className="section-card__title">Backup &amp; Restore</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: 16, lineHeight: 1.6 }}>
            The system automatically creates a backup of all data <strong>every hour</strong>. 
            You can also create a manual backup or restore from a previous snapshot if data is lost.
          </p>

          {/* Status badge */}
          {latestBackup && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>Auto-backup active</span>
                <span style={{ fontSize: 11, color: '#4ade80', display: 'block', marginTop: 2 }}>
                  Last backup: {formatBackupDate(latestBackup.filename)} ({latestBackup.sizeLabel})
                </span>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {backupMsg && (
            <div style={{
              padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
              background: backupMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: backupMsg.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${backupMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {backupMsg.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={backupLoading}
              style={{ fontSize: 12 }}
            >
              {backupLoading ? '⏳ Creating...' : '📦 Create Manual Backup'}
            </button>
          </div>

          {/* Backup list */}
          {backups.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Available Backups ({backups.length})
              </p>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--gray-border)', borderRadius: 8 }}>
                {backups.map((b, i) => (
                  <div
                    key={b.filename}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', fontSize: 12,
                      borderBottom: i < backups.length - 1 ? '1px solid var(--gray-border)' : 'none',
                      background: i === 0 ? '#fafff8' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--black)' }}>
                        {formatBackupDate(b.filename)}
                        {i === 0 && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginLeft: 6 }}>LATEST</span>}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--gray-light)' }}>{b.sizeLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setRestoreConfirm(b.filename)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                          border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb',
                          cursor: 'pointer',
                        }}
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(b.filename)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                          border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="section-card animate-fade-up delay-4">
          <h3 className="section-card__title">About</h3>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
            {[
              ['System',    "CachePrint's IMS"],
              ['Version',   '5.0'],
              ['Database',  'MongoDB'],
              ['Framework', 'React + Vite'],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: 'var(--gray-mid)', padding: '6px 0', width: 110 }}>{k}</td>
                <td style={{ color: 'var(--black)', fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Restore Confirmation Modal ── */}
      <Modal open={!!restoreConfirm} onClose={() => setRestoreConfirm(null)} title="⚠️ Confirm Restore" size="sm">
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 13, color: '#333', lineHeight: 1.7, marginBottom: 12 }}>
            This will <strong style={{ color: '#dc2626' }}>replace all current data</strong> in the database with the backup from:
          </p>
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontWeight: 600, fontSize: 13, color: '#92400e',
          }}>
            📁 {restoreConfirm && formatBackupDate(restoreConfirm)}
          </div>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
            This action cannot be undone. Make sure you have a recent backup before proceeding.
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setRestoreConfirm(null)} disabled={restoring}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? '⏳ Restoring...' : '🔄 Restore Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
