import { useEffect } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
  /** Additional classes for the centered content panel. */
  className?: string
}

/**
 * Lightweight modal dialog: overlay + centered panel, rendered in a portal.
 * Closes on overlay click and Escape.
 */
export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange?.(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-md rounded-lg border border-border bg-popover text-popover-foreground shadow-xl',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

type DivProps = HTMLAttributes<HTMLDivElement>

export function DialogHeader({ className, ...props }: DivProps) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />
}

export function DialogTitle({ className, ...props }: DivProps) {
  return <h2 className={cn('text-base font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }: DivProps) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogBody({ className, ...props }: DivProps) {
  return <div className={cn('p-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: DivProps) {
  return <div className={cn('flex items-center justify-end gap-2 p-5 pt-0', className)} {...props} />
}
