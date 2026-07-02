import { Button } from './ui/Button'

export function ConfirmDialog({
  open,
  title,
  description,
  error,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="confirm-dialog-title" className="text-lg font-semibold text-primary">
          {title}
        </h4>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{description}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
        <div className="mt-6 flex gap-2">
          <Button
            variant={variant}
            className="flex-1"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
          <Button variant="secondary" className="flex-1" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
