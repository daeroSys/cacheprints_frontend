import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { nowISO, derivePaymentStatus } from '../utils/helpers'
import { get, post } from '../utils/api'

const AppContext = createContext(null)

// currentUserRef is set from App.jsx so AppContext can log with real user info
let _currentUserRef = null
export const setCurrentUserRef = (user) => { _currentUserRef = user }

const getLogUser = () => {
  if (_currentUserRef) return `${_currentUserRef.role} · ${_currentUserRef.name || _currentUserRef.username}`
  return 'System'
}

// One-time cleanup of stale local storage keys from the old local-storage era
const STALE_KEYS = [
  'cp_materials_v4', 'cp_orders_v4', 'cp_purchases_v4', 'cp_transactions_v4',
  'cp_migrated_mats_v4', 'cp_migrated_orders_v4', 'cp_migrated_purchases_v4', 'cp_migrated_txns_v4',
]
if (typeof window !== 'undefined') {
  STALE_KEYS.forEach(k => localStorage.removeItem(k))
}

export function AppProvider({ children }) {
  const [materials,    setMaterials]    = useState([])
  const [orders,       setOrders]       = useState([])
  const [purchases,    setPurchases]    = useState([])
  const [transactions, setTransactions] = useState([])
  const [activityLog,  setActivityLog]  = useState([])

  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Fetch Materials from MongoDB
        const matRes = await get('/materials')
        if (matRes.ok) {
          setMaterials(matRes.materials.map(m => ({ ...m, id: m._id })))
        }

        // 2. Fetch Orders
        const orderRes = await get('/orders')
        if (orderRes.ok) {
          setOrders(orderRes.orders.map(o => ({ ...o, id: o._id })))
        }

        // 3. Fetch Purchases
        const purchRes = await get('/purchases')
        if (purchRes.ok) {
          setPurchases(purchRes.purchases.map(p => ({ ...p, id: p._id })))
        }

        // 4. Fetch Transactions
        const txnRes = await get('/transactions')
        if (txnRes.ok) {
          setTransactions(txnRes.transactions.map(t => ({ ...t, id: t._id })))
        }

        // 5. Fetch Activity Log
        const logRes = await get('/activity-log')
        if (logRes.ok) {
          setActivityLog(logRes.logs || [])
        }

      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      }
    }

    initData()

    // Background Polling: Refresh data every 8 seconds to keep systems in sync
    const interval = setInterval(() => {
      console.log('🔄 Background sync starting...')
      initData()
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  const refreshMaterials = async () => {
    const res = await get('/materials')
    if (res.ok) setMaterials(res.materials.map(m => ({ ...m, id: m._id })))
  }

  const refreshActivityLog = async () => {
    const res = await get('/activity-log')
    if (res.ok) setActivityLog(res.logs || [])
  }

  const refreshOrders = async () => {
    const res = await get('/orders')
    if (res.ok) setOrders(res.orders.map(o => ({ ...o, id: o._id })))
  }

  const refreshPurchases = async () => {
    const res = await get('/purchases')
    if (res.ok) setPurchases(res.purchases.map(p => ({ ...p, id: p._id })))
  }

  const refreshTransactions = async () => {
    const res = await get('/transactions')
    if (res.ok) setTransactions(res.transactions.map(t => ({ ...t, id: t._id })))
  }

  const refreshAll = async () => {
    console.log('🔄 Manual refresh triggered...')
    return initData()
  }

  // ─── Materials ───────────────────────────────────────────────
  const addMaterial = (m) => {
    setMaterials(p => [...p, m])
  }
  const updateMaterial = (id, upd) => {
    setMaterials(p => p.map(m => m.id === id ? { ...m, ...upd } : m))
  }
  const adjustMaterialStock = async (id, qty, reason) => {
    // This is handled via Transaction in the backend if we had an endpoint
    // For now, let's just use the local txn logic but we should ideally have a backend endpoint
    // Actually, backend has transactionRouter but only for GET.
    // Let's rely on refresh after purchase/order updates.
    await refreshMaterials()
    await refreshTransactions()
  }
  const archiveMaterial = (id) => {
    setMaterials(p => p.map(x => x.id === id ? { ...x, isArchived: true } : x))
  }
  const restoreMaterial = (id) => {
    setMaterials(p => p.map(x => x.id === id ? { ...x, isArchived: false } : x))
  }
  const deleteMaterial = (id) => {
    setMaterials(p => p.filter(x => x.id !== id))
  }

  // ─── Orders ──────────────────────────────────────────────────
  const addOrder = (order) => {
    setOrders(p => [{ ...order, id: order._id }, ...p])
  }
  const updateOrder = async (id, upd) => {
    setOrders(p => p.map(o => o.id === id ? { ...o, ...upd } : o))
  }
  const advanceOrderStage = async (id, nextStage, materialItems, stageNote) => {
    // The backend advanceOrderStage does material deduction and txn creation.
    // We just need to refresh our state.
    await refreshOrders()
    await refreshMaterials()
    await refreshTransactions()
  }
  const archiveOrder = (id) => {
    setOrders(p => p.map(x => x.id === id ? { ...x, isArchived: true } : x))
  }
  const restoreOrder = (id) => {
    setOrders(p => p.map(x => x.id === id ? { ...x, isArchived: false } : x))
  }
  const deleteOrder = (id) => {
    setOrders(p => p.filter(x => x.id !== id))
  }
  const completeOrder = async (id, amountNow) => {
    await refreshOrders()
    await refreshTransactions()
  }

  // ─── Purchases ───────────────────────────────────────────────
  const addPurchase = async () => {
    await refreshPurchases()
    await refreshTransactions()
    await refreshActivityLog()
  }
  const receivePurchase = async () => {
    // Backend receivePurchase handles stock update and txn creation.
    await refreshPurchases()
    await refreshMaterials()
    await refreshTransactions()
    await refreshActivityLog()
  }
  const archivePurchase = (id) => {
    setPurchases(p => p.map(x => x.id === id ? { ...x, isArchived: true } : x))
    refreshActivityLog()
  }
  const restorePurchase = (id) => {
    setPurchases(p => p.map(x => x.id === id ? { ...x, isArchived: false } : x))
    refreshActivityLog()
  }
  const deletePurchase = (id) => {
    setPurchases(p => p.filter(x => x.id !== id))
    refreshActivityLog()
  }

  const addTransaction = async (txn) => {
    // Manual adjustment if implemented on backend
    await refreshTransactions()
    await refreshMaterials()
  }

  // ─── Derive computed fields for each material ───────────────
  const enrichedMaterials = useMemo(() => materials.map(m => {
    const qty = Number(m.quantity) || 0
    const minQ = Number(m.minQty) || 0
    const maxQ = Number(m.maxQty) || 1
    const effectiveStock = qty          // extend later if reserved-stock tracking is added
    const reservedStock = 0             // placeholder for future reservation system

    const reorderLevel = Number(m.reorderQuantity) || minQ * 2
    let status = 'Healthy'
    if (qty <= minQ)                   status = 'Critical'
    else if (qty <= reorderLevel)      status = 'Low'
    else if (maxQ > 0 && qty > maxQ)   status = 'Overstock'

    return {
      ...m,
      effectiveStock,
      reservedStock,
      minLevel: minQ,
      maxLevel: maxQ,
      status,
    }
  }), [materials])

  const lowStockItems = enrichedMaterials.filter(m => !m.isArchived && (m.status === 'Critical' || m.status === 'Low'))

  return (
    <AppContext.Provider value={{
      materials: enrichedMaterials, addMaterial, updateMaterial, adjustMaterialStock, archiveMaterial, restoreMaterial, deleteMaterial,
      orders, addOrder, updateOrder, advanceOrderStage, archiveOrder, restoreOrder, deleteOrder, completeOrder,
      purchases, addPurchase, receivePurchase, archivePurchase, restorePurchase, deletePurchase,
      transactions, addTransaction,
      activityLog, lowStockItems,
      refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
