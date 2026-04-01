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
        'w-full min-w-0 bg-(--bg-surface) text-(--text-primary) text-sm placeholder:text-(--text-disabled) outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-in-out disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        // Container-style controls (date, time, etc.)
        isContainer
          ? 'h-9 rounded-(--radius-md) border border-(--border-subtle) px-3 py-1 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)]'
          : // Text-style: underline only
            'h-9 border-b border-(--border-subtle) bg-transparent px-1 py-1 focus-visible:border-b-(--border-focus) focus-visible:bg-(--bg-elevated) focus-visible:rounded-t-sm focus-visible:px-2',
        // Error state
        'aria-invalid:border-(--state-error)',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
