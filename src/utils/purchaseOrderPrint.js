import { formatCurrency, formatDate, formatDateTime } from './helpers'

/**
 * Generates a printable Purchase Order HTML document and opens it in a new tab.
 * Matches the existing report styling from reportGenerator.js.
 */
export function printPurchaseOrder(purchase, preparedByName) {
  const poId = purchase.purchaseId || purchase.id
  const suppliers = [...new Set((purchase.items || []).map(i => i.supplier).filter(Boolean))]
  const itemsHTML = (purchase.items || []).map((item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${item.name || '—'}</td>
      <td>${item.supplier || '—'}</td>
      <td>${item.unit || '—'}</td>
      <td style="text-align:right">${item.qtyOrdered ?? 0}</td>
      <td style="text-align:right">${formatCurrency(item.totalCost || 0)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Purchase Order — ${poId}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #111; font-size: 13px; }

      /* Header */
      .po-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:3px solid #111; margin-bottom:28px; }
      .po-header h1 { font-size: 24px; letter-spacing: -0.03em; margin-bottom:2px; }
      .po-header h1 em { font-style:italic; font-family:Georgia,serif; }
      .po-header .po-label { display:inline-block; background:#111; color:#fff; font-size:13px; font-weight:700; padding:4px 14px; border-radius:4px; letter-spacing:0.06em; text-transform:uppercase; margin-top:6px; }
      .po-header-right { text-align:right; }
      .po-header-right .po-id { font-size:20px; font-weight:700; font-family:monospace; letter-spacing:0.04em; color:#111; }
      .po-header-right p { font-size:12px; color:#555; margin-top:3px; }

      /* Info grid */
      .po-info { display:flex; gap:40px; margin-bottom:24px; }
      .po-info-block { flex:1; }
      .po-info-block h3 { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:6px; font-weight:600; }
      .po-info-block p { font-size:13px; color:#222; line-height:1.7; }
      .po-info-block strong { font-weight:600; }

      /* Items table */
      .po-section-title { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#888; font-weight:600; margin-bottom:8px; border-left:3px solid #111; padding-left:10px; }
      table { width:100%; border-collapse:collapse; margin-bottom:20px; }
      thead th { background:#f5f5f5; padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; border-bottom:2px solid #ddd; font-weight:600; color:#444; }
      tbody td { padding:10px 14px; border-bottom:1px solid #eee; font-size:12.5px; }
      tbody tr:nth-child(even) td { background:#fafafa; }
      tbody tr:hover td { background:#f0f4ff; }

      /* Totals */
      .po-totals { display:flex; justify-content:flex-end; margin-bottom:28px; }
      .po-totals-box { background:#f5f5f5; border:1px solid #e0e0e0; border-radius:8px; padding:16px 28px; min-width:260px; }
      .po-totals-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; font-size:13px; }
      .po-totals-row.total { border-top:2px solid #111; margin-top:8px; padding-top:10px; font-size:16px; font-weight:700; }

      /* Notes */
      .po-notes { background:#f9f9f9; border:1px solid #eee; border-radius:8px; padding:14px 18px; margin-bottom:28px; }
      .po-notes h4 { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:6px; }
      .po-notes p { font-size:12.5px; color:#333; line-height:1.6; }

      /* Signature area */
      .po-signatures { display:flex; gap:60px; margin-top:48px; padding-top:20px; }
      .po-sig-block { flex:1; }
      .po-sig-line { border-top:1px solid #999; margin-top:48px; padding-top:8px; }
      .po-sig-block p { font-size:12px; color:#555; }
      .po-sig-block .sig-label { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:#888; margin-top:2px; }

      /* Footer */
      .po-footer { margin-top:40px; padding-top:12px; border-top:1px solid #ddd; font-size:11px; color:#999; display:flex; justify-content:space-between; }

      @media print {
        body { padding:20px; }
        @page { margin:1.5cm; }
        tbody tr:hover td { background:transparent; }
      }
    </style>
  </head><body>

    <!-- Header -->
    <div class="po-header">
      <div>
        <h1>Cache<em>Print's</em></h1>
        <div class="po-label">Purchase Order</div>
      </div>
      <div class="po-header-right">
        <div class="po-id">${poId}</div>
        <p>Date: ${formatDate(purchase.date)}</p>
        <p>Generated: ${formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>

    <!-- Info blocks -->
    <div class="po-info">
      <div class="po-info-block">
        <h3>Supplier${suppliers.length > 1 ? 's' : ''}</h3>
        ${suppliers.map(s => `<p><strong>${s}</strong></p>`).join('')}
      </div>
      <div class="po-info-block">
        <h3>Order Details</h3>
        <p>Total Items: <strong>${(purchase.items || []).length}</strong></p>
        <p>Status: <strong>${purchase.isReceived ? 'Received' : 'Pending'}</strong></p>
        ${purchase.isReceived && purchase.receivedAt ? `<p>Received On: <strong>${formatDate(purchase.receivedAt)}</strong></p>` : ''}
      </div>
    </div>

    <!-- Items table -->
    <p class="po-section-title">Order Items</p>
    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center">#</th>
          <th>Material</th>
          <th>Supplier</th>
          <th>Unit</th>
          <th style="text-align:right">Qty Ordered</th>
          <th style="text-align:right">Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="po-totals">
      <div class="po-totals-box">
        <div class="po-totals-row">
          <span>Subtotal (${(purchase.items || []).length} item${(purchase.items || []).length !== 1 ? 's' : ''})</span>
          <span>${formatCurrency(purchase.overallCost || 0)}</span>
        </div>
        <div class="po-totals-row total">
          <span>Total</span>
          <span>${formatCurrency(purchase.overallCost || 0)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    ${purchase.notes ? `
      <div class="po-notes">
        <h4>Notes</h4>
        <p>${purchase.notes}</p>
      </div>
    ` : ''}

    <!-- Signatures -->
    <div class="po-signatures">
      <div class="po-sig-block">
        <div class="po-sig-line">
          <p>Prepared By</p>
          <p class="sig-label">${preparedByName || purchase.createdBy || 'Staff'}</p>
        </div>
      </div>
      <div class="po-sig-block">
        <div class="po-sig-line">
          <p>Approved By</p>
          <p class="sig-label">Management</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="po-footer">
      <span>CachePrint's Inventory Management System</span>
      <span>Confidential — Internal Use Only</span>
    </div>

    <script>window.onload = () => window.print()</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
