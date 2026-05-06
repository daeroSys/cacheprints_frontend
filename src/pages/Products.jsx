import { useState } from 'react'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { formatCurrency, generateId, nowISO } from '../utils/helpers'
import { SIZE_KEYS, EMPTY_SIZES } from '../utils/constants'
import './PageCommon.css'
import './Products.css'

const EMPTY_PRODUCT = { name:'', description:'', type:'Sleeveless Jersey', upperPrice:'', lowerPrice:'', bannerAvailable:false, bannerPrice:'', image:null, stock:{ XS:0,S:0,M:0,L:0,XL:0,XXL:0 }, bom:[] }
const TYPE_LABELS   = { 'Sleeveless Jersey':'Sleeveless Jersey', 'Tshirt Jersey':'Tshirt type Jersey', 'Shorts':'Shorts', 'Full Set':'Full Set', 'full-set':'Legacy: Full Set', 'upper-only':'Legacy: Jersey Only', 'lower-only':'Legacy: Shorts Only' }

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel='Confirm', danger=false }) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm">
    <p style={{ color:'var(--gray-dark)', lineHeight:1.6, marginBottom:4 }}>{message}</p>
    <div className="modal-actions">
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Modal>
)

export default function Products() {
  const { products, addProduct, updateProduct, archiveProduct, materials } = useApp()
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)
  const [bomModal, setBomModal] = useState(null)
  const [bomForm, setBomForm] = useState([])
  const [form,   setForm]   = useState(EMPTY_PRODUCT)
  const [editId, setEditId] = useState(null)
  const [errors, setErrors] = useState({})
  const [archiveConfirm, setArchiveConfirm] = useState(null)

  const activeMats = materials.filter(m => !m.isArchived)

  const active   = products.filter(p => !p.isArchived)
  const filtered = active.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )
  const { page, setPage, totalPages, paginated, total } = usePagination(filtered, 10)
  const sf  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const sSt = (sz, v) => setForm(p => ({ ...p, stock: { ...p.stock, [sz]: Number(v)||0 } }))

  const openAdd  = () => { setForm(EMPTY_PRODUCT); setEditId(null); setErrors({}); setModal('product') }
  const openEdit = (p)  => { setForm({ ...p, stock: p.stock || { ...EMPTY_SIZES } }); setEditId(p.id); setErrors({}); setModal('product') }
  const openBom  = (p)  => { setBomModal(p); setBomForm(p.bom || []); setErrors({}) }
  const close    = () => { setModal(null); setBomModal(null); setErrors({}) }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 500000) { alert('Image too large. Please use an image under 500KB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => sf('image', ev.target.result)
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required.'
    if (form.type !== 'lower-only' && (!form.upperPrice || Number(form.upperPrice) <= 0)) e.upperPrice = 'Jersey price must be greater than 0.'
    if (form.type !== 'upper-only' && (!form.lowerPrice || Number(form.lowerPrice) <= 0)) e.lowerPrice = 'Shorts price must be greater than 0.'
    if (form.bannerAvailable && (!form.bannerPrice || Number(form.bannerPrice) <= 0)) e.bannerPrice = 'Banner price is required when banner is enabled.'
    const totalStock = Object.values(form.stock).reduce((s,v) => s+(Number(v)||0), 0)
    if (totalStock < 0) e.stock = 'Stock quantities cannot be negative.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = { ...form, upperPrice:Number(form.upperPrice)||0, lowerPrice:Number(form.lowerPrice)||0, bannerPrice:Number(form.bannerPrice)||0 }
    if (editId) { updateProduct(editId, payload) }
    else { addProduct({ ...payload, id:generateId('PRD'), createdAt:nowISO().slice(0,10), isArchived:false, archivedAt:null }) }
    close()
  }

  const handleSaveBom = () => {
    updateProduct(bomModal.id, { bom: bomForm })
    setBomModal(null)
  }

  const addBomItem = () => setBomForm(p => [...p, { materialId:'', materialName:'', usage:{ ...EMPTY_SIZES } }])
  const removeBomItem = (i) => setBomForm(p => p.filter((_,idx) => idx !== i))
  const updateBomItem = (i, k, v) => setBomForm(p => p.map((it,idx) => idx === i ? { ...it, [k]: v } : it))
  const updateBomUsage = (i, sz, v) => setBomForm(p => p.map((it,idx) => idx === i ? { ...it, usage: { ...it.usage, [sz]: Number(v)||0 } } : it))

  const handleArchive = (p) => setArchiveConfirm(p)
  const doArchive = () => { if (archiveConfirm) { archiveProduct(archiveConfirm.id); setArchiveConfirm(null) } }

  const totalStock = (p) => Object.values(p.stock || {}).reduce((s,v) => s+(Number(v)||0), 0)

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage your product catalog and stock levels"
        action={<button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>} />

      <div className="page-toolbar animate-fade-up delay-1">
        <input className="toolbar-search" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="products-grid animate-fade-up delay-2">
        {paginated.map((p, i) => (
          <div key={p.id} className="product-card" style={{ animationDelay:`${i*40}ms` }}>
            <div className="product-card__img">
              {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-card__img-placeholder">◧</span>}
            </div>
            <div className="product-card__body">
              <div className="product-card__head">
                <div>
                  <p className="product-card__name">{p.name}</p>
                  <Badge status="status-blue">{TYPE_LABELS[p.type]}</Badge>
                </div>
                <span className="product-card__orders">{totalStock(p)} pcs</span>
              </div>
              <p className="product-card__desc">{p.description}</p>
              <div className="product-card__stock-row">
                {SIZE_KEYS.map(sz => (
                  <div key={sz} className="pcs-pill">
                    <span className="pcs-pill__sz">{sz}</span>
                    <span className="pcs-pill__qty">{(p.stock||{})[sz]||0}</span>
                  </div>
                ))}
              </div>
              <div className="product-card__prices">
                {p.type !== 'lower-only' && <span className="price-tag"><span className="price-label">Jersey</span>{formatCurrency(p.upperPrice)}/pc</span>}
                {p.type !== 'upper-only' && <span className="price-tag"><span className="price-label">Shorts</span>{formatCurrency(p.lowerPrice)}/pc</span>}
                {p.bannerAvailable && <span className="price-tag price-tag--banner"><span className="price-label">Banner</span>{formatCurrency(p.bannerPrice)}/pc</span>}
              </div>
            </div>
            <div className="product-card__footer">
              <div className="td-actions">
                <button className="td-btn" onClick={() => openEdit(p)}>Update</button>
                <button className="td-btn" onClick={() => openBom(p)}>BOM</button>
                <button className="td-btn td-btn--del" onClick={() => handleArchive(p)}>Archive</button>
              </div>
            </div>
          </div>
        ))}
        {paginated.length === 0 && (
          <div className="empty-state" style={{ gridColumn:'1/-1' }}>
            <div className="empty-state__icon">◧</div>
            <p className="empty-state__text">No products found</p>
            <p className="empty-state__sub">Click "+ Add Product" to add one.</p>
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={10} />

      {/* Add/Edit Modal */}
      <Modal open={modal === 'product'} onClose={close} title={editId ? 'Update Product' : 'Add Product'} size="md">
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className={`form-input ${errors.name?'input-error':''}`} value={form.name} onChange={e => sf('name',e.target.value)} placeholder="e.g. Sublimation Football Kit" />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description} onChange={e => sf('description',e.target.value)} placeholder="Brief product description…" />
        </div>
        <div className="form-group">
          <label className="form-label">Product Type *</label>
          <select className="form-select" value={form.type} onChange={e => sf('type',e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="form-row">
          {form.type !== 'lower-only' && (
            <div className="form-group">
              <label className="form-label">Jersey Price (₱) *</label>
              <input className={`form-input ${errors.upperPrice?'input-error':''}`} type="number" value={form.upperPrice} onChange={e => sf('upperPrice',e.target.value)} placeholder="0" />
              {errors.upperPrice && <p className="field-error">{errors.upperPrice}</p>}
            </div>
          )}
          {form.type !== 'upper-only' && (
            <div className="form-group">
              <label className="form-label">Shorts Price (₱) *</label>
              <input className={`form-input ${errors.lowerPrice?'input-error':''}`} type="number" value={form.lowerPrice} onChange={e => sf('lowerPrice',e.target.value)} placeholder="0" />
              {errors.lowerPrice && <p className="field-error">{errors.lowerPrice}</p>}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}>
            <input type="checkbox" checked={form.bannerAvailable} onChange={e => sf('bannerAvailable',e.target.checked)} />
            Banner / Logo print available
          </label>
        </div>
        {form.bannerAvailable && (
          <div className="form-group">
            <label className="form-label">Banner Price per Piece (₱) *</label>
            <input className={`form-input ${errors.bannerPrice?'input-error':''}`} type="number" value={form.bannerPrice} onChange={e => sf('bannerPrice',e.target.value)} placeholder="0" />
            {errors.bannerPrice && <p className="field-error">{errors.bannerPrice}</p>}
          </div>
        )}

        {/* Stock per size */}
        <div className="form-group">
          <label className="form-label">Initial Stock per Size</label>
          {errors.stock && <p className="field-error">{errors.stock}</p>}
          <div className="sizes-grid" style={{ marginTop:6 }}>
            {SIZE_KEYS.map(sz => (
              <div key={sz} className="size-input">
                <label>{sz}</label>
                <input type="number" min="0" className="form-input" value={form.stock[sz]} onChange={e => sSt(sz,e.target.value)} />
              </div>
            ))}
          </div>
          <p className="size-subtotal" style={{ marginTop:6 }}>Total: {Object.values(form.stock).reduce((s,v)=>s+(Number(v)||0),0)} pcs</p>
        </div>

        <div className="form-group">
          <label className="form-label">Product Image (optional, max 500KB)</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="form-input" style={{ padding:'6px 10px' }} />
          {form.image && <img src={form.image} alt="preview" style={{ marginTop:8,maxHeight:100,borderRadius:6,border:'1px solid var(--gray-border)' }} />}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </Modal>

      {/* BOM Modal */}
      <Modal open={!!bomModal} onClose={close} title={`Bill of Materials: ${bomModal?.name}`} size="lg">
        <p style={{ color:'var(--gray-dark)', marginBottom:16, fontSize:13 }}>
          Define the required materials and quantities to produce one unit of this product, per size.
        </p>
        
        {bomForm.map((item, i) => (
          <div key={i} style={{ background:'var(--gray-surface)', padding:16, borderRadius:'var(--radius-md)', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div className="form-group" style={{ flex:1, marginRight:16, marginBottom:0 }}>
                <label className="form-label">Material</label>
                <select className="form-select" value={item.materialId} onChange={e => {
                  const m = activeMats.find(x => x.id === e.target.value)
                  if (m) { updateBomItem(i, 'materialId', m.id); updateBomItem(i, 'materialName', m.name) }
                }}>
                  <option value="">Select Material...</option>
                  {activeMats.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
              </div>
              <button className="td-btn td-btn--del" style={{ alignSelf:'flex-end' }} onClick={() => removeBomItem(i)}>Remove</button>
            </div>
            <div className="sizes-grid">
              {SIZE_KEYS.map(sz => (
                <div key={sz} className="size-input">
                  <label>{sz}</label>
                  <input type="number" min="0" step="any" className="form-input" value={item.usage[sz]||''} onChange={e => updateBomUsage(i, sz, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button className="btn btn-secondary" style={{ fontSize:13 }} onClick={addBomItem}>+ Add Material Requirement</button>

        <div className="modal-actions" style={{ marginTop:24 }}>
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveBom}>Save BOM</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!archiveConfirm}
        title="Archive Product"
        message={`Archive "${archiveConfirm?.name}"? It will be moved to the Archive section and can be restored later.`}
        onConfirm={doArchive}
        onCancel={() => setArchiveConfirm(null)}
        confirmLabel="Archive"
      />
    </div>
  )
}
