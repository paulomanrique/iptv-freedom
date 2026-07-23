import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Completion from 0 to 100. */
  value?: number
  indicatorClassName?: string
}

export function Progress({ value = 0, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-[width]', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
