import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatDate, getStatusColor } from '../utils/helpers'
import './PageCommon.css'

import { PERIOD_PRESETS, getPresetRange, inRange, getRangeLabel } from '../utils/helpers'

export default function Transactions() {
  const { transactions } = useApp()
  const [typeFilter, setTypeFilter] = useState('All')
  const [showInfo,   setShowInfo]   = useState(true)
  const [search,     setSearch]     = useState('')

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

  const rangeLabel = useMemo(() => getRangeLabel(period, range), [period, range])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const mf = typeFilter === 'All' || t.type === typeFilter
      const allNames = (t.items || []).map(i => i.materialName || '').join(' ').toLowerCase()
      const ms = !search.trim() || allNames.includes(search.toLowerCase()) || (t.ref || '').toLowerCase().includes(search.toLowerCase()) || (t.notes || '').toLowerCase().includes(search.toLowerCase())
      const df = inRange(t.date, range.from, range.to)
      return mf && ms && df
    })
  }, [transactions, typeFilter, period, customFrom, customTo, search, range])

  const { page, setPage, totalPages, paginated, total } = usePagination(filtered, 10)

  const cols = [
    { key:'id',    label:'ID',   render: v => <span style={{ fontFamily:'monospace', fontSize:12 }}>{v}</span> },
    { key:'type',  label:'Type', render: v => <Badge status={getStatusColor(v)}>{v}</Badge> },
    { key:'items', label:'Materials', render:(v,row) => (
      <div>
        {(v||[]).map((it, i) => {
          const sign  = row.type === 'Stock-In' ? '+' : row.type === 'Stock-Out' ? '-' : (Number(it.qty) > 0 ? '+' : Number(it.qty) < 0 ? '-' : '')
          const color = row.type === 'Stock-In' ? '#2e7d32' : row.type === 'Stock-Out' ? '#c62828' : '#827717'
          return (
            <p key={i} style={{ fontSize:12.5, margin:'2px 0' }}>
              {it.materialName}{' '}
              <strong style={{ color }}>{sign}{Math.abs(Number(it.qty))}</strong>
            </p>
          )
        })}
      </div>
    )},
    { key:'date',      label:'Date',      render: v => formatDate(v) },
    { key:'ref',       label:'Reference', render: v => v || '—' },
    { key:'createdBy', label:'By' },
    { key:'notes',     label:'Notes',     render: v => v || '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Inventory Transactions"
        subtitle="Automatically recorded from purchases, stock adjustments, and production"
      />

      {showInfo && (
        <div style={{ background:'#e3f2fd', border:'1px solid #90caf9', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:18, fontSize:13, color:'#1565c0', lineHeight:1.6, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ flex:1 }}>
            <strong>Automatic recording:</strong> Transactions are created automatically when you receive a purchase (Stock-In), adjust stock in Stock Levels (Adjustment), or materials are consumed during production (Stock-Out).
          </span>
          <button
            onClick={() => setShowInfo(false)}
            style={{ background:'rgba(21,101,192,0.1)', border:'none', cursor:'pointer', color:'#1565c0', fontSize:14, lineHeight:1, padding:'6px 8px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, transition:'background 150ms ease' }}
            title="Dismiss"
            onMouseEnter={e => e.currentTarget.style.background='rgba(21,101,192,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(21,101,192,0.1)'}
          >✕</button>
        </div>
      )}

      <div className="page-toolbar animate-fade-up delay-1" style={{ flexDirection:'column', alignItems:'flex-start', gap:10 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', width:'100%' }}>
          <input className="toolbar-search" placeholder="Search material name or reference…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {/* Date filter */}
        <div className="period-bar" style={{ marginBottom: 0, padding: 0, border: 'none', background: 'transparent' }}>
          <span style={{ fontSize:12, color:'var(--gray-mid)', fontWeight:500 }}>Period:</span>
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
              <input type="date" className="form-input" style={{ width: 140, padding: '6px 10px', fontSize: 12 }} value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }} />
              <span style={{ color: 'var(--gray-mid)', fontSize: 12 }}>to</span>
              <input type="date" className="form-input" style={{ width: 140, padding: '6px 10px', fontSize: 12 }} value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }} />
            </div>
          )}
          {rangeLabel && <span className="period-label">📅 {rangeLabel}</span>}
        </div>

        {/* Type filter */}
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'var(--gray-mid)', fontWeight:500, marginRight:2 }}>Type:</span>
          {['All','Stock-In','Stock-Out','Adjustment'].map(f => (
            <button key={f} className={`filter-chip ${typeFilter===f?'filter-chip--active':''}`} onClick={() => { setTypeFilter(f); setPage(1) }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="animate-fade-up delay-2">
        <DataTable columns={cols} data={paginated} emptyText="No transactions found for the selected filters." />
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />
      </div>
    </div>
  )
}
