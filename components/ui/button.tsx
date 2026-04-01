import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none transition-[background-color,color,opacity,box-shadow] duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]",
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] active:bg-[var(--accent-primary-active)]',
        ghost:
          'text-[var(--text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--ghost-hover-bg)] hover:text-[var(--ghost-hover-text)]',
        destructive:
          'bg-[var(--state-error-subtle)] text-[var(--state-error)] rounded-[var(--radius-md)] hover:bg-[color-mix(in_srgb,var(--state-error-subtle)_80%,var(--state-error))]',
        link:
          'text-[var(--accent-primary)] underline-offset-4 hover:underline rounded-none p-0 h-auto',
        // Legacy variants — kept for shadcn component compatibility during migration
        outline:
          'border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]',
        secondary:
          'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-overlay)]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm:      'h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg:      'h-10 px-6 has-[>svg]:px-4',
        icon:    'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
