import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // Base: all-caps Inter label-md, no border, radius-sm
  'inline-flex items-center justify-center rounded-(--radius-sm) px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.10em] uppercase w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden',
  {
    variants: {
      variant: {
        // Booking status variants — use these in booking/account flows
        pending:
          'bg-(--accent-subtle) text-(--accent-primary)',
        confirmed:
          'bg-(--state-success-subtle) text-(--state-success)',
        cancelled:
          'bg-(--state-error-subtle) text-(--state-error)',
        completed:
          'bg-(--bg-elevated) text-(--text-secondary)',
        'no-show':
          'bg-(--bg-inset) text-(--text-disabled)',
        warning:
          'bg-(--state-warning-subtle) text-(--state-warning)',
        // Legacy variants — kept for shadcn compatibility during migration
        default:
          'bg-(--accent-primary) text-(--text-on-accent)',
        secondary:
          'bg-(--bg-elevated) text-(--text-secondary)',
        destructive:
          'bg-(--state-error-subtle) text-(--state-error)',
        outline:
          'border border-(--border-subtle) text-(--text-primary)',
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
