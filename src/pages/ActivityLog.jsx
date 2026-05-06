import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { PERIOD_PRESETS, getPresetRange, inRange } from '../utils/helpers'
import './PageCommon.css'
import './ActivityLog.css'

export default function ActivityLog() {
  const { activityLog } = useApp()
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)

  // ── Period filter ──
  const [period, setPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) })
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))

  const range = useMemo(() => {
    if (period === 'custom') {
      return { from: new Date(customFrom + 'T00:00:00'), to: new Date(customTo + 'T23:59:59') }
    }
    return getPresetRange(period) || getPresetRange('today')
  }, [period, customFrom, customTo])

  const rangeLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(range.from)} – ${fmt(range.to)}`
  }, [range])

  const filtered = useMemo(() => {
    let result = activityLog.filter(e => inRange(e.timestamp, range.from, range.to))

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        new Date(e.timestamp).toLocaleString('en-PH').toLowerCase().includes(q)
      )
    }
    return result
  }, [activityLog, search, range])

  const { page, setPage, totalPages, paginated, total } = usePagination(filtered, 10)

  const formatTs = (ts) => new Date(ts).toLocaleString('en-PH', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })

  const getIcon = (action) => {
    const a = action.toLowerCase()
    if (a.includes('delet') || a.includes('archiv')) return '⊟'
    if (a.includes('add')   || a.includes('creat')  || a.includes('record')) return '+'
    if (a.includes('updat') || a.includes('complet') || a.includes('restor')) return '✎'
    if (a.includes('purchas')) return '⊕'
    if (a.includes('transact')) return '⇅'
    if (a.includes('order'))  return '◻'
    return '·'
  }

  const renderChanges = (changes) => {
    if (!changes) return <p style={{ color:'var(--gray-mid)', fontSize:13 }}>No detailed change data recorded.</p>
    if (typeof changes !== 'object') return <pre style={{ fontSize:12, color:'var(--gray-dark)' }}>{JSON.stringify(changes, null, 2)}</pre>

    // Check if it's a diff object (has `from`/`to` sub-objects)
    const isDiff = Object.values(changes).some(v => v && typeof v === 'object' && ('from' in v || 'to' in v))

    if (isDiff) {
      return (
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', fontSize:11, color:'var(--gray-mid)', padding:'6px 0', borderBottom:'1px solid var(--gray-border)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Field</th>
              <th style={{ textAlign:'left', fontSize:11, color:'var(--gray-mid)', padding:'6px 8px', borderBottom:'1px solid var(--gray-border)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Before</th>
              <th style={{ textAlign:'left', fontSize:11, color:'var(--gray-mid)', padding:'6px 0', borderBottom:'1px solid var(--gray-border)', textTransform:'uppercase', letterSpacing:'0.05em' }}>After</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(changes).map(([field, val]) => (
              <tr key={field}>
                <td style={{ padding:'7px 0', borderBottom:'1px solid var(--gray-border)', fontWeight:600, color:'var(--black)', verticalAlign:'top' }}>{field}</td>
                <td style={{ padding:'7px 8px', borderBottom:'1px solid var(--gray-border)', color:'#c62828', verticalAlign:'top' }}>
                  {val && typeof val === 'object' && 'from' in val ? String(val.from ?? '—') : '—'}
                </td>
                <td style={{ padding:'7px 0', borderBottom:'1px solid var(--gray-border)', color:'#2e7d32', verticalAlign:'top' }}>
                  {val && typeof val === 'object' && 'to' in val ? String(val.to ?? '—') : String(val ?? '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    // Simple key-value snapshot
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {Object.entries(changes).map(([k, v]) => (
          <div key={k} style={{ display:'flex', gap:12, fontSize:13 }}>
            <span style={{ fontWeight:600, color:'var(--black)', minWidth:100 }}>{k}</span>
            <span style={{ color:'var(--gray-dark)' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Click any entry to view full change details" />

      <div className="period-bar animate-fade-up">
        <div className="period-chips">
          {PERIOD_PRESETS.map(p => (
            <button
              key={p.key}
              className={`filter-chip ${period === p.key ? 'filter-chip--active' : ''}`}
              onClick={() => { setPeriod(p.key); setPage(1); }}
            >{p.label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="period-custom-range">
            <input type="date" className="form-input" style={{ width: 150, padding: '6px 10px', fontSize: 12 }} value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }} />
            <span style={{ color: 'var(--gray-mid)', fontSize: 12 }}>to</span>
            <input type="date" className="form-input" style={{ width: 150, padding: '6px 10px', fontSize: 12 }} value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }} />
          </div>
        )}
        <span className="period-label">📅 {rangeLabel}</span>
      </div>

      <div className="page-toolbar animate-fade-up delay-1">
        <input
          className="toolbar-search"
          style={{ width:340 }}
          placeholder="Search by action, detail, user, or date…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <span style={{ fontSize:12, color:'var(--gray-mid)' }}>{filtered.length} result{filtered.length!==1?'s':''}</span>
      </div>

      {activityLog.length === 0 ? (
        <div className="empty-state animate-fade-up delay-1">
          <div className="empty-state__icon">≡</div>
          <p className="empty-state__text">No activity recorded yet</p>
          <p className="empty-state__sub">Actions will appear here as you use the system.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state animate-fade-up delay-1">
          <div className="empty-state__icon">≡</div>
          <p className="empty-state__text">No results found</p>
          <p className="empty-state__sub">Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="activity-feed animate-fade-up delay-1">
            {paginated.map((entry, i) => (
              <button
                key={entry.id}
                className="activity-entry activity-entry--clickable"
                style={{ animationDelay:`${Math.min(i,10)*25}ms`, textAlign:'left', width:'100%' }}
                onClick={() => setSelected(entry)}
              >
                <div className="activity-entry__icon">{getIcon(entry.action)}</div>
                <div className="activity-entry__body">
                  <div className="activity-entry__top">
                    <span className="activity-entry__action">{entry.action}</span>
                    <span className="activity-entry__time">{formatTs(entry.timestamp)}</span>
                  </div>
                  <p className="activity-entry__detail">{entry.detail}</p>
                  <p className="activity-entry__user">by {entry.user} {entry.changes ? '· click for details' : ''}</p>
                </div>
                {entry.changes && <span className="activity-entry__arrow">›</span>}
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Activity Details" size="md">
        {selected && (
          <>
            <div style={{ background:'var(--gray-surface)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--black)', marginBottom:4 }}>{selected.action}</p>
              <p style={{ fontSize:13, color:'var(--gray-mid)' }}>{selected.detail}</p>
              <p style={{ fontSize:12, color:'var(--gray-light)', marginTop:6 }}>
                by {selected.user} · {new Date(selected.timestamp).toLocaleString('en-PH', { dateStyle:'long', timeStyle:'short' })}
              </p>
            </div>
            <p style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--gray-mid)', marginBottom:10 }}>Change Details</p>
            {renderChanges(selected.changes)}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
