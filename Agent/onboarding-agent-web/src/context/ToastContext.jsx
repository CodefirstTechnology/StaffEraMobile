import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev.slice(-4), { id, message, type }])
    return id
  }, [])

  const api = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 3500)
    return () => window.clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isError = toast.type === 'error'

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${
        isError
          ? 'border border-error/20 bg-white text-error'
          : 'border border-emerald-200 bg-white text-emerald-800'
      }`}
    >
      <span className="mt-0.5 text-base" aria-hidden>
        {isError ? '⚠' : '✓'}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug text-on-background">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-xs font-semibold text-on-surface-variant hover:text-primary"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
