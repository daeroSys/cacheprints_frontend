import { formatCurrency, formatDate, formatDateTime, inRange } from './helpers'

export function generateReportHTML({ reportType, from, to, orders, materials, purchases, transactions }) {
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T23:59:59')

  const filteredOrders = orders.filter(o => inRange(o.createdAt, fromDate, toDate))
  const filteredPurchases = purchases.filter(p => inRange(p.receivedAt || p.date, fromDate, toDate))
  const filteredTxns = transactions.filter(t => inRange(t.date, fromDate, toDate))

  const rows = (data, cols) =>
    data.map(row => `<tr>${cols.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('')}</tr>`).join('')

  let bodyHTML = ''

  if (reportType === 'orders' || reportType === 'all') {
    const totalRev = filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)
    const totalColl = filteredOrders.reduce((s, o) => s + (o.paidAmount || 0), 0)
    bodyHTML += `
      <h2>Order Summary</h2>
      <p class="sum">Total Orders: <strong>${filteredOrders.length}</strong> &nbsp;|&nbsp; Revenue: <strong>${formatCurrency(totalRev)}</strong> &nbsp;|&nbsp; Collected: <strong>${formatCurrency(totalColl)}</strong></p>
      <table>
        <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Paid</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${rows(filteredOrders, [
          { key:'orderId' },
          { key:'customer', render: o => `<strong>${o.customer}</strong>${o.teamName ? `<br/><small>${o.teamName}</small>` : ''}` },
          { key:'productType', render: o => o.productType || o.design || '—' },
          { key:'rows', render: o => (o.rows || o.items || []).length },
          { key:'totalAmount', render: o => formatCurrency(o.totalAmount) },
          { key:'paidAmount',  render: o => formatCurrency(o.paidAmount) },
          { key:'payment' },
          { key:'createdAt',   render: o => formatDate(o.createdAt) },
        ])}</tbody>
      </table>`
  }

  if (reportType === 'purchases' || reportType === 'all') {
    const totalCost = filteredPurchases.reduce((s, p) => s + (p.overallCost || 0), 0)
    bodyHTML += `
      <h2>Purchase Summary</h2>
      <p class="sum">Total Purchases: <strong>${filteredPurchases.length}</strong> &nbsp;|&nbsp; Total Cost: <strong>${formatCurrency(totalCost)}</strong></p>
      <table>
        <thead><tr><th>Purchase ID</th><th>Supplier</th><th>Items</th><th>Total Cost</th><th>Date</th></tr></thead>
        <tbody>${rows(filteredPurchases, [
          { key:'purchaseId' },
          { key:'items', render: p => [...new Set((p.items || []).map(i => i.supplier))].filter(Boolean).join(', ') || '—' },
          { key:'items', render: p => {
            const names = (p.items || []).map(i => i.name).filter(Boolean)
            if (names.length === 0) return '—'
            if (names.length === 1) return names[0]
            return `{${names.join(', ')}}`
          }},
          { key:'totalCost', render: p => formatCurrency(p.overallCost) },
          { key:'date', render: p => formatDate(p.receivedAt || p.date) },
        ])}</tbody>
      </table>`

    const receipts = filteredPurchases.filter(p => p.receiptImage)
    if (receipts.length > 0) {
      bodyHTML += `
        <h2>Delivery Receipts</h2>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; margin-top:10px; margin-bottom:24px">
          ${receipts.map(r => `
            <div style="border:1px solid #ddd; border-radius:5px; padding:10px; text-align:center">
              <img src="${r.receiptImage}" style="max-width:100%; max-height:150px; display:block; margin:0 auto 8px; border-radius:3px" />
              <p style="font-size:11px; font-weight:600; margin:0">${r.purchaseId || r.id}</p>
              <p style="font-size:10px; color:#666; margin:2px 0 0">${formatDate(r.receivedAt || r.date)}</p>
            </div>
          `).join('')}
        </div>`
    }
  }

  if (reportType === 'stock' || reportType === 'all') {
    const activeMats = materials.filter(m => !m.isArchived)
    const criticalCount = activeMats.filter(m => m.status === 'Critical').length
    const lowCount = activeMats.filter(m => m.status === 'Low').length
    const overstockCount = activeMats.filter(m => m.status === 'Overstock').length
    const healthyCount = activeMats.filter(m => m.status === 'Healthy').length

    const statusBadge = (m) => {
      const colors = { Critical: '#c62828', Low: '#e65100', Overstock: '#1565c0', Healthy: '#2e7d32' }
      const labels = { Critical: 'Critical', Low: 'Low Stock', Overstock: 'Overstock', Healthy: 'Healthy' }
      const s = m.status || 'Healthy'
      return `<span style="color:${colors[s] || '#2e7d32'}; font-weight:600">${labels[s] || s}</span>`
    }

    bodyHTML += `
      <h2>Stock Summary</h2>
      <p class="sum">Total Materials: <strong>${activeMats.length}</strong> &nbsp;|&nbsp; Healthy: <strong>${healthyCount}</strong> &nbsp;|&nbsp; Low Stock: <strong style="color:#e65100">${lowCount}</strong> &nbsp;|&nbsp; Critical: <strong style="color:#c62828">${criticalCount}</strong> &nbsp;|&nbsp; Overstock: <strong style="color:#1565c0">${overstockCount}</strong></p>
      <table>
        <thead><tr><th>Material</th><th>Category</th><th>Qty</th><th>Min</th><th>Max</th><th>Status</th></tr></thead>
        <tbody>${rows(activeMats, [
          { key:'name' },
          { key:'category' },
          { key:'quantity', render: m => `${m.quantity} ${m.unit}` },
          { key:'minQty' },
          { key:'maxQty' },
          { key:'status', render: m => statusBadge(m) },
        ])}</tbody>
      </table>`
  }

  if (reportType === 'transactions' || reportType === 'all') {
    bodyHTML += `
      <h2>Inventory Transactions</h2>
      <p class="sum">Total Transactions: <strong>${filteredTxns.length}</strong></p>
      <table>
        <thead><tr><th>Transaction ID</th><th>Type</th><th>Material</th><th>Qty</th><th>Date</th><th>Reference</th></tr></thead>
        <tbody>${rows(filteredTxns, [
          { key:'transactionId' },
          { key:'type' },
          { key:'materialName', render: t => (t.items || []).map(it => it.materialName).join(', ') || t.materialName || '—' },
          { key:'qty', render: t => (t.items || []).map(it => `${it.qty > 0 ? '+' : ''}${it.qty} ${it.unit}`).join(', ') || t.qty || '—' },
          { key:'date', render: t => formatDate(t.date) },
          { key:'ref', render: t => t.ref || '—' },
        ])}</tbody>
      </table>`
  }

  const reportLabel = { orders:'Order Summary', purchases:'Purchase Summary', stock:'Stock Report', transactions:'Transaction Log', all:'Full Report' }[reportType] || 'Report'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>CachePrint's IMS — ${reportLabel}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #111; font-size: 13px; }
      .header { border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 24px; display:flex; justify-content:space-between; align-items:flex-end; }
      .header h1 { font-size: 22px; letter-spacing: -0.03em; }
      .header h1 em { font-style:italic; font-family:Georgia,serif; }
      .header-right { text-align:right; font-size:12px; color:#555; }
      h2 { font-size:15px; font-weight:600; margin: 22px 0 8px; border-left:3px solid #111; padding-left:10px; }
      .sum { font-size:12px; color:#444; margin-bottom:12px; }
      table { width:100%; border-collapse:collapse; margin-bottom:24px; }
      th { background:#f0f0f0; padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #ddd; }
      td { padding:8px 12px; border-bottom:1px solid #eee; font-size:12.5px; }
      tr:nth-child(even) td { background:#fafafa; }
      .footer { margin-top:32px; padding-top:12px; border-top:1px solid #ddd; font-size:11px; color:#888; display:flex; justify-content:space-between; }
      @media print { body { padding:20px; } @page { margin:1cm; } }
    </style>
  </head><body>
    <div class="header">
      <div><h1>Cache<em>Print's</em> IMS</h1><p style="font-size:12px;color:#555;margin-top:4px">${reportLabel}</p></div>
      <div class="header-right">
        <p>Period: ${formatDate(from)} – ${formatDate(to)}</p>
        <p>Generated: ${formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
    ${bodyHTML || '<p style="color:#888;text-align:center;padding:40px">No data for selected period.</p>'}
    <div class="footer">
      <span>CachePrint's Inventory Management System</span>
      <span>Confidential — Internal Use Only</span>
    </div>
    <script>window.onload = () => window.print()</script>
  </body></html>`
}
