import { useAuth } from '../context/AuthContext'
import { patch, del } from '../utils/api'
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { usePermission } from '../hooks/usePermission'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import NoPermissionModal from '../components/ui/NoPermissionModal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import './PageCommon.css'
import './Archive.css'

// ─── Confirm Modal (outside Archive so it never re-mounts) ───────────────────
const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm">
    <p style={{ color: 'var(--gray-dark)', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
    <div className="modal-actions">
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Archive() {
  const { materials, restoreMaterial, deleteMaterial, orders, restoreOrder, deleteOrder, purchases, restorePurchase, deletePurchase } = useApp()
  const { users, restoreUser } = useAuth()
  const { guard, denied, clearDenied } = usePermission()

  const [tab, setTab] = useState('orders')
  const [confirm, setConfirm] = useState(null) // { type, entity, item }

  useEffect(() => {
    const defaultTab = sessionStorage.getItem('archive_tab')
    if (defaultTab) {
      setTab(defaultTab)
      sessionStorage.removeItem('archive_tab')
    }
  }, [])

  const archivedOrders    = orders.filter(o => o.isArchived)
  const archivedMaterials = materials.filter(m => m.isArchived)
  const archivedUsers     = users.filter(u => u.isArchived)
  const archivedPurchases = purchases.filter(p => p.isArchived)

  const pgOrders    = usePagination(archivedOrders,    10)
  const pgMaterials = usePagination(archivedMaterials, 10)
  const pgUsers     = usePagination(archivedUsers,     10)
  const pgPurchases = usePagination(archivedPurchases, 10)

  // ── Permission-guarded openers ─────────────────────────────────────────────
  const askRestore = (entity, item) =>
    guard('restore', () => setConfirm({ type: 'restore', entity, item }))

  const askDelete = (entity, item) =>
    guard('delete_record', () => setConfirm({ type: 'delete', entity, item }))

  // ── Execute after user confirms ────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirm) return
    const { type, entity, item } = confirm
    if (type === 'restore') {
      if (entity === 'order')    restoreOrder(item.id)
      if (entity === 'material') {
        const res = await patch(`/materials/${item.id}/restore`)
        if (res.ok) restoreMaterial(item.id)
        else alert(res.error || 'Failed to restore material')
      }
      if (entity === 'user')     restoreUser(item.id)
      if (entity === 'purchase') {
        const res = await patch(`/purchases/${item.id}/restore`)
        if (res.ok) restorePurchase(item.id)
        else alert(res.error || 'Failed to restore purchase')
      }
    } else {
      // Permanent delete — users are only archived, never permanently deleted
      if (entity === 'order')    deleteOrder(item.id)
      if (entity === 'material') {
        const res = await del(`/materials/${item.id}`)
        if (res.ok) deleteMaterial(item.id)
        else alert(res.error || 'Failed to delete material')
      }
      if (entity === 'purchase') {
        const res = await del(`/purchases/${item.id}`)
        if (res.ok) deletePurchase(item.id)
        else alert(res.error || 'Failed to delete purchase')
      }
    }
    setConfirm(null)
  }

  // ── Confirmation message ───────────────────────────────────────────────────
  const confirmMessage = () => {
    if (!confirm) return ''
    const { entity, item, type } = confirm
    const name = item?.customer || item?.name || item?.username || item?.id || 'this record'
    if (entity === 'user')
      return `Restore "@${item?.username}" (${item?.name || item?.username})? Their account will be reactivated and they will be able to log in again.`
    if (type === 'restore')
      return `Restore "${name}"? It will be moved back to its active section and appear on all relevant pages.`
    return `Permanently delete "${name}"? This action cannot be undone and all data will be lost forever.`
  }

  // ── Column definitions — render functions reference stable handlers ─────────
  const orderCols = [
    { key: 'id',          label: 'Order ID',   render: v => <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{v}</span> },
    { key: 'customer',    label: 'Customer' },
    { key: 'design',      label: 'Design' },
    { key: 'totalAmount', label: 'Amount',      render: v => formatCurrency(v) },
    { key: 'archivedAt',  label: 'Archived On', render: v => formatDateTime(v) },
    { key: '_actions',    label: '',            render: (_, row) => (
      <div className="td-actions">
        <button className="td-btn td-btn--restore" onClick={() => askRestore('order', row)}>↩ Restore</button>
        <button className="td-btn td-btn--del"     onClick={() => askDelete('order', row)}>🗑 Delete</button>
      </div>
    )},
  ]

  const materialCols = [
    { key: 'name',        label: 'Material' },
    { key: 'category',    label: 'Category' },
    { key: 'quantity',    label: 'Qty',         render: (v, row) => `${v} ${row.unit}` },
    { key: 'costPerUnit', label: 'Cost/Unit',   render: v => formatCurrency(v) },
    { key: 'archivedAt',  label: 'Archived On', render: v => formatDateTime(v) },
    { key: '_actions',    label: '',            render: (_, row) => (
      <div className="td-actions">
        <button className="td-btn td-btn--restore" onClick={() => askRestore('material', row)}>↩ Restore</button>
        <button className="td-btn td-btn--del"     onClick={() => askDelete('material', row)}>🗑 Delete</button>
      </div>
    )},
  ]

  const userCols = [
    { key: 'name',       label: 'Full Name' },
    { key: 'username',   label: 'Username',    render: v => <span style={{ fontFamily:'monospace', fontWeight:600 }}>@{v}</span> },
    { key: 'role',       label: 'Role' },
    { key: 'email',      label: 'Email',       render: v => v || '—' },
    { key: 'archivedAt', label: 'Archived On', render: v => v ? new Date(v).toLocaleString('en-PH', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—' },
    { key: 'approvedBy', label: 'Approved by', render: v => v ? `@${v}` : '—' },
    { key: '_actions',   label: '',            render: (_, row) => (
      <div className="td-actions">
        <button className="td-btn td-btn--restore" onClick={() => askRestore('user', row)}>↩ Restore</button>
      </div>
    )},
  ]

  const purchaseCols = [
    { key: 'purchaseId',  label: 'Purchase ID', render: v => <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{v}</span> },
    { key: 'items',       label: 'Supplier(s)', render: v => [...new Set((v||[]).map(i => i.supplier))].filter(Boolean).join(', ') || '—' },
    { key: 'items',       label: 'Item(s)',     render: v => (v||[]).map(i => i.name).join(', ') || '—' },
    { key: 'overallCost', label: 'Amount',      render: v => formatCurrency(v) },
    { key: 'archivedAt',  label: 'Archived On', render: v => formatDateTime(v) },
    { key: '_actions',    label: '',            render: (_, row) => (
      <div className="td-actions">
        <button className="td-btn td-btn--restore" onClick={() => askRestore('purchase', row)}>↩ Restore</button>
        <button className="td-btn td-btn--del"     onClick={() => askDelete('purchase', row)}>🗑 Delete</button>
      </div>
    )},
  ]

  const TABS = [
    { key: 'orders',    label: `Job Orders (${archivedOrders.length})` },
    { key: 'purchases', label: `Purchases (${archivedPurchases.length})` },
    { key: 'materials', label: `Materials (${archivedMaterials.length})` },
    { key: 'users',     label: `Users (${archivedUsers.length})` },
  ]

  const totalArchived = archivedOrders.length + archivedMaterials.length + archivedUsers.length + archivedPurchases.length

  return (
    <div>
      <PageHeader title="Archive" subtitle="View, restore, or permanently delete archived records" />

      {totalArchived === 0 ? (
        <div className="empty-state animate-fade-up">
          <div className="empty-state__icon">⊟</div>
          <p className="empty-state__text">Archive is empty</p>
          <p className="empty-state__sub">Archived records will appear here.</p>
        </div>
      ) : (
        <>
          <div className="archive-tabs animate-fade-up delay-1">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`archive-tab ${tab === t.key ? 'archive-tab--active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="animate-fade-up delay-2">
            {tab === 'orders' && (
              <>
                <DataTable columns={orderCols} data={pgOrders.paginated} emptyText="No archived job orders." />
                <Pagination page={pgOrders.page} totalPages={pgOrders.totalPages} setPage={pgOrders.setPage} total={pgOrders.total} pageSize={10} />
              </>
            )}
            {tab === 'purchases' && (
              <>
                <DataTable columns={purchaseCols} data={pgPurchases.paginated} emptyText="No archived purchases." />
                <Pagination page={pgPurchases.page} totalPages={pgPurchases.totalPages} setPage={pgPurchases.setPage} total={pgPurchases.total} pageSize={10} />
              </>
            )}
            {tab === 'materials' && (
              <>
                <DataTable columns={materialCols} data={pgMaterials.paginated} emptyText="No archived materials." />
                <Pagination page={pgMaterials.page} totalPages={pgMaterials.totalPages} setPage={pgMaterials.setPage} total={pgMaterials.total} pageSize={10} />
              </>
            )}
            {tab === 'users' && (
              <>
                <DataTable columns={userCols} data={pgUsers.paginated} emptyText="No archived users." />
                <Pagination page={pgUsers.page} totalPages={pgUsers.totalPages} setPage={pgUsers.setPage} total={pgUsers.total} pageSize={10} />
              </>
            )}
          </div>
        </>
      )}

      {/* Confirm action modal */}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'restore' ? 'Confirm Restore' : 'Confirm Permanent Delete'}
        message={confirmMessage()}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        confirmLabel={confirm?.type === 'restore' ? 'Yes, Restore' : 'Yes, Delete Permanently'}
        danger={confirm?.type === 'delete'}
      />

      {/* No permission modal for Staff users */}
      <NoPermissionModal info={denied} onClose={clearDenied} />
    </div>
  )
}
