import { useState, useMemo } from 'react'
import { usePermission } from '../hooks/usePermission'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import NoPermissionModal from '../components/ui/NoPermissionModal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatCurrency, formatDate, formatDateTime, generateId, isLowStock } from '../utils/helpers'
import { isFabricInKg, isPaperInPacks, isVinylInRolls, isThreadInCones } from '../utils/unitConverter'
import { post, patch } from '../utils/api'
import { printPurchaseOrder } from '../utils/purchaseOrderPrint'
import './PageCommon.css'
import './Purchases.css'

const EMPTY_ITEM = { materialId:'', name:'', unit:'', isKg:false, isPacks:false, isRolls:false, isCones:false, supplier:'', totalCost:'', qtyOrdered:'', matSearch:'' }

export default function Purchases({ onNav }) {
  const { purchases, materials, addPurchase, receivePurchase, archivePurchase, lowStockItems } = useApp()
  const { currentUser } = useAuth()
  const { guard, denied, clearDenied, isAdmin } = usePermission()
  const [showReorderModal, setShowReorderModal] = useState(false)
  const [tab, setTab] = useState('to-receive')

  // Add purchase form state
  const [addModal,   setAddModal]   = useState(false)
  const [showAllMaterials, setShowAllMaterials] = useState(false)
  const [supplier,   setSupplier]   = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10))
  const [notes,      setNotes]      = useState('')
  const [items,      setItems]      = useState([{ ...EMPTY_ITEM }])
  const [receiptImg, setReceiptImg] = useState(null)
  const [addErrors,  setAddErrors]  = useState({})

  // Receive modal state
  const [receiveModal,   setReceiveModal]   = useState(null)
  const [recItems,       setRecItems]       = useState([])
  const [recReceipt,     setRecReceipt]     = useState(null)
  const [recReason,      setRecReason]      = useState('')
  const [recErrors,      setRecErrors]      = useState({})

  // View detail modal (completed)
  const [viewModal, setViewModal] = useState(null)
  const [search,    setSearch]    = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [archiveConfirm, setArchiveConfirm] = useState(null)

  const toReceive  = useMemo(() => [...purchases].filter(p => !p.isReceived && !p.isArchived).sort((a,b) => b.date.localeCompare(a.date)), [purchases])
  const completed  = useMemo(() => [...purchases].filter(p =>  p.isReceived && !p.isArchived).sort((a,b) => (b.receivedAt||'').localeCompare(a.receivedAt||'')), [purchases])

  const filteredCompleted = useMemo(() => {
    const now = new Date()
    const getRange = (key) => {
      switch(key) {
        case 'this-week': { const d = new Date(now); d.setDate(now.getDate() - now.getDay()); return { from: d, to: now } }
        case 'last-week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay() - 7); const e = new Date(now); e.setDate(now.getDate() - now.getDay() - 1); return { from: s, to: e } }
        case 'this-month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
        case 'last-month': return { from: new Date(now.getFullYear(), now.getMonth()-1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) }
        case 'this-year': return { from: new Date(now.getFullYear(), 0, 1), to: now }
        default: return null
      }
    }
    const range = getRange(dateFilter)
    return completed.filter(p => {
      const matchSearch = !search.trim() || p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.items||[]).some(i => i.supplier?.toLowerCase().includes(search.toLowerCase()) || i.name?.toLowerCase().includes(search.toLowerCase()))
      let matchDate = true
      if (range && p.receivedAt) {
        const d = new Date(p.receivedAt)
        matchDate = d >= range.from && d <= range.to
      }
      return matchSearch && matchDate
    })
  }, [completed, search, dateFilter])

  const pgToReceive  = usePagination(toReceive,       10)
  const pgCompleted  = usePagination(filteredCompleted, 10)

  // ── Add purchase helpers ──
  const addItem    = () => setItems(p => [...p, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(p => p.filter((_,idx) => idx !== i))
  const upItem     = (i,k,v) => setItems(p => p.map((it,idx) => idx===i ? { ...it, [k]:v } : it))
  const selMat = (i, matId) => {
    const mat = materials.find(m => m.id === matId)
    const isKg = isFabricInKg(mat)
    const isPacks = isPaperInPacks(mat)
    const isRolls = isVinylInRolls(mat)
    const isCones = isThreadInCones(mat)
    setItems(p => p.map((it,idx) => idx===i ? { ...it, materialId:matId, name:mat?.name||'', unit: isKg ? 'KG' : isPacks ? 'Packs' : isRolls ? 'Rolls' : isCones ? 'Cones' : (mat?.unit||''), isKg, isPacks, isRolls, isCones, matSearch:mat?.name||'' } : it))
  }
  const setMatSearch = (i, val) => {
    setItems(p => p.map((it,idx) => {
      if (idx !== i) return it
      // If the search doesn't match selected material, clear selection
      const matchedMat = purchasableMats.find(m => m.name.toLowerCase() === val.toLowerCase())
      if (matchedMat) {
        const isKg = isFabricInKg(matchedMat)
        const isPacks = isPaperInPacks(matchedMat)
        const isRolls = isVinylInRolls(matchedMat)
        const isCones = isThreadInCones(matchedMat)
        return { ...it, materialId:matchedMat.id, name:matchedMat.name, unit: isKg ? 'KG' : isPacks ? 'Packs' : isRolls ? 'Rolls' : isCones ? 'Cones' : (matchedMat.unit||''), isKg, isPacks, isRolls, isCones, matSearch:val }
      }
      return { ...it, materialId:'', name:'', unit:'', isKg: false, isPacks: false, isRolls: false, isCones: false, matSearch:val }
    }))
  }
  const overallCost = items.reduce((s,i) => s + (Number(i.totalCost)||0), 0)

  const handleReceiptUpload = (e, setter) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1500000) { alert('Image too large. Max 1.5MB.'); return }
    const reader = new FileReader()
    reader.onload = ev => setter(ev.target.result)
    reader.readAsDataURL(file)
  }

  const validateAdd = () => {
    const e = {}
    if (!date) e.date = 'Date is required.'
    if (items.some(it => !it.materialId)) e.items = 'All rows must have a material selected.'
    if (items.some(it => !it.supplier?.trim())) e.supplier = 'All items must have a supplier name.'
    if (items.some(it => !it.qtyOrdered || Number(it.qtyOrdered) <= 0)) e.qty = 'All quantities must be greater than 0.'
    if (items.some(it => !it.totalCost || Number(it.totalCost) <= 0)) e.cost = 'All items must have a total cost greater than 0.'
    setAddErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAddPurchase = async () => {
    if (!validateAdd()) return
    
    const payload = {
      purchaseId: generateId('PUR'),
      items: items.map(it => ({ materialId:it.materialId, name:it.name, unit:it.unit, isKg:it.isKg, isPacks:it.isPacks, isRolls:it.isRolls, isCones:it.isCones, supplier:it.supplier, totalCost:Number(it.totalCost)||0, qtyOrdered:Number(it.qtyOrdered)||0, qtyReceived:0 })),
      overallCost,
      date,
      notes,
      receiptImage: receiptImg,
    }

    const res = await post('/purchases', payload)
    if (res.ok) {
      await addPurchase(res.purchase)
      setAddModal(false); setItems([{ ...EMPTY_ITEM }]); setDate(new Date().toISOString().slice(0,10)); setNotes(''); setReceiptImg(null); setAddErrors({})
    } else {
      setAddErrors({ global: res.error || 'Failed to create purchase order' })
    }
  }

  // ── Receive helpers ──
  const openReceive = (p) => {
    setReceiveModal(p)
    setRecItems(p.items.map(it => ({ ...it, qtyReceived: it.qtyOrdered })))
    setRecReceipt(p.receiptImage || null)
    setRecReason('')
    setRecErrors({})
  }

  const validateReceive = () => {
    const e = {}
    if (recItems.some(it => !it.qtyReceived || Number(it.qtyReceived) < 0)) e.qty = 'All received quantities must be 0 or more.'
    setRecErrors(e)
    return Object.keys(e).length === 0
  }

  const handleReceive = async () => {
    if (!validateReceive()) return
    
    const res = await patch(`/purchases/${receiveModal.id}/receive`, {
      receivedItems: recItems,
      receiptImage: recReceipt,
      receiveReason: recReason
    })

    if (res.ok) {
      await receivePurchase()
      setReceiveModal(null)
    } else {
      setRecErrors({ qty: res.error || 'Failed to receive purchase' })
    }
  }

  const doArchive = async () => { 
    if (archiveConfirm) { 
      const res = await patch(`/purchases/${archiveConfirm.id}/archive`)
      if (res.ok) {
        archivePurchase(archiveConfirm.id)
        setArchiveConfirm(null)
      } else {
        alert(res.error || 'Failed to archive purchase.')
      }
    } 
  }

  const activeMats = materials.filter(m => !m.isArchived)
  const purchasableMats = activeMats.filter(m => showAllMaterials || m.status === 'Critical' || m.status === 'Low')

  // ── Table columns ──
  const toReceiveCols = [
    { key:'purchaseId',    label:'Purchase ID', render: (v, row) => <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{row.purchaseId || row.id}</span> },
    { key:'items', label:'Supplier(s)', render: v => [...new Set((v||[]).map(i => i.supplier))].filter(Boolean).join(', ') || '—' },
    { key:'items', label:'Item(s)', render: v => (v||[]).map(i => i.name).join(', ') },
    { key:'overallCost', label:'Overall Cost', render: v => formatCurrency(v) },
    { key:'date',  label:'Date', render: v => formatDate(v) },
    { key:'notes', label:'Notes', render: v => v || '—' },
    { key:'id',    label:'', render:(_,row) => (
      <div style={{ display:'flex', gap:6 }}>
        <button className="btn btn-secondary" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => printPurchaseOrder(row, currentUser?.name)}>🖨 Print PO</button>
        <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:12 }} onClick={() => openReceive(row)}>Received</button>
        <button className="btn btn-secondary" style={{ padding:'6px 12px', fontSize:12, borderColor:'#c62828', color:'#c62828' }} onClick={() => guard('archive', () => setArchiveConfirm(row))}>Archive</button>
      </div>
    )},
  ]

  const completedCols = [
    { key:'purchaseId',    label:'Purchase ID', render:(v,row) => <button className="td-link" onClick={() => setViewModal(row)}>{row.purchaseId || row.id}</button> },
    { key:'items', label:'Supplier(s)', render: v => [...new Set((v||[]).map(i => i.supplier))].filter(Boolean).join(', ') || '—' },
    { key:'items', label:'Item(s)', render: v => (v||[]).map(i => i.name).join(', ') },
    { key:'overallCost', label:'Overall Cost', render: v => formatCurrency(v) },
    { key:'receivedAt',  label:'Received On',  render: v => formatDate(v) },
    { key:'notes', label:'Notes', render: v => v || '—' },
    { key:'_actions', label:'', render:(_,row) => (
      <div className="td-actions">
        <button className="td-btn" style={{ color:'#1565c0', fontWeight:600 }} onClick={() => setViewModal(row)}>View Details</button>
        <button className="td-btn td-btn--del" onClick={() => guard('archive', () => setArchiveConfirm(row))}>Archive</button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Purchase Management"
        subtitle="Track all material purchases — to receive and completed"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ borderColor: '#e53935', color: '#c62828' }} onClick={() => setShowReorderModal(true)}>
              ⚠️ Items to Reorder ({lowStockItems.length})
            </button>
            <button className="btn btn-primary" onClick={() => { setAddModal(true); setAddErrors({}) }}>+ Create Purchase Order</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="oh-tabs animate-fade-up">
        <button className={`archive-tab ${tab==='to-receive'?'archive-tab--active':''}`} onClick={() => setTab('to-receive')}>To Receive ({toReceive.length})</button>
        <button className={`archive-tab ${tab==='completed'?'archive-tab--active':''}`}  onClick={() => setTab('completed')}>Completed ({completed.length})</button>
      </div>

      {/* Search + date filter for completed */}
      {tab === 'completed' && (
        <div className="page-toolbar animate-fade-up delay-1" style={{ flexDirection:'column', alignItems:'flex-start', gap:10 }}>
          <input className="toolbar-search" placeholder="Search supplier or item…" value={search} onChange={e => { setSearch(e.target.value); pgCompleted.setPage(1) }} />
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'var(--gray-mid)', fontWeight:500, marginRight:2 }}>Received On:</span>
            {[['all','All Time'],['this-week','This Week'],['last-week','Last Week'],['this-month','This Month'],['last-month','Last Month'],['this-year','This Year']].map(([k,l]) => (
              <button key={k} className={`filter-chip ${dateFilter===k?'filter-chip--active':''}`} onClick={() => { setDateFilter(k); pgCompleted.setPage(1) }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      <div className="animate-fade-up delay-2">
        {tab === 'to-receive' && (
          <>
            <DataTable columns={toReceiveCols} data={pgToReceive.paginated} emptyText="No pending purchases to receive." />
            <Pagination page={pgToReceive.page} totalPages={pgToReceive.totalPages} setPage={pgToReceive.setPage} total={pgToReceive.total} pageSize={10} />
          </>
        )}
        {tab === 'completed' && (
          <>
            <DataTable columns={completedCols} data={pgCompleted.paginated} emptyText="No completed purchases." />
            <Pagination page={pgCompleted.page} totalPages={pgCompleted.totalPages} setPage={pgCompleted.setPage} total={pgCompleted.total} pageSize={10} />
          </>
        )}
      </div>

      {/* ── Add Purchase Modal ── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Create Purchase Order" size="lg">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input className={`form-input ${addErrors.date?'input-error':''}`} type="date" value={date} onChange={e => setDate(e.target.value)} />
            {addErrors.date && <p className="field-error">{addErrors.date}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Attach Delivery Receipt <span style={{ color:'var(--gray-mid)', fontWeight:400 }}>(optional)</span></label>
            <input type="file" accept="image/*" className="form-input" style={{ padding:'6px 10px' }} onChange={e => handleReceiptUpload(e, setReceiptImg)} />
          </div>
        </div>
        {receiptImg && <img src={receiptImg} alt="receipt" style={{ maxHeight:80, borderRadius:6, border:'1px solid var(--gray-border)', marginBottom:12 }} />}

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Items *</label>
            {isAdmin && (
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setShowAllMaterials(!showAllMaterials)}>
                {showAllMaterials ? 'Show Low Stock Only' : 'Bypass: Show All Materials'}
              </button>
            )}
          </div>
          {(addErrors.items || addErrors.supplier || addErrors.qty || addErrors.cost) && (
            <p className="field-error" style={{ marginBottom:8 }}>{addErrors.items || addErrors.supplier || addErrors.qty || addErrors.cost}</p>
          )}
          {items.map((item, i) => (
            <div key={i} className="purchase-item-row">
              <div style={{ flex:3, minWidth:150, position:'relative' }}>
                <label className="form-label" style={{ marginBottom:3 }}>
                  Material {item.unit && <span style={{ color:'var(--gray-mid)', fontWeight:400 }}>· {item.unit}</span>}
                </label>
                <input
                  className={`form-input ${addErrors.items&&!item.materialId?'input-error':''}`}
                  value={item.matSearch||''}
                  onChange={e => setMatSearch(i, e.target.value)}
                  onFocus={() => upItem(i,'_dropOpen',true)}
                  onBlur={() => setTimeout(() => upItem(i,'_dropOpen',false), 150)}
                  placeholder="Type to search material…"
                  autoComplete="off"
                />
                {item._dropOpen && (
                  <div className="cat-dropdown">
                    {purchasableMats
                      .filter(m => !item.matSearch || m.name.toLowerCase().includes((item.matSearch||'').toLowerCase()))
                      .map(m => (
                        <button key={m.id} className={`cat-dropdown__item ${item.materialId===m.id?'cat-dropdown__item--active':''}`}
                          onMouseDown={() => { selMat(i,m.id); upItem(i,'_dropOpen',false) }}>
                          {m.name} <span style={{ color:'var(--gray-light)', fontSize:11 }}>· {m.unit}</span>
                        </button>
                      ))
                    }
                    {purchasableMats.filter(m => !item.matSearch || m.name.toLowerCase().includes((item.matSearch||'').toLowerCase())).length === 0 && (
                      <p style={{ padding:'10px 14px', fontSize:13, color:'var(--gray-mid)' }}>No materials found</p>
                    )}
                  </div>
                )}
              </div>
              <div style={{ flex:2, minWidth:110 }}>
                <label className="form-label" style={{ marginBottom:3 }}>Supplier *</label>
                <input className={`form-input ${addErrors.supplier&&!item.supplier?.trim()?'input-error':''}`} value={item.supplier} onChange={e => upItem(i,'supplier',e.target.value)} placeholder="Supplier name" />
              </div>
              <div style={{ flex:1, minWidth:80 }}>
                <label className="form-label" style={{ marginBottom:3 }}>Qty {item.isKg ? '(KG) *' : item.isPacks ? '(Packs) *' : item.isRolls ? '(Rolls) *' : item.isCones ? '(Cones) *' : '*'} </label>
                <input className={`form-input ${addErrors.qty&&(!item.qtyOrdered||Number(item.qtyOrdered)<=0)?'input-error':''}`} type="number" value={item.qtyOrdered} onChange={e => upItem(i,'qtyOrdered',e.target.value)} placeholder="0" />
                {item.isKg && <p style={{ fontSize: 10, color: 'var(--gray-mid)', marginTop: 4 }}>Will convert to meters</p>}
                {item.isPacks && <p style={{ fontSize: 10, color: 'var(--gray-mid)', marginTop: 4 }}>Will convert to sheets</p>}
                {item.isRolls && <p style={{ fontSize: 10, color: 'var(--gray-mid)', marginTop: 4 }}>Will convert to meters</p>}
                {item.isCones && <p style={{ fontSize: 10, color: 'var(--gray-mid)', marginTop: 4 }}>Will convert to grams</p>}
              </div>
              <div style={{ flex:1.5, minWidth:100 }}>
                <label className="form-label" style={{ marginBottom:3 }}>Total Cost (₱) *</label>
                <input className={`form-input ${addErrors.cost&&(!item.totalCost||Number(item.totalCost)<=0)?'input-error':''}`} type="number" value={item.totalCost} onChange={e => upItem(i,'totalCost',e.target.value)} placeholder="0" />
              </div>
              {items.length > 1 && <button className="td-btn td-btn--del" style={{ alignSelf:'flex-end', marginBottom:2 }} onClick={() => removeItem(i)}>✕</button>}
            </div>
          ))}
          <button className="btn btn-secondary" style={{ fontSize:13, marginTop:6 }} onClick={addItem}>+ Add Item</button>
        </div>

        <div style={{ background:'var(--gray-surface)', borderRadius:'var(--radius-md)', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', margin:'4px 0 14px' }}>
          <span style={{ fontSize:14, color:'var(--gray-dark)', fontWeight:500 }}>Overall Cost</span>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--black)' }}>{formatCurrency(overallCost)}</span>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddPurchase}>Create Purchase Order</button>
        </div>
      </Modal>

      {/* ── Receive Modal ── */}
      <Modal open={!!receiveModal} onClose={() => setReceiveModal(null)} title={`Receive Purchase — ${receiveModal?.purchaseId || receiveModal?.id}`} size="lg">
        {receiveModal && (
          <>
            <div className="purchase-detail-box">
              {[
                ['Purchase ID', receiveModal.purchaseId || receiveModal.id],
                ['Date', formatDate(receiveModal.date)],
                ['Overall Cost', formatCurrency(receiveModal.overallCost)],
              ].map(([l,v]) => (
                <div key={l} className="purchase-detail-row"><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Items — Quantity Received *</label>
              {recErrors.qty && <p className="field-error" style={{ marginBottom:8 }}>{recErrors.qty}</p>}
              {recItems.map((item, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10, padding:'10px 12px', background:'var(--gray-surface)', borderRadius:'var(--radius-md)' }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:13 }}>{item.name}</p>
                    <p style={{ fontSize:12, color:'var(--gray-mid)' }}>{item.supplier} · Ordered: {item.qtyOrdered} {item.unit||''}</p>
                    {item.isKg && <p style={{ fontSize:11, color:'#1565c0', marginTop:4 }}>KG will be converted to Meters.</p>}
                    {item.isPacks && <p style={{ fontSize:11, color:'#1565c0', marginTop:4 }}>Packs will be converted to Sheets.</p>}
                    {item.isRolls && <p style={{ fontSize:11, color:'#1565c0', marginTop:4 }}>Rolls will be converted to Meters.</p>}
                    {item.isCones && <p style={{ fontSize:11, color:'#1565c0', marginTop:4 }}>Cones will be converted to Grams.</p>}
                  </div>
                  <div style={{ width:100 }}>
                    <label className="form-label" style={{ marginBottom:3 }}>Qty Received *</label>
                    <input
                      className={`form-input ${recErrors.qty&&Number(item.qtyReceived)<0?'input-error':''}`}
                      type="number" min="0"
                      value={item.qtyReceived}
                      onChange={e => setRecItems(p => p.map((it,idx) => idx===i ? { ...it, qtyReceived: e.target.value } : it))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Attach Delivery Receipt</label>
              <input type="file" accept="image/*" className="form-input" style={{ padding:'6px 10px' }} onChange={e => handleReceiptUpload(e, setRecReceipt)} />
              {(recReceipt || receiveModal.receiptImage) && (
                <img src={recReceipt || receiveModal.receiptImage} alt="receipt" style={{ marginTop:8, maxHeight:100, borderRadius:6, border:'1px solid var(--gray-border)' }} />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Notes</label>
              <textarea className="form-textarea" value={recReason} onChange={e => setRecReason(e.target.value)} placeholder="e.g. Full order received, partial delivery, item substituted…" rows={2} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setReceiveModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReceive}>Confirm Received</button>
            </div>
          </>
        )}
      </Modal>

      {/* ── View Completed Detail Modal ── */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Purchase Details — ${viewModal?.purchaseId || viewModal?.id}`} size="md">
        {viewModal && (
          <>
            <div className="purchase-detail-box">
              {[
                ['Purchase ID', viewModal.purchaseId || viewModal.id],
                ['Date',        formatDate(viewModal.date)],
                ['Received On', formatDateTime(viewModal.receivedAt)],
                ['Overall Cost',formatCurrency(viewModal.overallCost)],
                ['Notes',       viewModal.notes || '—'],
                ['Receive Note',viewModal.receiveReason || '—'],
              ].map(([l,v]) => (
                <div key={l} className="purchase-detail-row"><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>

            <div style={{ margin:'16px 0 8px' }}>
              <p style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-mid)', marginBottom:8 }}>Items</p>
              {(viewModal.items||[]).map((it,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--gray-border)' }}>
                  <div>
                    <p style={{ fontWeight:500, fontSize:13 }}>{it.name}</p>
                    <p style={{ fontSize:12, color:'var(--gray-mid)' }}>{it.supplier} · Ordered: {it.qtyOrdered} · Received: {it.qtyReceived}</p>
                  </div>
                  <strong style={{ fontSize:14 }}>{formatCurrency(it.totalCost)}</strong>
                </div>
              ))}
            </div>

            {(viewModal.receiptImage) && (
              <div style={{ marginTop:12 }}>
                <p style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-mid)', marginBottom:8 }}>Delivery Receipt</p>
                <img src={viewModal.receiptImage} alt="receipt" style={{ maxWidth:'100%', maxHeight:220, borderRadius:8, border:'1px solid var(--gray-border)' }} />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Reorder Items Modal ── */}
      <Modal open={showReorderModal} onClose={() => setShowReorderModal(false)} title="Materials to Reorder" size="md">
        {lowStockItems.length === 0 ? (
          <p style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-mid)' }}>All stock levels are healthy!</p>
        ) : (
          <div className="alert-list">
            {lowStockItems.map(mat => (
              <div key={mat.id} className="alert-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: 'var(--gray-surface)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px' }}>{mat.name}</strong>
                    <span className={mat.status === 'Critical' ? 'td-crit-badge' : 'td-low-badge'}>{mat.status}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--gray-dark)' }}>
                    Current: <strong>{mat.effectiveStock}</strong> {mat.unit} <span style={{ color: 'var(--gray-light)' }}>|</span> Lead Time: {mat.leadTime || 0}d
                  </p>
                </div>
                {mat.link && (
                  <button className="btn btn-secondary" style={{ alignSelf: 'center', padding: '6px 12px', fontSize: '12px' }} onClick={() => window.open(mat.link, '_blank')}>
                    🛒 Shop Link
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Confirm Archive Modal ── */}
      <Modal open={!!archiveConfirm} onClose={() => setArchiveConfirm(null)} title="Confirm Archive" size="sm">
        <p style={{ color:'var(--gray-dark)', lineHeight:1.6, marginBottom:20 }}>
          Archive purchase order "{archiveConfirm?.purchaseId || archiveConfirm?.id}"? It will be moved to the Archive and can be restored.
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setArchiveConfirm(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={doArchive}>Archive</button>
        </div>
      </Modal>

      <NoPermissionModal info={denied} onClose={clearDenied} />
    </div>
  )
}
