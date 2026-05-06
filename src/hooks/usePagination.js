import { useState, useMemo } from 'react'

export function usePagination(data, pageSize = 10) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return (data || []).slice(start, start + pageSize)
  }, [data, safePage, pageSize])

  const resetPage = () => setPage(1)

  return { page: safePage, setPage, totalPages, paginated, total: data?.length || 0, resetPage }
}
