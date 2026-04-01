import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none transition-[background-color,color,opacity,box-shadow] duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-(--border-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-base)",
  {
    variants: {
      variant: {
        default:
          'bg-(--accent-primary) text-(--text-on-accent) rounded-(--radius-md) hover:bg-(--accent-primary-hover) active:bg-(--accent-primary-active)',
        ghost:
          'text-(--text-primary) rounded-(--radius-md) hover:bg-(--ghost-hover-bg) hover:text-(--ghost-hover-text)',
        destructive:
          'bg-(--state-error-subtle) text-(--state-error) rounded-(--radius-md) hover:bg-[color-mix(in_srgb,var(--state-error-subtle)_80%,var(--state-error))]',
        link:
          'text-(--accent-primary) underline-offset-4 hover:underline rounded-none p-0 h-auto',
        // Legacy variants — kept for shadcn component compatibility during migration
        outline:
          'border border-(--border-subtle) bg-(--bg-surface) rounded-(--radius-md) hover:bg-(--bg-elevated) text-(--text-primary)',
        secondary:
          'bg-(--bg-elevated) text-(--text-primary) rounded-(--radius-md) hover:bg-(--bg-overlay)',
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
