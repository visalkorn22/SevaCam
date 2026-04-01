import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // Base: all-caps Inter label-md, no border, radius-sm
  'inline-flex items-center justify-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.10em] uppercase w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden',
  {
    variants: {
      variant: {
        // Booking status variants — use these in booking/account flows
        pending:
          'bg-[var(--accent-subtle)] text-[var(--accent-primary)]',
        confirmed:
          'bg-[var(--state-success-subtle)] text-[var(--state-success)]',
        cancelled:
          'bg-[var(--state-error-subtle)] text-[var(--state-error)]',
        completed:
          'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        'no-show':
          'bg-[var(--bg-inset)] text-[var(--text-disabled)]',
        warning:
          'bg-[var(--state-warning-subtle)] text-[var(--state-warning)]',
        // Legacy variants — kept for shadcn compatibility during migration
        default:
          'bg-[var(--accent-primary)] text-[var(--text-on-accent)]',
        secondary:
          'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        destructive:
          'bg-[var(--state-error-subtle)] text-[var(--state-error)]',
        outline:
          'border border-[var(--border-subtle)] text-[var(--text-primary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
