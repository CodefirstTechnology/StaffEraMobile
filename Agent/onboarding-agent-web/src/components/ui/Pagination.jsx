import React from 'react'

export function Pagination({
  page = 1,
  limit = 10,
  total = 0,
  onPageChange,
  onLimitChange,
  limitOptions = [5, 10, 20, 50, 100],
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, total)

  // Generate page numbers array with ellipses if needed
  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) pages.push(i)

      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div
      className={`glass-card flex flex-wrap items-center justify-between gap-4 p-4 text-sm text-on-surface-variant ${className}`}
    >
      {/* Left side: Range summary & display count selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-on-background">
          Showing <span className="font-semibold text-primary">{startItem}</span>–
          <span className="font-semibold text-primary">{endItem}</span> of{' '}
          <span className="font-semibold text-primary">{total}</span> items
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3">
            <label htmlFor="per-page-select" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Per page:
            </label>
            <select
              id="per-page-select"
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value))
                if (onPageChange) onPageChange(1)
              }}
              className="rounded-xl border border-outline-variant/30 bg-surface/80 px-2.5 py-1 text-xs font-bold text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          className="inline-flex items-center justify-center rounded-xl border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold transition-all hover:bg-primary/5 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous Page"
        >
          ← Prev
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-on-surface-variant select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange && onPageChange(Number(p))}
                className={`min-w-[32px] rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  currentPage === p
                    ? 'bg-primary text-white shadow-md'
                    : 'border border-outline-variant/20 hover:bg-primary/5 text-on-background'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* Mobile current page indicator */}
        <span className="sm:hidden text-xs font-semibold px-2 text-primary">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          className="inline-flex items-center justify-center rounded-xl border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold transition-all hover:bg-primary/5 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next Page"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
