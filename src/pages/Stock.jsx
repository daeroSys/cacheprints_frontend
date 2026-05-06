import { usePermission } from '../hooks/usePermission'
import NoPermissionModal from '../components/ui/NoPermissionModal'
import { useState, useRef, useEffect } from 'react'
import { patch } from '../utils/api'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import './PageCommon.css'
import './Stock.css'

export default function Stock() {
  const { materials, transactions, adjustMaterialStock } = useApp()
  const { guard, denied, clearDenied } = usePermission()
  const [search,      setSearch]      = useState('')
  const [levelFilter, setLevelFilter] = useState('All')
  const [dropdownOpen,setDropdownOpen]= useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [adjustModal, setAdjustModal] = useState(null)
  const [noLinkModal, setNoLinkModal] = useState(false)
  const [adjQty,      setAdjQty]      = useState('')
  const [adjReason,   setAdjReason]   = useState('')
  const [adjErrors,   setAdjErrors]   = useState({})
  const [reorderModal, setReorderModal] = useState(null)

  const active = materials.filter(m => !m.isArchived)

  const filtered = active.filter(m => {
    const name = m?.name || 'Unnamed Material'
    const cat  = m?.category || 'Other'
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'All' ? true : m?.status === levelFilter
    return matchSearch && matchLevel
  })

  // Pin stock items by priority
  const sorted = [
    ...filtered.filter(m => m.status === 'Critical'),
    ...filtered.filter(m => m.status === 'Low'),
    ...filtered.filter(m => m.status === 'Healthy'),
    ...filtered.filter(m => m.status === 'Overstock'),
    ...filtered.filter(m => !['Critical', 'Low', 'Healthy', 'Overstock'].includes(m.status)),
  ]

  const { page, setPage, totalPages, paginated, total } = usePagination(sorted, 10)
  const lowCount = active.filter(m => m.status === 'Critical' || m.status === 'Low').length

  const openAdjust = (mat) => { setAdjustModal(mat); setAdjQty(''); setAdjReason(''); setAdjErrors({}) }
  const closeAdjust = () => { setAdjustModal(null) }

  const getReorderStats = (matId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const totalUsage = (transactions || [])
      .filter(t => t.type === 'Stock-Out' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => {
        const item = t.items.find(i => i.materialId === matId);
        return sum + (item ? Math.abs(item.qty) : 0);
      }, 0);

    const dailyUsage = totalUsage / 30;
    return { 
      totalUsage: Math.round(totalUsage * 100) / 100, 
      dailyUsage: Math.round(dailyUsage * 100) / 100 
    };
  }

  const handleRestock = (mat) => {
    if (!mat.link || !mat.link.trim()) { setNoLinkModal(true); return }
    window.open(mat.link, '_blank')
  }

  const handleAdjust = async () => {
    const e = {}
    if (!adjQty || adjQty === '') e.qty = 'Enter an adjustment amount (positive to add, negative to remove).'
    if (isNaN(Number(adjQty)))    e.qty = 'Must be a number.'
    if (!adjReason.trim())        e.reason = 'Please provide a reason for this adjustment.'
    const mat = adjustModal
    if (mat && Number(adjQty) < 0 && Math.abs(Number(adjQty)) > mat.quantity) {
      e.qty = `Cannot remove more than current stock (${mat.quantity} ${mat.unit}).`
    }
    setAdjErrors(e)
    if (Object.keys(e).length > 0) return

    const res = await patch(`/materials/${mat.id}/adjust`, { qty: Number(adjQty), reason: adjReason })
    if (res.ok) {
      adjustMaterialStock(mat.id, Number(adjQty), adjReason)
      closeAdjust()
    } else {
      setAdjErrors({ qty: res.error || 'Adjustment failed' })
    }
  }

  return (
    <>
    <div>
      <PageHeader title="Stock Level Tracking" subtitle="Monitor material quantities, restock, and adjust" />

      <div className="page-toolbar animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input className="toolbar-search" placeholder="Search materials…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <div className="custom-dropdown" ref={dropdownRef} style={{ position: 'relative', zIndex: 50 }}>
            <button 
              className="toolbar-search"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ width: '180px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)', cursor: 'pointer' }}
            >
              <span style={{ fontWeight: levelFilter !== 'All' ? 600 : 400 }}>
                {levelFilter === 'All' ? 'All Levels' : 
                 levelFilter === 'Critical' ? '🔴 Critical' : 
                 levelFilter === 'Low' ? '🟠 Low' : 
                 levelFilter === 'Healthy' ? '🟢 Healthy' : '🔵 Overstock'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--gray-mid)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%', background: 'var(--white)', border: '1px solid var(--gray-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden' }}>
                {['All Levels', 'Critical', 'Low', 'Healthy', 'Overstock'].map(lvl => {
                  const val = lvl === 'All Levels' ? 'All' : lvl
                  return (
                    <div 
                      key={val}
                      onClick={() => { setLevelFilter(val); setPage(1); setDropdownOpen(false) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13.5px', background: levelFilter === val ? 'var(--gray-surface)' : 'var(--white)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--gray-surface)'}
                      onMouseLeave={(e) => e.target.style.background = levelFilter === val ? 'var(--gray-surface)' : 'var(--white)'}
                    >
                      {lvl === 'All Levels' ? 'All Levels' : lvl === 'Critical' ? '🔴 Critical' : lvl === 'Low' ? '🟠 Low' : lvl === 'Healthy' ? '🟢 Healthy' : '🔵 Overstock'}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <span className="stock-total-text">
          {active.length} total material{active.length !== 1 ? 's' : ''}
          {lowCount > 0 && <span className="stock-low-indicator"> · ⚠ {lowCount} low stock</span>}
        </span>
      </div>

      <div className="stock-grid animate-fade-up delay-1">
        {paginated.map((mat, i) => {
          const maxLvl = Math.max(mat.maxLevel || mat.maxQty || 1, 1)
          const pct = Math.min(100, Math.max(0, Math.round((mat.effectiveStock / maxLvl) * 100)))
          const isCritical = mat.status === 'Critical'
          const isLow = mat.status === 'Low'
          const badgeStatus = isCritical ? 'status-red' : isLow ? 'status-yellow' : mat.status === 'Overstock' ? 'status-blue' : 'status-green'
          const cardClass = isCritical ? 'stock-card--critical' : isLow ? 'stock-card--low' : ''
          
          return (
            <div key={mat.id} className={`stock-card stock-card--hoverable ${cardClass}`} style={{ animationDelay:`${i*25}ms` }}>
              <div className={`stock-card__pin stock-card__pin--${mat.status.toLowerCase()}`}>{mat.status.toUpperCase()}</div>
              <div className="stock-card__top">
                <div><p className="stock-card__name">{mat.name || 'Unnamed Material'}</p><p className="stock-card__supplier">{mat.category || 'Other'}</p></div>
              </div>
              <div className="stock-card__qty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div>
                  <span className="stock-card__qty-val">{mat.effectiveStock}</span>
                  <span className="stock-card__qty-unit">{mat.unit}</span>
                </div>
                {mat.reservedStock > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4 }}>
                    {mat.quantity} {mat.unit} total (—{mat.reservedStock} reserved)
                  </span>
                )}
              </div>
              <div className="stock-card__bar" style={{ marginTop: mat.reservedStock > 0 ? 8 : 16 }}>
                <div className="stock-card__bar-bg">
                  <div className={`stock-card__bar-fill stock-card__bar-fill--${mat.status.toLowerCase()}`} style={{ width:`${pct}%` }} />
                </div>
                <div className="stock-card__bar-legend">
                  <span>Min: {Math.round(mat.minLevel || mat.minQty)}</span><span>Max: {Math.round(mat.maxLevel || mat.maxQty)} {mat.unit}</span>
                </div>
              </div>
              {/* Hover action buttons */}
              <div className="stock-card__hover-actions">
                <button className="stock-action-btn stock-action-btn--adjust" onClick={() => guard('adjust_stock', () => openAdjust(mat))}>
                  ± Adjust
                </button>
                <button className="stock-action-btn stock-action-btn--restock" onClick={() => setReorderModal(mat)}>
                  Reorder Point
                </button>
              </div>
            </div>
          )
        })}
        {paginated.length === 0 && (
          <div className="empty-state" style={{ gridColumn:'1/-1' }}>
            <div className="empty-state__icon">▦</div>
            <p className="empty-state__text">No materials match your search</p>
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />

      {/* No Link Modal */}
      <Modal open={noLinkModal} onClose={() => setNoLinkModal(false)} title="No Shop Link Attached" size="sm">
        <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔗</div>
          <p style={{ color:'var(--gray-dark)', lineHeight:1.6 }}>
            This material has no online shop link attached. To enable quick restocking, go to <strong>Materials</strong> and add a link for this item.
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => setNoLinkModal(false)}>Got it</button>
        </div>
      </Modal>

      {/* Adjust Modal */}
      <Modal open={!!adjustModal} onClose={closeAdjust} title="Adjust Stock" size="sm">
        {adjustModal && (
          <>
            <div style={{ background:'var(--gray-surface)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--black)', marginBottom:4 }}>{adjustModal.name}</p>
              <p style={{ fontSize:13, color:'var(--gray-mid)' }}>{adjustModal.category} · {adjustModal.unit}</p>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                <span style={{ fontSize:13, color:'var(--gray-mid)' }}>Current Quantity</span>
                <strong style={{ fontSize:16 }}>{adjustModal.quantity} {adjustModal.unit}</strong>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Adjustment Amount *</label>
              <input
                className={`form-input ${adjErrors.qty?'input-error':''}`}
                type="number"
                value={adjQty}
                onChange={e => { setAdjQty(e.target.value); setAdjErrors(p => ({ ...p, qty:'' })) }}
                placeholder="e.g. +10 to add, -5 to remove"
              />
              {adjErrors.qty && <p className="field-error">{adjErrors.qty}</p>}
              {adjQty !== '' && !isNaN(Number(adjQty)) && (
                <p style={{ fontSize:12, color:'var(--gray-mid)', marginTop:4 }}>
                  New quantity will be: <strong style={{ color:'var(--black)' }}>{Math.max(0, adjustModal.quantity + Number(adjQty))} {adjustModal.unit}</strong>
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Adjustment *</label>
              <textarea
                className={`form-textarea ${adjErrors.reason?'input-error':''}`}
                value={adjReason}
                onChange={e => { setAdjReason(e.target.value); setAdjErrors(p => ({ ...p, reason:'' })) }}
                placeholder="e.g. Damaged items, miscounted, used in production…"
                rows={2}
              />
              {adjErrors.reason && <p className="field-error">{adjErrors.reason}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeAdjust}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdjust}>Save Adjustment</button>
            </div>
          </>
        )}
      </Modal>

      {/* Reorder Point Modal */}
      <Modal open={!!reorderModal} onClose={() => setReorderModal(null)} title="Reorder Point Computation" size="md">
        {reorderModal && (() => {
          const stats = getReorderStats(reorderModal.id);
          const leadTime = reorderModal.leadTime || 7;
          const safetyStock = reorderModal.minQty || 0;
          const usagePortion = stats.dailyUsage * leadTime;
          const reorderPoint = usagePortion + safetyStock;

          return (
            <div style={{ padding: '4px 0' }}>
              <div style={{ background: 'var(--gray-surface)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 20, border: '1px solid var(--gray-border)' }}>
                <p style={{ fontSize: 13, color: 'var(--gray-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Material Overview</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{reorderModal.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-mid)' }}>{reorderModal.category} · {reorderModal.unit}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontWeight: 600 }}>CURRENT STOCK</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: reorderModal.status === 'Critical' ? '#c62828' : 'var(--black)' }}>{reorderModal.effectiveStock} {reorderModal.unit}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📊</span> 30-Day Usage Statistics
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: 8, border: '1px dashed #dee2e6' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-mid)', fontWeight: 700, marginBottom: 4 }}>TOTAL CONSUMED</p>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{stats.totalUsage} {reorderModal.unit}</p>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: 8, border: '1px dashed #dee2e6' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-mid)', fontWeight: 700, marginBottom: 4 }}>AVG. DAILY USAGE</p>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{stats.dailyUsage} {reorderModal.unit} / day</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🧮</span> The Computation
                </p>
                <div style={{ background: '#f0f4ff', padding: '16px', borderRadius: 12, border: '1px solid #dbeafe' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Average Daily Usage</span>
                      <span style={{ fontWeight: 600 }}>{stats.dailyUsage}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Lead Time (Days)</span>
                      <span style={{ fontWeight: 600 }}>× {leadTime}</span>
                    </div>
                    <div style={{ height: 1, background: '#dbeafe' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Demand during Lead Time</span>
                      <span style={{ fontWeight: 600 }}>{usagePortion.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Safety Stock (Min Qty)</span>
                      <span style={{ fontWeight: 600 }}>+ {safetyStock}</span>
                    </div>
                    <div style={{ height: 2, background: '#2563eb' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#1e40af', fontWeight: 800 }}>
                      <span>REORDER POINT</span>
                      <span>{reorderPoint.toFixed(2)} {reorderModal.unit}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: 8, display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  When your stock drops to <strong>{reorderPoint.toFixed(2)} {reorderModal.unit}</strong>, you should place a new order to avoid running out during the <strong>{leadTime}-day</strong> delivery window.
                </p>
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setReorderModal(null)}>Close</button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
      <NoPermissionModal info={denied} onClose={clearDenied} />
    </>
  )
}
