import { usePermission } from '../hooks/usePermission'
import NoPermissionModal from '../components/ui/NoPermissionModal'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatCurrency, generateId, isLowStock, nowISO } from '../utils/helpers'
import { post, put, patch } from '../utils/api'
import './PageCommon.css'
import './Materials.css'

const DEFAULT_CATS = ['Fabric','Paper','Ink','Thread','Jersey','Packaging','Vinyl','Other']
const EMPTY = { name:'', unit:'pcs', costPerUnit:'', minQty:'', maxQty:'', leadTime:'', reorderQuantity:'', category:'', link:'' }

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel='Confirm' }) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm">
    <p style={{ color:'var(--gray-dark)', lineHeight:1.6, marginBottom:4 }}>{message}</p>
    <div className="modal-actions">
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Modal>
)

export default function Materials() {
  const { materials, addMaterial, updateMaterial, archiveMaterial } = useApp()
  const { guard, denied, clearDenied, isAdmin } = usePermission()
  const [search,         setSearch]         = useState('')
  const [catFilter,      setCatFilter]      = useState('All')
  const [modal,          setModal]          = useState(null)
  const [form,           setForm]           = useState(EMPTY)
  const [editId,         setEditId]         = useState(null)
  const [errors,         setErrors]         = useState({})
  const [archiveConfirm, setArchiveConfirm] = useState(null)

  // Category combobox state
  const [catInput,     setCatInput]     = useState('')
  const [catDropOpen,  setCatDropOpen]  = useState(false)

  // Collect all categories from existing materials + defaults
  const allCats = useMemo(() => {
    const fromMaterials = materials.filter(m => !m.isArchived && m.category).map(m => m.category)
    return [...new Set([...DEFAULT_CATS, ...fromMaterials])].sort()
  }, [materials])

  const filteredCatSuggestions = useMemo(() => {
    if (!catInput.trim()) return allCats
    return allCats.filter(c => c.toLowerCase().includes(catInput.toLowerCase()))
  }, [catInput, allCats])

  const active   = (materials || []).filter(m => !m?.isArchived)
  const filtered = active.filter(m => {
    const name = m?.name || 'Unnamed Material'
    const cat  = m?.category || 'Other'
    const ms = name.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'All' || cat === catFilter
    return ms && mc
  })
  const { page, setPage, totalPages, paginated, total } = usePagination(filtered, 10)

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const getUnitForCategory = (cat) => {
    const c = cat.toLowerCase()
    if (c === 'fabric' || c === 'fabrics') return 'meters'
    if (c === 'paper') return 'sheets'
    if (c === 'thread') return 'grams'
    if (c === 'ink') return 'ml'
    if (c === 'vinyl') return 'meters'
    if (c === 'jersey' || c === 'packaging') return 'pcs'
    return ''
  }

  const openAdd = () => {
    setForm(EMPTY); setEditId(null); setErrors({})
    setCatInput(''); setCatDropOpen(false)
    setModal('add')
  }
  const openEdit = (mat) => {
    setForm({ ...mat }); setEditId(mat.id); setErrors({})
    setCatInput(mat.category || ''); setCatDropOpen(false)
    setModal('edit')
  }
  const close = () => { setModal(null); setEditId(null); setErrors({}); setCatDropOpen(false) }

  const selectCat = (cat) => {
    setCatInput(cat)
    const defaultUnit = getUnitForCategory(cat)
    if (defaultUnit) {
      setForm(p => ({ ...p, category: cat, unit: defaultUnit }))
    } else {
      sf('category', cat)
    }
    setCatDropOpen(false)
  }

  const handleCatInputChange = (val) => {
    setCatInput(val)
    const defaultUnit = getUnitForCategory(val)
    if (defaultUnit) {
      setForm(p => ({ ...p, category: val, unit: defaultUnit }))
    } else {
      sf('category', val)
    }
    setCatDropOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())     e.name        = 'Material name is required.'
    if (!form.category?.trim()) e.category   = 'Category is required.'
    if (!form.costPerUnit || Number(form.costPerUnit) <= 0) e.costPerUnit = 'Cost must be greater than 0.'
    if (modal === 'add' && (form.quantity === '' || form.quantity === undefined || Number(form.quantity) < 0)) e.quantity = 'Quantity cannot be negative.'
    if (!form.minQty || Number(form.minQty) < 0)  e.minQty = 'Minimum quantity is required.'
    if (!form.maxQty || Number(form.maxQty) <= 0)  e.maxQty = 'Maximum quantity is required.'
    if (Number(form.maxQty) <= Number(form.minQty)) e.maxQty = 'Max Qty must be greater than Min Qty.'
    if (!form.leadTime || Number(form.leadTime) < 0) e.leadTime = 'Lead time (days) is required.'
    if (form.reorderQuantity && Number(form.reorderQuantity) < 0) e.reorderQuantity = 'Cannot be negative.'
    if (form.link && form.link.trim() && !form.link.startsWith('http')) e.link = 'Link must start with http:// or https://'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (modal === 'add') {
      const newMat = {
        materialId: generateId('MAT'),
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: Number(form.quantity || 0),
        costPerUnit: Number(form.costPerUnit),
        minQty: Number(form.minQty),
        maxQty: Number(form.maxQty),
        leadTime: Number(form.leadTime),
        reorderQuantity: Number(form.reorderQuantity || 0),
        link: form.link || ''
      }
      const res = await post('/materials', newMat)
      if (res.ok) {
        // Pass res.material with id mapped for local state compatibility
        addMaterial({ ...res.material, id: res.material._id })
      } else {
        alert(res.error || 'Failed to add material')
        return
      }
    } else {
      const { quantity, ...rest } = form
      const payload = { ...rest, costPerUnit: Number(form.costPerUnit), minQty: Number(form.minQty), maxQty: Number(form.maxQty), leadTime: Number(form.leadTime), reorderQuantity: Number(form.reorderQuantity || 0) }
      const res = await put(`/materials/${editId}`, payload)
      if (res.ok) {
        updateMaterial(editId, payload)
      } else {
        alert(res.error || 'Failed to update material')
        return
      }
    }
    close()
  }

  const doArchive = async () => { 
    if (archiveConfirm) { 
      const res = await patch(`/materials/${archiveConfirm.id}/archive`)
      if (res.ok) archiveMaterial(archiveConfirm.id)
      else alert(res.error || 'Failed to archive material')
      setArchiveConfirm(null) 
    } 
  }

  const uniqueCatFilters = ['All', ...new Set(active.map(m => m.category).filter(Boolean))]

  const cols = [
    { key:'name', label:'Material Name', render:(v,row) => {
      const isCrit = row.status === 'Critical'
      const isLow = row.status === 'Low'
      return (
        <span className="td-name">
          {v}
          {isCrit && <span className="td-crit-badge">Critical</span>}
          {isLow && <span className="td-low-badge">Low</span>}
        </span>
      )
    }},
    { key:'category', label:'Category', render: v => <Badge status="status-gray">{v}</Badge> },
    { key:'unit',     label:'Unit Type', render: v => <span style={{ fontSize:13, color:'var(--gray-dark)', fontWeight:500 }}>{v}</span> },
    { key:'quantity', label:'Current Qty', render:(v,row) => `${v} ${row.unit}` },
    { key:'minQty',   label:'Min Qty' },
    { key:'maxQty',   label:'Max Qty' },
    { key:'link', label:'Shop Link', render: v => v
      ? <a href={v} target="_blank" rel="noreferrer" style={{ color:'#1565c0', fontSize:12, textDecoration:'underline' }}>View Link ↗</a>
      : <span style={{ color:'var(--gray-light)', fontSize:12 }}>—</span>
    },
    { key:'id', label:'', render:(_,row) => (
      <div className="td-actions">
        <button className="td-btn" onClick={() => guard('update_material', () => openEdit(row))}>Update</button>
        <button className="td-btn td-btn--del" onClick={() => guard('archive', () => setArchiveConfirm(row))}>Archive</button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Materials Database" subtitle="Manage all raw materials and supplies"
        action={isAdmin ? <button className="btn btn-primary" onClick={openAdd}>+ Add Material</button> : null} />

      <div className="page-toolbar animate-fade-up delay-1">
        <input className="toolbar-search" placeholder="Search materials…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <div className="toolbar-filters">
          {uniqueCatFilters.map(c => (
            <button key={c} className={`filter-chip ${catFilter===c?'filter-chip--active':''}`} onClick={() => { setCatFilter(c); setPage(1) }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="animate-fade-up delay-2">
        <DataTable columns={cols} data={paginated} emptyText="No materials found." />
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />
      </div>

      <Modal open={modal==='add'||modal==='edit'} onClose={close} title={modal==='add'?'Add Material':'Update Material'}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Material Name *</label>
            <input className={`form-input ${errors.name?'input-error':''}`} value={form.name} onChange={e => sf('name',e.target.value)} placeholder="e.g. Sublimation Fabric (White)" />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          {/* Category combobox */}
          <div className="form-group" style={{ position:'relative' }}>
            <label className="form-label">Category *</label>
            <input
              className={`form-input ${errors.category?'input-error':''}`}
              value={catInput}
              onChange={e => handleCatInputChange(e.target.value)}
              onFocus={() => setCatDropOpen(true)}
              onBlur={() => setTimeout(() => setCatDropOpen(false), 150)}
              placeholder="Type or select a category…"
              autoComplete="off"
            />
            {errors.category && <p className="field-error">{errors.category}</p>}
            {catDropOpen && filteredCatSuggestions.length > 0 && (
              <div className="cat-dropdown">
                {filteredCatSuggestions.map(cat => (
                  <button
                    key={cat}
                    className={`cat-dropdown__item ${form.category===cat?'cat-dropdown__item--active':''}`}
                    onMouseDown={() => selectCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="form-select" value={form.unit} onChange={e => sf('unit',e.target.value)}>
              {['pcs','meters','ml','liters','sheets','spools','kg','grams'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          {modal === 'add' ? (
            <div className="form-group">
              <label className="form-label">Initial Qty</label>
              <input className={`form-input ${errors.quantity?'input-error':''}`} type="number" value={form.quantity||''} onChange={e => sf('quantity',e.target.value)} placeholder="0" />
              {errors.quantity && <p className="field-error">{errors.quantity}</p>}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Current Qty (locked)</label>
              <input className="form-input" value={form.quantity} disabled style={{ background:'var(--gray-surface)', color:'var(--gray-mid)', cursor:'not-allowed' }} />
              <p style={{ fontSize:11, color:'var(--gray-mid)', marginTop:3 }}>Use Stock Levels → Adjust to modify.</p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Cost / Unit (₱) *</label>
            <input className={`form-input ${errors.costPerUnit?'input-error':''}`} type="number" value={form.costPerUnit} onChange={e => sf('costPerUnit',e.target.value)} placeholder="0" />
            {errors.costPerUnit && <p className="field-error">{errors.costPerUnit}</p>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Min Qty *</label>
            <input className={`form-input ${errors.minQty?'input-error':''}`} type="number" value={form.minQty} onChange={e => sf('minQty',e.target.value)} placeholder="0" />
            {errors.minQty && <p className="field-error">{errors.minQty}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Max Qty *</label>
            <input className={`form-input ${errors.maxQty?'input-error':''}`} type="number" value={form.maxQty} onChange={e => sf('maxQty',e.target.value)} placeholder="0" />
            {errors.maxQty && <p className="field-error">{errors.maxQty}</p>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Lead Time (Days) *</label>
            <input className={`form-input ${errors.leadTime?'input-error':''}`} type="number" value={form.leadTime} onChange={e => sf('leadTime',e.target.value)} placeholder="0" />
            {errors.leadTime && <p className="field-error">{errors.leadTime}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Reorder Quantity</label>
            <input className={`form-input ${errors.reorderQuantity?'input-error':''}`} type="number" value={form.reorderQuantity} onChange={e => sf('reorderQuantity',e.target.value)} placeholder="0" />
            {errors.reorderQuantity && <p className="field-error">{errors.reorderQuantity}</p>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Online Shop Link <span style={{ color:'var(--gray-mid)', fontWeight:400 }}>(optional)</span></label>
          <input className={`form-input ${errors.link?'input-error':''}`} value={form.link||''} onChange={e => sf('link',e.target.value)} placeholder="https://shopee.ph/... or https://lazada.com.ph/..." />
          {errors.link && <p className="field-error">{errors.link}</p>}
          <p style={{ fontSize:11, color:'var(--gray-mid)', marginTop:3 }}>Paste the product link from Shopee, Lazada, or any online store.</p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{modal==='add'?'Add Material':'Save Changes'}</button>
        </div>
      </Modal>

      <NoPermissionModal info={denied} onClose={clearDenied} />

      <ConfirmModal
        open={!!archiveConfirm}
        title="Archive Material"
        message={`Archive "${archiveConfirm?.name}"? It will be moved to the Archive section and can be restored later.`}
        onConfirm={doArchive}
        onCancel={() => setArchiveConfirm(null)}
        confirmLabel="Archive"
      />
    </div>
  )
}
