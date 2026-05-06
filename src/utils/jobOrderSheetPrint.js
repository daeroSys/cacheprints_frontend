import { formatCurrency, formatDate, formatDateTime } from './helpers'

/**
 * Generates a printable Job Order Sheet and opens the browser print dialog.
 * Matches the purchase-order / report print pattern used elsewhere in the IMS.
 */
export function printJobOrderSheet(order) {
  const teamName    = order.teamName || order.customer || 'Team Name'
  const apparelType = order.productType || '—'
  const fabricName  = order.fabricName || ''
  const deadline    = order.deadline ? formatDate(order.deadline) : 'TBD'
  const orderId     = order.orderId || order.id
  const rows        = order.rows || []
  const totalAmount = order.totalAmount || 0

  const largeSizes = new Set(['XXL', '3XL', '4XL', '5XL', 'XXXL', 'XXXXL'])

  const playerRowsHTML = rows.length > 0
    ? rows.map((row, i) => {
        const size = row.upperSize || '—'
        const isLarge = largeSizes.has(size.toUpperCase())
        const addOn = row.addOn || '—'
        return `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
            <td style="border:1px solid #ddd; padding:8px 12px; font-weight:600; color:#222">${row.name || '—'}</td>
            <td style="border:1px solid #ddd; padding:8px 12px; text-align:center; color:#444">${row.no || '—'}</td>
            <td style="border:1px solid #ddd; padding:8px 12px; text-align:center">
              <span style="display:inline-block; ${isLarge ? 'background:#FF69B4; color:#fff; font-weight:700; padding:2px 10px; border-radius:4px;' : 'color:#333; font-weight:500;'} font-size:12px; font-family:'Barlow Condensed',sans-serif;">${size}</span>
            </td>
            <td style="border:1px solid #ddd; padding:8px 12px; text-align:center; font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase">${addOn}</td>
            <td style="border:1px solid #ddd; padding:8px 12px; text-align:center; font-size:12px; color:#555; text-transform:uppercase">${row.upperType || '—'}</td>
          </tr>`
      }).join('')
    : `<tr><td colspan="5" style="border:1px solid #ddd; padding:20px; text-align:center; color:#bbb; font-size:12px">No lineup provided</td></tr>`

  const oversizedNote = rows.some(r => largeSizes.has((r.upperSize || '').toUpperCase()))
    ? `<span style="font-size:11px; color:#e91e9c; font-weight:600; display:inline-flex; align-items:center; gap:4px; margin-left:16px">
         <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#FF69B4"></span>
         Oversized sizes present
       </span>`
    : ''

  // Find final design in designFiles
  const finalDesign = (order.designFiles || []).find(f => f.name && (f.name.toLowerCase().includes('final design') || f.name.toLowerCase().includes('approved')))
  const designUrl = order.designFileUrl || finalDesign?.url || ''
  const designImageHTML = designUrl
    ? `<div style="margin-top:32px; display:flex; flex-direction:column; align-items:center; width:100%; padding-left:16px">
         <span style="font-size:10px; font-weight:800; color:#222; text-transform:uppercase; letter-spacing:0.15em; display:block; margin-bottom:10px; border-bottom:2px solid #f0f0f0; padding-bottom:4px; text-align:center; width:100%; max-width:400px">
           Final Approved Design Mockup
         </span>
         <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:10px; padding:12px; display:flex; justify-content:center; align-items:center; width:100%; max-width:600px">
           <img src="${designUrl}" alt="Final Design" style="max-width:100%; max-height:480px; object-fit:contain; display:block" />
         </div>
       </div>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Job Order Sheet — ${teamName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Barlow', sans-serif; padding: 32px; color: #111; font-size: 13px; max-width: 680px; margin: 0 auto; }

      .sheet-header { text-align:center; margin-bottom:24px; }
      .sheet-team { font-family:'Barlow Condensed',sans-serif; font-size:32px; font-weight:900; color:#CC1111; letter-spacing:2px; text-transform:uppercase; margin:0; }
      .sheet-pill { display:inline-block; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:3px 10px; border-radius:4px; margin:4px 4px 0; }
      .sheet-pill--type { background:#f4f4f4; border:1px solid #ddd; color:#444; }
      .sheet-pill--fabric { background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; }
      .sheet-meta { margin-top:6px; font-size:11px; color:#aaa; }

      .sheet-deadline { position:absolute; left:-28px; top:60px; transform:rotate(-90deg); transform-origin:left center; font-size:11px; font-weight:600; color:#888; white-space:nowrap; letter-spacing:0.04em; }

      table { width:100%; border-collapse:collapse; font-size:13px; margin-top:20px; }
      thead tr { background:#f4f4f4; }
      thead th { border:1px solid #ccc; padding:7px 12px; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px; letter-spacing:1px; text-align:center; color:#333; }

      .sheet-count { margin-top:8px; font-size:11px; color:#888; }
      .sheet-notes { margin-top:16px; padding-left:16px; }
      .sheet-notes-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:0.06em; }
      .sheet-notes-text { margin-top:4px; font-size:12px; color:#444; font-style:italic; border-left:3px solid #eee; padding-left:10px; }

      .sheet-footer { margin-top:32px; padding-left:16px; display:flex; align-items:center; gap:12px; }
      .sheet-total { font-size:11px; color:#aaa; margin-left:auto; }
      .sheet-total strong { color:#111; }

      .sheet-signoff { margin-top:32px; padding-left:16px; border-top:1px solid #e5e7eb; padding-top:20px; display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
      .sheet-sig-role { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:#222; text-transform:uppercase; letter-spacing:0.04em; }
      .sheet-sig-line { font-size:11px; color:#888; margin-top:20px; border-top:0.5px solid #bbb; padding-top:3px; }

      .po-footer { margin-top:40px; padding-top:12px; border-top:1px solid #ddd; font-size:11px; color:#999; display:flex; justify-content:space-between; }

      @media print {
        body { padding:20px; }
        @page { margin:1.5cm; }
      }
    </style>
  </head><body>
    <div style="position:relative">
      <div class="sheet-deadline">DEADLINE: ${deadline.toUpperCase()} (12PM)</div>

      <div class="sheet-header">
        <h1 class="sheet-team">${teamName}</h1>
        <div>
          <span class="sheet-pill sheet-pill--type">${apparelType}</span>
          ${fabricName ? `<span style="color:#ccc; font-size:14px">·</span><span class="sheet-pill sheet-pill--fabric">🧵 ${fabricName}</span>` : ''}
        </div>
        <p class="sheet-meta">
          ${order.customer !== teamName ? `${order.customer} · ` : ''}
          <span style="font-family:monospace">${orderId}</span>
        </p>
      </div>

      <div style="padding-left:16px">
        <table>
          <thead>
            <tr>
              <th style="text-align:left">NAME</th>
              <th>#</th>
              <th>SIZE</th>
              <th>ADD-ON</th>
              <th>TYPE</th>
            </tr>
          </thead>
          <tbody>
            ${playerRowsHTML}
          </tbody>
        </table>

        <div class="sheet-count">
          ${rows.length} player${rows.length !== 1 ? 's' : ''} total
          ${oversizedNote}
        </div>
      </div>

      ${order.notes ? `
        <div class="sheet-notes">
          <span class="sheet-notes-label">Layout Notes:</span>
          <p class="sheet-notes-text">${order.notes}</p>
        </div>
      ` : ''}

      ${designImageHTML}

      <div class="sheet-footer">
        <span class="sheet-total">Total: <strong>${formatCurrency(totalAmount)}</strong></span>
      </div>

      <div class="sheet-signoff">
        ${['Graphic Artist', 'Printer', 'Fabric Cutter', 'Heat Press', 'Sewer'].map(role => `
          <div>
            <span class="sheet-sig-role">${role}:</span>
            <div class="sheet-sig-line">Checked by:</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="po-footer">
      <span>CachePrint's Inventory Management System</span>
      <span>Generated: ${formatDateTime(new Date().toISOString())}</span>
    </div>

    <script>window.onload = () => window.print()</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
