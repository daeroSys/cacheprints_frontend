import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatCurrency, formatDate, getStatusColor, getDaysUntil, derivePaymentStatus, nowISO, generateId, sumSizes } from '../utils/helpers'
import { PRODUCTION_STAGES, SIZE_KEYS } from '../utils/constants'
import './PageCommon.css'
import './OrderHistory.css'

export default function OrderHistory() {
  const { orders, updateOrder, archiveOrder, completeOrder, addOrder, products } = useApp()
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [completeAmount, setCompleteAmount] = useState('')
  const [errors, setErrors] = useState({})

  const pending   = orders.filter(o => !o.isCompleted && !o.isArchived)
  const completed = orders.filter(o =>  o.isCompleted && !o.isArchived)

  const filterOrders = (list) => list.filter(o => {
    const term = search.toLowerCase()
    const ms = o.customer.toLowerCase().includes(term) || 
               (o.teamName || '').toLowerCase().includes(term) ||
               (o.orderId || '').toLowerCase().includes(term)
    const mf = statusFilter === 'All' || o.status === statusFilter
    return ms && mf
  })

  const filteredPending   = filterOrders(pending)
  const filteredCompleted = filterOrders(completed)

  const pgPending   = usePagination(filteredPending,   10)
  const pgCompleted = usePagination(filteredCompleted, 10)

  const openUpdate   = (o) => { setSelected(o); setEditForm({ ...o, paidAmount: o.paidAmount }); setErrors({}); setModal('update') }
  const openComplete = (o) => { setSelected(o); setCompleteAmount(''); setErrors({}); setModal('complete') }
  const openReorder  = (o) => {
    const product = products.find(p => p.id === o.productId)
    setSelected(o)
    setEditForm({ ...o, id: null, isCompleted: false, completedAt: null, isArchived: false, archivedAt: null, status: 'Order Received', paidAmount: 0, payment: 'Unpaid', createdAt: nowISO().slice(0,10), deadline: '', product })
    setErrors({})
    setModal('reorder')
  }
  const close = () => { setModal(null); setSelected(null); setEditForm(null) }

  const ef = (k, v) => setEditForm(p => ({ ...p, [k]: v }))
  const eSz = (field, sz, v) => setEditForm(p => ({ ...p, [field]: { ...p[field], [sz]: Number(v)||0 } }))

  const validateUpdate = () => {
    const e = {}
    if (!editForm.customer?.trim()) e.customer = 'Customer name is required.'
    if (!editForm.deadline) e.deadline = 'Deadline is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleUpdate = () => {
    if (!validateUpdate()) return
    const paid = Number(editForm.paidAmount) || 0
    const total = Number(editForm.totalAmount) || selected.totalAmount
    updateOrder(selected.id, { ...editForm, payment: derivePaymentStatus(paid, total) })
    close()
  }

  const handleComplete = () => {
    const extra = Number(completeAmount) || 0
    const newPaid = (selected.paidAmount || 0) + extra
    if (extra < 0) { setErrors({ amount: 'Amount cannot be negative.' }); return }
    completeOrder(selected.id, extra)
    close()
  }

  const handleReorder = () => {
    if (!editForm.deadline) { setErrors({ deadline: 'Deadline is required.' }); return }
    const product = editForm.product || {}
    addOrder({
      ...editForm,
      id: generateId('ORD'),
      createdAt: nowISO().slice(0,10),
      status: 'Order Received',
      isCompleted: false, completedAt: null,
      isArchived: false, archivedAt: null,
      payment: derivePaymentStatus(editForm.paidAmount, editForm.totalAmount),
    })
    close()
  }

  const totalDue = (o) => o.totalAmount - o.paidAmount

  const pendingCols = [
    { key:'id', label:'Order ID', render: v => <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{v}</span> },
    { key:'customer', label:'Customer', render:(v,row) => <div><p style={{ fontWeight:500 }}>{v}</p><p style={{ fontSize:12, color:'var(--gray-mid)' }}>{row.productName}</p></div> },
    { key:'upperQty', label:'Qty', render:(_,row) => `${(row.upperQty||0)+(row.lowerQty||0)} pcs` },
    { key:'deadline', label:'Deadline', render:(v,row) => { const d=getDaysUntil(v); return <span style={{ color: d<=3 ? '#c62828' : 'inherit' }}>{formatDate(v)}{d<=3 && d>0 ? ` (${d}d)` : d<=0 ? ' ⚠' : ''}</span> } },
    { key:'status', label:'Status', render: v => <Badge status={getStatusColor(v)}>{v}</Badge> },
    { key:'payment', label:'Payment', render: v => <Badge status={getStatusColor(v)}>{v}</Badge> },
    { key:'totalAmount', label:'Amount', render:(v,row) => <div><p>{formatCurrency(v)}</p><p style={{ fontSize:12, color:'var(--gray-mid)' }}>Balance: {formatCurrency(totalDue(row))}</p></div> },
    { key:'id', label:'', render:(_,row) => (
      <div className="td-actions">
        <button className="td-btn" onClick={() => openUpdate(row)}>Update</button>
        <button className="td-btn" style={{ color:'#1565c0' }} onClick={() => openComplete(row)}>Complete</button>
        <button className="td-btn td-btn--del" onClick={() => archiveOrder(row.id)}>Archive</button>
      </div>
    )},
  ]

  const completedCols = [
    { key:'id', label:'Order ID', render: v => <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{v}</span> },
    { key:'customer', label:'Customer', render:(v,row) => <div><p style={{ fontWeight:500 }}>{v}</p><p style={{ fontSize:12, color:'var(--gray-mid)' }}>{row.productName}</p></div> },
    { key:'upperQty', label:'Qty', render:(_,row) => `${(row.upperQty||0)+(row.lowerQty||0)} pcs` },
    { key:'completedAt', label:'Completed', render: v => formatDate(v) },
    { key:'payment', label:'Payment', render: v => <Badge status={getStatusColor(v)}>{v}</Badge> },
    { key:'totalAmount', label:'Amount', render:(v,row) => <div><p>{formatCurrency(v)}</p><p style={{ fontSize:12, color:'#2e7d32' }}>{formatCurrency(row.paidAmount)} received</p></div> },
    { key:'id', label:'', render:(_,row) => (
      <div className="td-actions">
        <button className="td-btn" onClick={() => openReorder(row)}>Re-order</button>
        <button className="td-btn td-btn--del" onClick={() => archiveOrder(row.id)}>Archive</button>
      </div>
    )},
  ]

  const TABS = [
    { key:'pending',   label:`Pending (${pending.length})` },
    { key:'completed', label:`Completed (${completed.length})` },
  ]

  return (
    <div>
      <PageHeader title="Order History" subtitle="View and manage all customer orders" />

      <div className="oh-tabs animate-fade-up">
        {TABS.map(t => (
          <button key={t.key} className={`archive-tab ${tab===t.key ? 'archive-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-toolbar animate-fade-up delay-1">
        <input className="toolbar-search" placeholder="Search orders or customer…" value={search} onChange={e => setSearch(e.target.value)} />
        {tab === 'pending' && (
          <div className="toolbar-filters">
            {['All', ...PRODUCTION_STAGES].map(s => (
              <button key={s} className={`filter-chip ${statusFilter===s ? 'filter-chip--active' : ''}`} onClick={() => { setStatusFilter(s); pgPending.resetPage?.() }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <div className="animate-fade-up delay-2">
        {tab === 'pending' && (
          <>
            <DataTable columns={pendingCols} data={pgPending.paginated} emptyText="No pending orders." />
            <Pagination page={pgPending.page} totalPages={pgPending.totalPages} setPage={pgPending.setPage} total={pgPending.total} pageSize={10} />
          </>
        )}
        {tab === 'completed' && (
          <>
            <DataTable columns={completedCols} data={pgCompleted.paginated} emptyText="No completed orders." />
            <Pagination page={pgCompleted.page} totalPages={pgCompleted.totalPages} setPage={pgCompleted.setPage} total={pgCompleted.total} pageSize={10} />
          </>
        )}
      </div>

      {/* Update Modal */}
      <Modal open={modal === 'update'} onClose={close} title={`Update Order — ${selected?.id}`} size="lg">
        {editForm && selected && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input className={`form-input ${errors.customer ? 'input-error' : ''}`} value={editForm.customer} onChange={e => ef('customer', e.target.value)} />
                {errors.customer && <p className="field-error">{errors.customer}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input className="form-input" value={editForm.contact || ''} onChange={e => ef('contact', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Design Description</label>
              <input className="form-input" value={editForm.design || ''} onChange={e => ef('design', e.target.value)} />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className={`form-input ${errors.deadline ? 'input-error' : ''}`} type="date" value={editForm.deadline} onChange={e => ef('deadline', e.target.value)} />
                {errors.deadline && <p className="field-error">{errors.deadline}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editForm.status} onChange={e => ef('status', e.target.value)}>
                  {PRODUCTION_STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Payment (₱)</label>
                <input className="form-input" type="number" value={editForm.paidAmount !== selected.paidAmount ? editForm.paidAmount - selected.paidAmount : ''} onChange={e => ef('paidAmount', selected.paidAmount + (Number(e.target.value)||0))} placeholder="0" />
                <p className="field-error" style={{ color:'var(--gray-mid)' }}>Paid: {formatCurrency(editForm.paidAmount || 0)} / {formatCurrency(editForm.totalAmount || 0)}</p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => ef('notes', e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
            </div>
          </>
        )}
      </Modal>

      {/* Order Complete Modal */}
      <Modal open={modal === 'complete'} onClose={close} title="Mark Order as Complete" size="sm">
        {selected && (
          <>
            <div className="complete-summary">
              <div className="complete-row"><span>Customer</span><strong>{selected.customer}</strong></div>
              <div className="complete-row"><span>Total Amount</span><strong>{formatCurrency(selected.totalAmount)}</strong></div>
              <div className="complete-row"><span>Already Paid</span><strong>{formatCurrency(selected.paidAmount)}</strong></div>
              <div className="complete-row complete-row--balance">
                <span>Remaining Balance</span>
                <strong style={{ color: totalDue(selected) > 0 ? '#c62828' : '#2e7d32' }}>{formatCurrency(Math.max(0, totalDue(selected)))}</strong>
              </div>
            </div>
            <div className="form-group" style={{ marginTop:16 }}>
              <label className="form-label">Amount Received Now (₱)</label>
              <input className={`form-input ${errors.amount ? 'input-error' : ''}`} type="number" value={completeAmount} onChange={e => { setCompleteAmount(e.target.value); setErrors({}) }} placeholder="0" />
              {errors.amount && <p className="field-error">{errors.amount}</p>}
              {completeAmount !== '' && (
                <p className="field-error" style={{ color:'var(--gray-mid)', marginTop:4 }}>
                  Total collected: {formatCurrency((selected.paidAmount||0) + (Number(completeAmount)||0))} — Status: <strong>{derivePaymentStatus((selected.paidAmount||0) + (Number(completeAmount)||0), selected.totalAmount)}</strong>
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleComplete}>Complete Order</button>
            </div>
          </>
        )}
      </Modal>

      {/* Re-order Modal */}
      <Modal open={modal === 'reorder'} onClose={close} title={`Re-order — ${selected?.customer}`} size="md">
        {editForm && (
          <>
            <div className="oh-reorder-info">
              <p>Creating a new order based on <strong>{selected?.id}</strong>. Adjust the details below.</p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input className="form-input" value={editForm.customer} onChange={e => ef('customer', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className={`form-input ${errors.deadline ? 'input-error' : ''}`} type="date" value={editForm.deadline} onChange={e => ef('deadline', e.target.value)} />
                {errors.deadline && <p className="field-error">{errors.deadline}</p>}
              </div>
            </div>
            {editForm.type !== 'lower-only' && (
              <div className="form-group">
                <label className="form-label">Jersey Sizes</label>
                <div className="sizes-grid">
                  {SIZE_KEYS.map(sz => (
                    <div key={sz} className="size-input">
                      <label>{sz}</label>
                      <input type="number" min="0" className="form-input" value={editForm.upperSizes?.[sz]||0} onChange={e => eSz('upperSizes', sz, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editForm.type !== 'upper-only' && (
              <div className="form-group">
                <label className="form-label">Shorts Sizes</label>
                <div className="sizes-grid">
                  {SIZE_KEYS.map(sz => (
                    <div key={sz} className="size-input">
                      <label>{sz}</label>
                      <input type="number" min="0" className="form-input" value={editForm.lowerSizes?.[sz]||0} onChange={e => eSz('lowerSizes', sz, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Down Payment (₱)</label>
              <input className="form-input" type="number" value={editForm.paidAmount} onChange={e => ef('paidAmount', Number(e.target.value)||0)} placeholder="0" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReorder}>Place Re-order</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
