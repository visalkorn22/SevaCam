import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  // Date/time-like controls: container-style (full border, rounded)
  const isContainer = ['date', 'time', 'month', 'week', 'datetime-local'].includes(type ?? '')

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Shared base
        'w-full min-w-0 bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-disabled)] outline-none transition-[background-color,border-color,box-shadow] duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        // Container-style controls (date, time, etc.)
        isContainer
          ? 'h-9 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1 focus-visible:border-[var(--border-focus)] focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)]'
          : // Text-style: underline only
            'h-9 border-b border-[var(--border-subtle)] bg-transparent px-1 py-1 focus-visible:border-b-[var(--border-focus)] focus-visible:bg-[var(--bg-elevated)] focus-visible:rounded-t-[var(--radius-sm)] focus-visible:px-2',
        // Error state
        'aria-invalid:border-[var(--state-error)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
