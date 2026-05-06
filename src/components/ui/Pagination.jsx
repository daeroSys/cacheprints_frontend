import './Pagination.css'

export default function Pagination({ page, totalPages, setPage, total, pageSize = 10 }) {
  if (!total || totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <div className="pagination">
      <span className="pagination__info">Showing {start}–{end} of {total} result{total !== 1 ? 's' : ''}</span>
      <div className="pagination__controls">
        <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="pagination__ellipsis">…</span>
            : <button key={p} className={`pagination__btn ${page === p ? 'pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
        )}
        <button className="pagination__btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
      </div>
    </div>
  )
}
