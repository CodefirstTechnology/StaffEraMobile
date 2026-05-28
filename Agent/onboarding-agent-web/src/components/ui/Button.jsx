export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    variant === 'gradient'
      ? 'btn-gradient'
      : variant === 'danger'
        ? 'bg-error text-white rounded-xl px-4 py-2 font-medium hover:opacity-90'
        : 'rounded-xl border border-outline-variant bg-white px-4 py-2 font-medium text-primary hover:bg-surface-low'
  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  )
}
