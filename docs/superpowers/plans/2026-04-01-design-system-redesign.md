# Design System Redesign — "The Digital Maître D'" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic SaaS light/dark theme with a nocturnal, editorial "Digital Maître D'" design system across all product pages (auth, booking, customer account, admin dashboard), leaving the landing page for Phase 2.

**Architecture:** Token-layer-first approach — raw palette → semantic tokens → shadcn bridge → Tailwind bridge — before any component or page is touched. Shared primitives are aligned to new tokens before page-level redesigns begin. Pages are redesigned in dependency order: auth (simplest form surface) → booking flow → customer account → admin dashboard.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4, shadcn/ui (Radix primitives), CVA, `next/font/google` (Inter + Noto Serif), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-01-design-system-redesign.md`

---

## File Map

### Phase 1A — Token System & Primitive Alignment
| File | Action |
|---|---|
| `styles/globals.css` | Full replacement — two-layer token system + bridges |
| `app/layout.tsx` | Add Inter + Noto Serif via next/font, apply CSS variables |
| `components/ui/button.tsx` | Align variants to new tokens, add destructive variant |
| `components/ui/badge.tsx` | Align variants to new status tokens, remove border, update radius |
| `components/ui/input.tsx` | Underline treatment for text, container treatment for others |
| `components/ui/card.tsx` | Remove hardcoded border, use surface tokens |
| `components/ui/tabs.tsx` | Tonal active state, bg-inset list, no underline indicator |
| `components/ui/sheet.tsx` | bg-overlay, shadow-lg, no border |
| `components/ui/dialog.tsx` | bg-overlay, shadow-lg, radius-xl, bg-dim backdrop |
| `components/ui/table.tsx` | bg-inset container, border-muted separators, compact density |

### Phase 1B — Auth Pages
| File | Action |
|---|---|
| `app/auth/auth-client.tsx` | Full redesign — remove Space_Grotesk, apply nocturnal system |
| `app/auth/error/page.tsx` | Redesign — nocturnal card, state-error tokens |
| `app/auth/layout.tsx` | Centered layout on bg-base |
| `app/auth/signup/page.tsx` | Align to locked auth patterns |
| `app/auth/reset-password/page.tsx` | Align to locked auth patterns |
| `app/auth/update-password/UpdatePasswordClient.tsx` | Align to locked auth patterns |
| `app/auth/magic-link/page.tsx` | Align to locked auth patterns |
| `app/auth/signup-success/page.tsx` | Align to locked auth patterns |
| `app/auth/verify-email/page.tsx` | Align to locked auth patterns |

### Phase 1C — Booking Flow
| File | Action |
|---|---|
| `app/book/[serviceId]/page.tsx` | Redesign booking form — slot grid, date picker, step indicator |
| `app/payment/[bookingId]/page.tsx` | Redesign payment page — summary panel, payment form |
| `components/payment/payment-form.tsx` | Payment field container treatment |
| `components/payment/payment-return-status.tsx` | Success/error state tokens |
| `components/booking/booking-form.tsx` | Redesign — time slots, inputs, service card |

### Phase 1D — Customer Account
| File | Action |
|---|---|
| `app/bookings/page.tsx` | Page header with Noto Serif display-lg |
| `components/booking/customer-bookings-client.tsx` | Tabs, sheets, cancel dialog |
| `components/booking/BookingCard.tsx` | Card redesign — comfortable tier, no dividers |

### Phase 1E — Admin & Staff Dashboard
| File | Action |
|---|---|
| `components/dashboard/dashboard-layout.tsx` | Sidebar redesign — bg-surface, Inter title-md nav |
| `components/dashboard/stat-card.tsx` | Comfortable tier stat cards |
| `app/admin/dashboard/page.tsx` | Admin dashboard layout with redesigned components |
| `app/admin/bookings/page.tsx` | Compact tier table |
| `app/admin/staff/page.tsx` | Compact tier table |
| `app/admin/services/page.tsx` | Compact tier table |
| `app/staff/dashboard/page.tsx` | Staff dashboard — comfortable tier |
| `app/staff/schedule/page.tsx` | Compact tier schedule |
| `app/staff/requests/page.tsx` | Compact tier table |

---

## Phase 1A — Token System & Primitive Alignment

### Task 1: Replace globals.css — Raw Palette + Semantic Token Layer

**Files:**
- Modify: `styles/globals.css`

- [ ] **Step 1: Replace globals.css completely**

```css
@import 'tailwindcss';
@import 'tw-animate-css';

/* ═══════════════════════════════════════════════════════════════════════════
   LAYER 1 — RAW PALETTE (private — never consumed directly by components)
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
  /* Charcoal scale */
  --_color-charcoal-base:   #131313;
  --_color-charcoal-low:    #1c1b1b;
  --_color-charcoal-mid:    #252524;
  --_color-charcoal-high:   #353534;
  --_color-charcoal-dim:    #0e0e0e;
  --_color-charcoal-inset:  #101010;

  /* Teal accent */
  --_color-teal-primary:    #7ad5dd;
  --_color-teal-on:         #00363a;
  --_color-teal-subtle:     #1a3e41;

  /* Warm accent */
  --_color-amber:           #ffb785;

  /* Text scale */
  --_color-white:           #f0eeeb;
  --_color-white-muted:     #a8a49e;
  --_color-white-faint:     #6b6762;

  /* State colors */
  --_color-error:           #e57373;
  --_color-error-subtle:    #2a1515;
  --_color-success:         #7fd1a5;
  --_color-success-subtle:  #15241c;
  --_color-warning-subtle:  #2b1d14;

  /* ═════════════════════════════════════════════════════════════════════════
     LAYER 2 — SEMANTIC TOKENS (public — what all components consume)
     ═════════════════════════════════════════════════════════════════════════ */

  /* ─── Surfaces ────────────────────────────────────────────────────────────
     --bg-base      = app/page background (Layer 0)
     --bg-surface   = default cards, panels, sections (Layer 1)
     --bg-elevated  = emphasized or active grouped content (Layer 2)
     --bg-overlay   = modals, sheets, dropdowns (Layer 3)
     --bg-inset     = nested containers, table bodies, inset areas
     --bg-dim       = scrims, backdrops, de-emphasis zones
     --bg-hover     = transient row/item hover wash — NOT a structural layer
  */
  --bg-base:                var(--_color-charcoal-base);
  --bg-surface:             var(--_color-charcoal-low);
  --bg-elevated:            var(--_color-charcoal-mid);
  --bg-overlay:             var(--_color-charcoal-high);
  --bg-inset:               var(--_color-charcoal-inset);
  --bg-dim:                 var(--_color-charcoal-dim);
  --bg-hover:               rgba(240, 238, 235, 0.04);

  /* ─── Text ──────────────────────────────────────────────────────────────── */
  --text-primary:           var(--_color-white);
  --text-secondary:         var(--_color-white-muted);
  --text-disabled:          var(--_color-white-faint);
  --text-on-accent:         var(--_color-teal-on);
  --text-on-dark:           var(--_color-white);

  /* ─── Accent ────────────────────────────────────────────────────────────── */
  --accent-primary:         var(--_color-teal-primary);
  --accent-on:              var(--_color-teal-on);
  --accent-subtle:          var(--_color-teal-subtle);
  --accent-warm:            var(--_color-amber);

  /* Button state tokens (explicit — not prose rules) */
  --accent-primary-hover:   color-mix(in srgb, var(--_color-teal-primary) 92%, white);
  --accent-primary-active:  color-mix(in srgb, var(--_color-teal-primary) 84%, black);
  --ghost-hover-bg:         rgba(122, 213, 221, 0.06);
  --ghost-hover-text:       var(--_color-teal-primary);

  /* ─── Borders ─────────────────────────────────────────────────────────────
     --border-muted       = table row separators, low-emphasis dividers (faintest)
     --border-subtle      = card outlines, container boundaries (default)
     --border-interactive = hover/selected state on cards, slots
     --border-focus       = keyboard focus ring — must be unmistakable
  */
  --border-muted:           rgba(240, 238, 235, 0.05);
  --border-subtle:          rgba(240, 238, 235, 0.08);
  --border-interactive:     rgba(122, 213, 221, 0.25);
  --border-focus:           rgba(122, 213, 221, 0.40);

  /* ─── State / Status ────────────────────────────────────────────────────── */
  --state-error:            var(--_color-error);
  --state-error-subtle:     var(--_color-error-subtle);
  --state-success:          var(--_color-success);
  --state-success-subtle:   var(--_color-success-subtle);
  --state-warning:          var(--_color-amber);
  --state-warning-subtle:   var(--_color-warning-subtle);

  /* ─── Spacing Tiers ───────────────────────────────────────────────────────
     comfortable = customer-facing flows (booking, account, auth, confirmation)
     compact     = admin operational surfaces (tables, schedules, filter bars)
  */
  --spacing-comfortable-x:  1.25rem;
  --spacing-comfortable-y:  1.5rem;
  --spacing-compact-x:      0.75rem;
  --spacing-compact-y:      0.75rem;

  --space-comfortable-1:    0.75rem;
  --space-comfortable-2:    1rem;
  --space-comfortable-3:    1.5rem;

  --space-compact-1:        0.5rem;
  --space-compact-2:        0.75rem;
  --space-compact-3:        1rem;

  /* ─── Radius ─────────────────────────────────────────────────────────────── */
  --radius-sm:              0.5rem;
  --radius-md:              0.75rem;
  --radius-lg:              1rem;
  --radius-xl:              1.5rem;

  /* ─── Elevation ──────────────────────────────────────────────────────────── */
  --shadow-sm:              0 1px 2px rgba(0, 0, 0, 0.24);
  --shadow-md:              0 8px 24px rgba(0, 0, 0, 0.28);
  --shadow-lg:              0 16px 48px rgba(0, 0, 0, 0.36);

  /* ─── Blur (glassmorphism) ───────────────────────────────────────────────── */
  --blur-sm:                8px;
  --blur-md:                16px;

  /* ─── Motion ─────────────────────────────────────────────────────────────── */
  --ease-standard:          cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:          150ms;
  --duration-base:          250ms;

  /* ─── Shadcn bridge (legacy compatibility — do not delete until all components migrated) ─── */
  --background:             var(--bg-base);
  --foreground:             var(--text-primary);
  --card:                   var(--bg-surface);
  --card-foreground:        var(--text-primary);
  --popover:                var(--bg-overlay);
  --popover-foreground:     var(--text-primary);
  --primary:                var(--accent-primary);
  --primary-foreground:     var(--text-on-accent);
  --secondary:              var(--bg-elevated);
  --secondary-foreground:   var(--text-primary);
  --muted:                  var(--bg-inset);
  --muted-foreground:       var(--text-secondary);
  --accent:                 var(--accent-subtle);
  --accent-foreground:      var(--accent-primary);
  --destructive:            var(--state-error);
  --destructive-foreground: var(--text-on-dark);
  --border:                 var(--border-subtle);
  --input:                  var(--border-subtle);
  --ring:                   var(--border-focus);
  --radius:                 var(--radius-md);
  --sidebar:                var(--bg-surface);
  --sidebar-foreground:     var(--text-primary);
  --sidebar-primary:        var(--accent-primary);
  --sidebar-primary-foreground: var(--text-on-accent);
  --sidebar-accent:         var(--bg-elevated);
  --sidebar-accent-foreground: var(--text-primary);
  --sidebar-border:         var(--border-subtle);
  --sidebar-ring:           var(--border-focus);
}

/* ─── Tailwind Bridge ─────────────────────────────────────────────────────── */
@theme inline {
  --font-sans:                var(--font-inter);
  --font-display:             var(--font-serif);
  --font-mono:                'Geist Mono', 'Geist Mono Fallback';

  --color-background:         var(--bg-base);
  --color-foreground:         var(--text-primary);
  --color-surface:            var(--bg-surface);
  --color-elevated:           var(--bg-elevated);
  --color-overlay:            var(--bg-overlay);
  --color-inset:              var(--bg-inset);
  --color-dim:                var(--bg-dim);

  --color-card:               var(--bg-surface);
  --color-card-foreground:    var(--text-primary);
  --color-popover:            var(--bg-overlay);
  --color-popover-foreground: var(--text-primary);

  --color-primary:            var(--accent-primary);
  --color-primary-foreground: var(--text-on-accent);
  --color-secondary:          var(--bg-elevated);
  --color-secondary-foreground: var(--text-primary);
  --color-muted:              var(--bg-inset);
  --color-muted-foreground:   var(--text-secondary);
  --color-accent:             var(--accent-subtle);
  --color-accent-foreground:  var(--accent-primary);
  --color-destructive:        var(--state-error);
  --color-destructive-foreground: var(--text-on-dark);

  --color-border:             var(--border-subtle);
  --color-border-muted:       var(--border-muted);
  --color-border-focus:       var(--border-focus);
  --color-border-interactive: var(--border-interactive);
  --color-input:              var(--border-subtle);
  --color-ring:               var(--border-focus);

  --color-sidebar:            var(--bg-surface);
  --color-sidebar-foreground: var(--text-primary);
  --color-sidebar-primary:    var(--accent-primary);
  --color-sidebar-primary-foreground: var(--text-on-accent);
  --color-sidebar-accent:     var(--bg-elevated);
  --color-sidebar-accent-foreground: var(--text-primary);
  --color-sidebar-border:     var(--border-subtle);
  --color-sidebar-ring:       var(--border-focus);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
}

/* ─── Base ────────────────────────────────────────────────────────────────── */
@layer base {
  * {
    @apply outline-ring/50;
    /* No border-border default — the no-border doctrine is enforced here */
  }

  body {
    font-family: var(--font-body, var(--font-inter));
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-primary);
    background: var(--bg-base);
    -webkit-font-smoothing: antialiased;
  }

  /* Reduced motion — all transitions respect this */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 2: Run build to verify tokens resolve**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | tail -20
```

Expected: Build completes. May see warnings about missing font variables (`--font-inter`, `--font-serif`) — that is expected until Task 2.

- [ ] **Step 3: Commit**

```bash
git add styles/globals.css
git commit -m "feat(design): replace CSS token system with nocturnal two-layer semantic tokens"
```

---

### Task 2: Update app/layout.tsx — Load Inter + Noto Serif

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace font loading and apply CSS variables**

```tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aicser Booking - Appointment Booking System",
  description:
    "Modern appointment booking platform for service-based businesses",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/logo.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo.png", media: "(prefers-color-scheme: dark)" },
      { url: "/logo.png", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}>
      <body
        style={
          {
            "--font-body": "var(--font-inter)",
            "--font-display": "var(--font-serif)",
          } as React.CSSProperties
        }
        className="antialiased"
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run build — fonts must resolve**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | tail -20
```

Expected: Build succeeds. Token warnings from Task 1 should now resolve.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design): load Inter and Noto Serif via next/font, apply CSS font variables"
```

---

### Task 3: Primitive Alignment — Button

**Files:**
- Modify: `components/ui/button.tsx`

The current button uses `bg-primary/90` hover (percentage opacity hack). We replace with explicit token-driven variants and add the `destructive` variant aligned to the spec.

- [ ] **Step 1: Replace buttonVariants**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium shrink-0 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none transition-[background-color,color,opacity] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]",
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
          'text-[var(--accent-primary)] underline-offset-4 hover:underline rounded-none',
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
```

- [ ] **Step 2: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "(error|Error|warning)" | head -20
```

Expected: No TypeScript errors. Build passes.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat(design): align Button to nocturnal token system, add destructive variant"
```

---

### Task 4: Primitive Alignment — Badge

**Files:**
- Modify: `components/ui/badge.tsx`

Current badge has `border` on every variant and uses generic shadcn colors. Replace with status-driven variants consuming the new state tokens.

- [ ] **Step 1: Replace badgeVariants**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  // Base: all-caps Inter label-md, no border, radius-sm
  'inline-flex items-center justify-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.10em] uppercase w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden font-variant-numeric-tabular',
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
```

- [ ] **Step 2: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "feat(design): align Badge with nocturnal status token variants"
```

---

### Task 5: Primitive Alignment — Input

**Files:**
- Modify: `components/ui/input.tsx`

Current input has a full box border. Replace with underline-only for text inputs.

- [ ] **Step 1: Replace Input**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  // Select, date, time, month, week: use container-style (full border)
  const isContainer = ['select', 'date', 'time', 'month', 'week', 'datetime-local'].includes(type ?? '')

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Shared base
        'w-full min-w-0 bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-disabled)] outline-none transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // Container-style controls (date, select, etc.)
        isContainer
          ? 'h-9 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1 focus-visible:border-[var(--border-focus)] focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)]'
          : // Text-style: underline only
            'h-9 border-b border-[var(--border-subtle)] px-0 py-1 focus-visible:border-b-[var(--border-focus)] focus-visible:bg-[var(--bg-elevated)] focus-visible:px-2 focus-visible:rounded-t-[var(--radius-sm)]',
        // Error state
        'aria-invalid:border-[var(--state-error)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 2: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/input.tsx
git commit -m "feat(design): align Input with underline treatment for text, container for date/select"
```

---

### Task 6: Primitive Alignment — Card, Tabs

**Files:**
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/tabs.tsx`

- [ ] **Step 1: Update Card — remove hardcoded border, use surface tokens**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-[var(--bg-surface)] text-[var(--text-primary)] flex flex-col gap-6 rounded-[var(--radius-lg)] py-6',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold text-[var(--text-primary)]', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-[var(--text-secondary)] text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-6', className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-footer" className={cn('flex items-center px-6', className)} {...props} />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
```

- [ ] **Step 2: Update Tabs — tonal active state, bg-inset container**

```tsx
'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-[var(--bg-inset)] inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-md)] p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base state
        'text-[var(--text-secondary)] inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:pointer-events-none disabled:opacity-50',
        // Active state — tonal only, no underline, no border
        'data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)]',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 3: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/card.tsx components/ui/tabs.tsx
git commit -m "feat(design): align Card and Tabs to nocturnal tonal system"
```

---

### Task 7: Primitive Alignment — Sheet, Dialog, Table

**Files:**
- Modify: `components/ui/sheet.tsx`
- Modify: `components/ui/dialog.tsx` (if it exists — check `components/ui/alert-dialog.tsx` as well)
- Modify: `components/ui/table.tsx`

- [ ] **Step 1: Read current Sheet, AlertDialog, Table to understand current structure**

```bash
cat components/ui/sheet.tsx | head -60
cat components/ui/alert-dialog.tsx | head -40
cat components/ui/table.tsx | head -40
```

- [ ] **Step 2: Update Sheet — bg-overlay, shadow-lg, no border**

In `components/ui/sheet.tsx`, find the `SheetContent` component and update its className to use:
- `bg-[var(--bg-overlay)]` instead of `bg-background`
- `shadow-[var(--shadow-lg)]` instead of the default shadow
- Remove any `border` class

Key class change in `SheetContent`:
```
Old: "bg-background ... border ..."
New: "bg-[var(--bg-overlay)] shadow-[var(--shadow-lg)] ..."
```

- [ ] **Step 3: Update AlertDialog — bg-overlay, shadow-lg, radius-xl, dim backdrop**

In `components/ui/alert-dialog.tsx`, update `AlertDialogContent` and `AlertDialogOverlay`:
```
AlertDialogOverlay: "bg-[var(--bg-dim)]/60"  (was bg-black/80 or similar)
AlertDialogContent: "bg-[var(--bg-overlay)] shadow-[var(--shadow-lg)] rounded-[var(--radius-xl)]"
```

- [ ] **Step 4: Update Table — bg-inset container, border-muted separators**

In `components/ui/table.tsx`, find the wrapper and `TableRow` and update:
```
Table wrapper:  add "bg-[var(--bg-inset)] rounded-[var(--radius-lg)] overflow-hidden"
TableHeader:    "bg-[var(--bg-inset)]"
TableHead:      "text-[var(--text-secondary)] text-[0.625rem] tracking-[0.06em] uppercase font-medium"
TableRow:       remove "border-b", add "border-b border-[var(--border-muted)] hover:bg-[var(--bg-hover)]"
TableCell:      "text-[0.8125rem] leading-[1.4] py-[var(--space-compact-2)] px-[var(--space-compact-3)]"
```

- [ ] **Step 5: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

Expected: Build passes. There may be visual differences visible in the browser, but no TS errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/sheet.tsx components/ui/alert-dialog.tsx components/ui/table.tsx
git commit -m "feat(design): align Sheet, AlertDialog, Table to nocturnal token system"
```

---

### Task 8: Phase 1A — Verify & Sign Off

- [ ] **Step 1: Full build + lint**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build && npm run lint 2>&1 | tail -30
```

Expected: Build succeeds, no lint errors.

- [ ] **Step 2: Manual verification checklist**

Start dev server and open the browser:
```bash
npm run dev
```

Check each of the following:
- [ ] Page background is `#131313` (very dark charcoal)
- [ ] All text is `#f0eeeb` (warm off-white) — not pure white, not blue
- [ ] No blue anywhere in the UI — only teals and charcoals
- [ ] Buttons use `#7ad5dd` teal background with dark text
- [ ] Tab lists have dark inset background, active tab slightly lighter (tonal)
- [ ] Cards have no visible border lines — separated by background color contrast only
- [ ] Inter font is loading (check DevTools Network tab for font files)
- [ ] Noto Serif is loading (confirm in DevTools)

- [ ] **Step 3: Accessibility spot-check on primitives**

In browser DevTools:
- Focus a button with keyboard Tab — the teal focus ring must be clearly visible
- Focus an input — border-bottom should deepen/change to teal
- Check any Badge on screen — text must be readable at its size

---

## Phase 1B — Auth Pages

### Task 9: Redesign Auth Client (auth-client.tsx)

**Files:**
- Modify: `app/auth/auth-client.tsx`

This is the main auth UI component. It currently imports `Space_Grotesk` directly and uses a light card-on-white layout. It needs to become a centered, nocturnal editorial form.

- [ ] **Step 1: Remove Space_Grotesk import**

Find and delete these lines at the top of `app/auth/auth-client.tsx`:
```tsx
import { Space_Grotesk } from "next/font/google";
// ...
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
```

Remove all uses of `spaceGrotesk.className` or `spaceGrotesk.variable` from JSX.

- [ ] **Step 2: Update the page wrapper and card**

Find the outermost wrapper `<div>` of the component and update it:
```tsx
// Old: white gradient background
<div className="flex min-h-screen ...bg-gradient-to-br from-blue-50...">

// New: nocturnal base
<div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 py-12">
```

Find the card/container wrapping the form:
```tsx
// Old: white card with shadow
<div className="...bg-white shadow-lg...">

// New: surface card
<div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[var(--radius-xl)] px-8 py-10">
```

- [ ] **Step 3: Update the page title / headline**

Find the main heading (typically the product name or "Sign In"):
```tsx
// Old: generic heading
<h1 className="text-2xl font-bold text-gray-900">Aicser</h1>

// New: Noto Serif display-lg
<h1
  className="font-display text-[clamp(2rem,4vw,2.5rem)] font-[500] leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] mb-2"
>
  Welcome back.
</h1>
<p className="text-sm text-[var(--text-secondary)] mb-8">Sign in to your account</p>
```

- [ ] **Step 4: Update form labels**

All `<label>` or `<Label>` elements:
```tsx
// Old
<Label className="text-sm text-gray-700">Email</Label>

// New
<Label className="block text-[0.8125rem] font-[500] text-[var(--text-secondary)] mb-1.5">
  Email
</Label>
```

- [ ] **Step 5: Update error messages**

Find error alert/div patterns:
```tsx
// Old
<div className="bg-red-50 text-red-600 border border-red-200 ...">

// New
<div className="bg-[var(--state-error-subtle)] text-[var(--state-error)] rounded-[var(--radius-md)] px-4 py-3 text-sm">
  {errorMessage}
</div>
```

- [ ] **Step 6: Update the divider / "or continue with" separator**

```tsx
// Old
<div className="flex items-center gap-3">
  <hr className="flex-1 border-gray-200" />
  <span className="text-xs text-gray-400">or</span>
  <hr className="flex-1 border-gray-200" />
</div>

// New — use spacing + text only, no visible line
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-[var(--border-muted)]" />
  <span className="text-[0.6875rem] font-[600] tracking-[0.10em] uppercase text-[var(--text-disabled)]">or</span>
  <div className="flex-1 h-px bg-[var(--border-muted)]" />
</div>
```

- [ ] **Step 7: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 8: Commit**

```bash
git add app/auth/auth-client.tsx
git commit -m "feat(design/auth): redesign auth client with nocturnal system, Noto Serif headline, remove Space_Grotesk"
```

---

### Task 10: Redesign Auth Error Page + Auth Sub-pages

**Files:**
- Modify: `app/auth/error/page.tsx`
- Modify: `app/auth/layout.tsx`
- Spot-check: `app/auth/signup/page.tsx`, `app/auth/reset-password/page.tsx`, `app/auth/magic-link/page.tsx`, `app/auth/signup-success/page.tsx`, `app/auth/verify-email/page.tsx`, `app/auth/update-password/UpdatePasswordClient.tsx`

- [ ] **Step 1: Redesign auth/error/page.tsx**

```tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  const errorCode = params.error || "unknown_error";
  const errorDescription =
    params.error_description || "An unexpected error occurred.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[var(--radius-xl)] px-8 py-10">
        {/* Eyebrow */}
        <p className="text-[0.6875rem] font-[600] tracking-[0.10em] uppercase text-[var(--text-disabled)] mb-3">
          Authentication
        </p>

        {/* Headline — Noto Serif */}
        <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] mb-6">
          Something went wrong.
        </h1>

        {/* Error detail */}
        <div className="bg-[var(--state-error-subtle)] rounded-[var(--radius-md)] px-4 py-3 mb-8">
          <p className="text-xs font-[600] uppercase tracking-[0.08em] text-[var(--state-error)] mb-1">
            {errorCode.replace(/_/g, " ")}
          </p>
          <p className="text-sm text-[var(--state-error)]">{errorDescription}</p>
        </div>

        {/* CTA */}
        <Button asChild className="w-full">
          <Link href="/auth">Back to login</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update auth/layout.tsx if it contains any light-mode wrapper**

Read `app/auth/layout.tsx`. If it has a background color or wrapper div, replace:
```tsx
// If it has: className="bg-white" or "bg-gray-50" or gradient
// Replace with: className="bg-[var(--bg-base)]"
```

If the file only wraps children with no styling, no change needed.

- [ ] **Step 3: Spot-check auth sub-pages**

Open each of these files and scan for hardcoded light colors (blue, white, gray) or `bg-gradient` classes:
- `app/auth/signup/page.tsx`
- `app/auth/reset-password/page.tsx`
- `app/auth/magic-link/page.tsx`
- `app/auth/signup-success/page.tsx`
- `app/auth/verify-email/page.tsx`
- `app/auth/update-password/UpdatePasswordClient.tsx`

For each file found with hardcoded light colors, apply the same pattern:
- Wrapper: `bg-[var(--bg-base)]` → card: `bg-[var(--bg-surface)] rounded-[var(--radius-xl)]`
- Headings: `font-display` (Noto Serif) for the main title
- Labels: `text-[var(--text-secondary)] text-[0.8125rem] font-[500]`
- Error states: `bg-[var(--state-error-subtle)] text-[var(--state-error)]`
- Remove any `from-blue-50`, `via-white`, `to-purple-50` gradients
- Remove any `bg-white`, `bg-gray-50`, `text-gray-900`, `text-gray-600`

- [ ] **Step 4: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 5: Phase 1B exit criterion check**

Manual verification:
- [ ] `/auth` — nocturnal card, no white, Noto Serif headline visible
- [ ] `/auth?mode=signup` — same system, form labels use Inter (not Geist/Space Grotesk)
- [ ] `/auth/error` — dark error panel, teal "Back to login" button
- [ ] Keyboard Tab through the login form — focus ring visible on all inputs and button
- [ ] No gradient backgrounds, no blue, no white anywhere in auth routes

- [ ] **Step 6: Commit**

```bash
git add app/auth/
git commit -m "feat(design/auth): redesign auth error page and align all auth sub-pages to nocturnal system"
```

---

## Phase 1C — Booking Flow

### Task 11: Redesign Booking Form Page

**Files:**
- Modify: `app/book/[serviceId]/page.tsx`
- Modify: `components/booking/booking-form.tsx`

- [ ] **Step 1: Read the current booking form component**

```bash
cat components/booking/booking-form.tsx | head -100
```

Identify:
- The time slot grid (buttons rendered per slot)
- The date picker input
- The step/progress indicator (if any)
- Service header/summary

- [ ] **Step 2: Update page wrapper in app/book/[serviceId]/page.tsx**

```tsx
// Find the outermost wrapper and update background:
<div className="min-h-screen bg-[var(--bg-base)] px-4 py-10">
  <div className="mx-auto max-w-2xl">
    {/* Step indicator eyebrow */}
    <p className="text-[0.75rem] font-[600] tracking-[0.12em] uppercase text-[var(--text-disabled)] mb-4">
      Step-by-Step Booking
    </p>
    {/* ... rest of content */}
  </div>
</div>
```

- [ ] **Step 3: Update time slot buttons in booking-form.tsx**

Find the time slot rendering (typically a grid of buttons/divs). Replace with:
```tsx
<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
  {slots.map((slot) => (
    <button
      key={slot.start_time}
      type="button"
      onClick={() => onSlotSelect(slot.start_time)}
      disabled={!slot.available}
      className={cn(
        // Base
        "rounded-[var(--radius-md)] px-3 py-3 text-sm font-[500] transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        // Unselected
        selectedSlot !== slot.start_time && slot.available &&
          "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border hover:border-[var(--border-interactive)]",
        // Selected
        selectedSlot === slot.start_time &&
          "bg-[var(--accent-primary)] text-[var(--text-on-accent)]",
        // Disabled
        !slot.available &&
          "bg-[var(--bg-inset)] text-[var(--text-disabled)] opacity-50 cursor-not-allowed",
      )}
    >
      {formatTimeInTimeZone(slot.start_time, timezone)}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Update service card / summary panel header**

Find the service name heading in the booking form:
```tsx
// Update service name to use title-lg styling
<h2 className="text-[1.25rem] font-[600] leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)] mb-1">
  {service.name}
</h2>
<p className="text-sm text-[var(--text-secondary)]">{service.description}</p>
```

- [ ] **Step 5: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add app/book/ components/booking/booking-form.tsx
git commit -m "feat(design/booking): redesign booking form with nocturnal time slots and layout"
```

---

### Task 12: Redesign Payment Page + Booking Confirmation

**Files:**
- Modify: `app/payment/[bookingId]/page.tsx`
- Modify: `components/payment/payment-form.tsx` (read first)
- Modify: `components/payment/payment-return-status.tsx` (read first)

- [ ] **Step 1: Read payment components**

```bash
cat components/payment/payment-form.tsx | head -80
cat components/payment/payment-return-status.tsx | head -80
```

- [ ] **Step 2: Update payment page wrapper (app/payment/[bookingId]/page.tsx)**

Find the outer div and booking summary section:
```tsx
// Page wrapper
<div className="min-h-screen bg-[var(--bg-base)] px-4 py-10">
  <div className="mx-auto max-w-3xl">
    {/* Eyebrow */}
    <p className="text-[0.75rem] font-[600] tracking-[0.12em] uppercase text-[var(--text-disabled)] mb-4">
      Booking Summary
    </p>

    {/* Booking details card */}
    <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] px-6 py-6 mb-6">
      <h2 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] mb-4">
        {booking.services.name}
      </h2>
      {/* Date, time, staff — body-md */}
      <div className="space-y-2 text-sm text-[var(--text-secondary)]">
        {/* ... booking meta lines */}
      </div>
    </div>
```

- [ ] **Step 3: Update payment field containers in payment-form.tsx**

Payment inputs must use container-style (full border, not underline):
```tsx
// Payment field wrapper — container treatment
<div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-3 focus-within:border-[var(--border-focus)] focus-within:shadow-[inset_0_0_0_1px_var(--border-focus)] transition-[border-color,box-shadow] duration-[var(--duration-fast)]">
  {/* Stripe/payment element renders here */}
</div>
```

- [ ] **Step 4: Update payment-return-status.tsx for success/error states**

Find success and error rendering patterns:
```tsx
// Success state
<div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
  <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[var(--radius-xl)] px-8 py-10 text-center">
    {/* Success icon — teal */}
    <div className="w-12 h-12 rounded-full bg-[var(--state-success-subtle)] flex items-center justify-center mx-auto mb-6">
      <CheckCircle2 className="w-6 h-6 text-[var(--state-success)]" />
    </div>
    {/* Headline — Noto Serif */}
    <h1 className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] mb-3">
      Booking confirmed.
    </h1>
    <p className="text-sm text-[var(--text-secondary)] mb-8">
      We'll see you on {date}.
    </p>
    <Button asChild>
      <Link href="/bookings">View my bookings</Link>
    </Button>
  </div>
</div>

// Error state — use state-error tokens instead of state-success tokens
```

- [ ] **Step 5: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 6: Phase 1C exit criterion check**

Manual verification:
- [ ] `/book/[any-service-id]` — dark background, time slots as teal-on-select buttons
- [ ] `/payment/[any-booking-id]` — dark summary card, payment fields with subtle container border
- [ ] Booking confirmation state — Noto Serif headline, success-green icon, dark background
- [ ] All interactive elements have visible keyboard focus indicators

- [ ] **Step 7: Commit**

```bash
git add app/payment/ components/payment/
git commit -m "feat(design/payment): redesign payment page and confirmation with nocturnal system"
```

---

## Phase 1D — Customer Account

### Task 13: Redesign Customer Bookings Page + BookingCard

**Files:**
- Modify: `app/bookings/page.tsx`
- Modify: `components/booking/customer-bookings-client.tsx`
- Modify: `components/booking/BookingCard.tsx`

- [ ] **Step 1: Read BookingCard.tsx**

```bash
cat components/booking/BookingCard.tsx
```

Identify: card structure, status badge usage, action buttons.

- [ ] **Step 2: Update app/bookings/page.tsx — page header**

```tsx
// Find the outer page div and header section, update:
<div className="min-h-screen bg-[var(--bg-base)]">
  {/* Header */}
  <div className="border-b border-[var(--border-muted)]">
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-[0.75rem] font-[600] tracking-[0.12em] uppercase text-[var(--text-disabled)] mb-2">
        My Account
      </p>
      <h1 className="font-display text-[clamp(2rem,4vw,2.5rem)] font-[500] leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">
        Your Bookings
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Manage upcoming appointments, reschedule, or join waitlists.
      </p>
    </div>
  </div>
  {/* ... rest */}
```

- [ ] **Step 3: Update BookingCard.tsx — comfortable tier card, no dividers**

Key updates:
```tsx
// Card wrapper
<div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] px-6 py-[var(--spacing-comfortable-y)]">

  {/* Service name — title-lg */}
  <h3 className="text-[1.25rem] font-[600] leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)] mb-1">
    {serviceName}
  </h3>

  {/* Meta row — body-sm, text-secondary, no border separator */}
  <div className="flex items-center gap-4 text-[0.8125rem] text-[var(--text-secondary)] mb-4">
    <span>{date}</span>
    <span>{time}</span>
    <span>{providerName}</span>
  </div>

  {/* Status badge — use booking-status variant */}
  <Badge variant={status as any}>{status}</Badge>

  {/* Price — tabular-nums */}
  <p className="text-sm font-[600] text-[var(--text-primary)] mt-3 tabular-nums">
    ${price.toFixed(2)}
  </p>

  {/* Actions — space between card sections, no divider line */}
  {(onViewDetails || onEdit || onCancel || onBook) && (
    <div className="flex items-center gap-3 mt-[var(--spacing-comfortable-y)]">
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[var(--duration-fast)]"
        >
          View details →
        </button>
      )}
      {onEdit && (
        <Button size="sm" variant="ghost" onClick={onEdit}>Reschedule</Button>
      )}
      {onCancel && (
        <Button size="sm" variant="destructive" onClick={onCancel}>Cancel</Button>
      )}
      {onBook && (
        <Button size="sm" onClick={onBook}>Book again</Button>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 4: Update customer-bookings-client.tsx — tab container and sheet headers**

In the component, find `TabsList` usage and ensure it renders without additional border/separator wrappers.

Find the sheet headers:
```tsx
// Detail sheet — Noto Serif header (customer-facing)
<SheetTitle className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)]">
  Booking Details
</SheetTitle>

// Reschedule sheet — same serif header
<SheetTitle className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)]">
  Reschedule Booking
</SheetTitle>
```

Find the empty state renders and update:
```tsx
<div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
  <p className="font-display text-[clamp(1.5rem,3vw,1.75rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-[var(--text-primary)] mb-2">
    No bookings yet
  </p>
  <p className="mt-2 text-sm text-[var(--text-secondary)] mb-6">
    Browse services and book your next appointment.
  </p>
  <Button asChild variant="ghost">
    <a href="/">Explore Services →</a>
  </Button>
</div>
```

- [ ] **Step 5: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 6: Phase 1D exit criterion check**

Manual verification:
- [ ] `/bookings` — Noto Serif page title, "MY ACCOUNT" eyebrow label
- [ ] Tabs use bg-inset container, active tab is tonal (no underline, no border)
- [ ] Booking cards have no visible card borders — surface contrast only
- [ ] Status chips (pending, confirmed, cancelled) use correct teal/green/red variants
- [ ] Empty state uses dashed border with serif headline
- [ ] Detail sheet opens from right with dark overlay background
- [ ] Reschedule time slot grid renders with teal selected state

- [ ] **Step 7: Commit**

```bash
git add app/bookings/ components/booking/
git commit -m "feat(design/account): redesign customer bookings with tabs, cards, sheets, status chips"
```

---

## Phase 1E — Admin & Staff Dashboard

### Task 14: Redesign Dashboard Layout (Sidebar)

**Files:**
- Modify: `components/dashboard/dashboard-layout.tsx`

- [ ] **Step 1: Read the full dashboard layout**

```bash
cat components/dashboard/dashboard-layout.tsx
```

Identify: sidebar markup, nav item patterns, header bar, mobile toggle.

- [ ] **Step 2: Update sidebar background and nav items**

In the sidebar container (typically a fixed-width left div or `<aside>`):
```tsx
// Sidebar container
<aside className="h-screen w-64 bg-[var(--bg-surface)] flex flex-col border-r border-[var(--border-muted)]">

  {/* Logo / brand */}
  <div className="px-6 py-6">
    <span className="text-[1rem] font-[600] leading-[1.4] tracking-[-0.005em] text-[var(--text-primary)]">
      Aicser
    </span>
  </div>

  {/* Role label */}
  <div className="px-6 mb-4">
    <p className="text-[0.6875rem] font-[600] tracking-[0.10em] uppercase text-[var(--text-disabled)]">
      {displayRole}
    </p>
  </div>

  {/* Nav items */}
  <nav className="flex-1 px-3 space-y-0.5">
    {navItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-[1rem] font-[600] leading-[1.4] tracking-[-0.005em] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
          // Active state — tonal, no underline
          pathname === item.href
            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        )}
      >
        {item.icon && <item.icon className="size-4 shrink-0" />}
        {item.label}
      </Link>
    ))}
  </nav>
</aside>
```

- [ ] **Step 3: Update main content area wrapper**

```tsx
<main className="flex-1 bg-[var(--bg-base)] overflow-y-auto">
  {/* Page header */}
  {(title || subtitle) && (
    <div className="px-8 py-8 border-b border-[var(--border-muted)]">
      <h1 className="text-[1.25rem] font-[600] leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      )}
    </div>
  )}
  <div className="px-8 py-8">
    {children}
  </div>
</main>
```

- [ ] **Step 4: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/dashboard-layout.tsx
git commit -m "feat(design/admin): redesign dashboard sidebar with nocturnal tokens and tonal nav"
```

---

### Task 15: Redesign Stat Cards + Admin Dashboard Page

**Files:**
- Modify: `components/dashboard/stat-card.tsx`
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Read stat-card.tsx**

```bash
cat components/dashboard/stat-card.tsx
```

- [ ] **Step 2: Redesign stat card — comfortable tier**

```tsx
// components/dashboard/stat-card.tsx
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ label, value, description, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-[var(--bg-surface)] rounded-[var(--radius-lg)] px-6 py-[var(--spacing-comfortable-y)]",
      className
    )}>
      {/* Label — all-caps eyebrow */}
      <p className="text-[0.6875rem] font-[600] tracking-[0.10em] uppercase text-[var(--text-secondary)] mb-3">
        {label}
      </p>

      {/* Value — title-lg, tabular-nums */}
      <p className="text-[1.25rem] font-[600] leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)] tabular-nums">
        {value}
      </p>

      {/* Description */}
      {description && (
        <p className="mt-1 text-[0.8125rem] text-[var(--text-secondary)]">{description}</p>
      )}

      {/* Trend */}
      {trend && (
        <p className={cn(
          "mt-2 text-xs font-[500] tabular-nums",
          trend.value >= 0 ? "text-[var(--state-success)]" : "text-[var(--state-error)]"
        )}>
          {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update admin dashboard page grid to use comfortable tier**

In `app/admin/dashboard/page.tsx`, update the stat card grid:
```tsx
{/* Stat cards — comfortable spacing */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
  <StatCard label="Total Bookings" value={stats.totalBookings} />
  <StatCard label="Upcoming" value={stats.upcomingBookings} />
  <StatCard label="Revenue" value={`$${stats.totalRevenue.toFixed(0)}`} />
  <StatCard label="Avg Rating" value={stats.avgRating.toFixed(1)} />
</div>
```

- [ ] **Step 4: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/stat-card.tsx app/admin/dashboard/page.tsx
git commit -m "feat(design/admin): redesign stat cards with comfortable density tier"
```

---

### Task 16: Admin Tables — Compact Density Tier

**Files:**
- Modify: `app/admin/bookings/page.tsx`
- Modify: `app/admin/staff/page.tsx`
- Modify: `app/admin/services/page.tsx`
- Modify: `app/staff/requests/page.tsx`
- Modify: `app/staff/schedule/page.tsx`

The compact density tier is applied consistently to every admin data table. Apply the pattern once per file.

- [ ] **Step 1: Read app/admin/bookings/page.tsx**

```bash
cat app/admin/bookings/page.tsx | head -100
```

Identify the table structure — is it a `<Table>` component or raw HTML?

- [ ] **Step 2: Apply compact density wrapper to each admin table**

For every table in admin pages, wrap it with:
```tsx
{/* Compact density table container */}
<div className="bg-[var(--bg-inset)] rounded-[var(--radius-lg)] overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="border-b border-[var(--border-muted)] hover:bg-transparent">
        {/* Column headers — label-dense */}
        <TableHead className="h-9 px-[var(--space-compact-3)] text-[0.625rem] font-[500] tracking-[0.06em] uppercase text-[var(--text-secondary)]">
          Column Name
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow
          key={row.id}
          className="border-b border-[var(--border-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-fast)] data-[state=selected]:bg-[var(--accent-subtle)]"
        >
          {/* Table cells — body-dense, tabular-nums where applicable */}
          <TableCell className="py-[var(--space-compact-2)] px-[var(--space-compact-3)] text-[0.8125rem] leading-[1.4] text-[var(--text-primary)] tabular-nums">
            {row.value}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

Apply this pattern to:
1. `app/admin/bookings/page.tsx`
2. `app/admin/staff/page.tsx`
3. `app/admin/services/page.tsx`
4. `app/staff/requests/page.tsx`
5. `app/staff/schedule/page.tsx`

Also add filter bar pattern above each table:
```tsx
{/* Filter/action bar — compact */}
<div className="flex items-center gap-3 mb-4 px-[var(--space-compact-3)] py-[var(--space-compact-2)]">
  <Input
    placeholder="Search..."
    className="max-w-xs"
  />
  {/* Ghost action buttons */}
  <Button variant="ghost" size="sm">Filter</Button>
  <Button variant="ghost" size="sm">Export</Button>
</div>
```

- [ ] **Step 2: Run build**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build 2>&1 | grep -E "error" | head -10
```

- [ ] **Step 3: Commit after each admin table file**

```bash
git add app/admin/bookings/page.tsx
git commit -m "feat(design/admin): apply compact density tier to bookings table"

git add app/admin/staff/page.tsx app/admin/services/page.tsx
git commit -m "feat(design/admin): apply compact density tier to staff and services tables"

git add app/staff/requests/page.tsx app/staff/schedule/page.tsx
git commit -m "feat(design/staff): apply compact density tier to staff requests and schedule"
```

---

### Task 17: Phase 1E Verification & Sign Off

- [ ] **Step 1: Full build + lint**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system && npm run build && npm run lint 2>&1 | tail -30
```

Expected: Build and lint pass with no errors.

- [ ] **Step 2: Phase 1E exit criterion check**

Manual verification — open the admin area in a browser:
- [ ] Sidebar is `bg-surface` (slightly lighter than page `bg-base`)
- [ ] Active nav item is tonal (bg-elevated), no blue highlight, no underline
- [ ] Nav labels use Inter (not serif)
- [ ] Stat cards render on `bg-surface` with comfortable padding — visibly more spacious than table rows
- [ ] Admin tables use `bg-inset` container — slightly darker than the page background
- [ ] Table rows have `border-muted` separators (very faint, not sharp lines)
- [ ] Row hover shows `bg-hover` wash — subtle, not jarring
- [ ] Column headers are all-caps, small, secondary color
- [ ] Filter bars above tables use compact spacing
- [ ] No Noto Serif anywhere in admin — all Inter
- [ ] Keyboard Tab through table and sidebar — focus ring visible

- [ ] **Step 3: Cross-cutting accessibility gate**

Run these checks manually across all redesigned pages:
- [ ] All interactive elements reachable by keyboard
- [ ] Focus ring visible on every focused element (teal `--border-focus`)
- [ ] `prefers-reduced-motion` — disable transitions in OS settings and verify no animation remains
- [ ] Minimum tap target: auth buttons, booking slots, nav items all feel comfortably tappable on mobile
- [ ] No pure white (`#ffffff`) or standard blue anywhere — only the nocturnal palette

---

## Phase 2 — Landing Page (Deferred)

Phase 2 is deferred. The landing page (`app/page.tsx` and `components/landing/`) inherits the system built in Phases 1A–1E.

**When Phase 2 begins**, the implementation order is:
1. `components/landing/Navbar.tsx` — glassmorphism on scroll, text-only nav
2. `components/landing/HeroSection.tsx` — Noto Serif `display-xl`, asymmetric layout
3. `components/landing/CategoryGrid.tsx` — card grid, bg-surface tiles
4. `components/landing/ServicesGrid.tsx` + `ServiceCard.tsx` — radius-xl images, comfortable cards
5. `components/landing/FeaturedServices.tsx` — editorial layout
6. `components/landing/TrustSection.tsx` — clean data surface
7. `components/landing/HowItWorks.tsx` — step layout, label-lg eyebrows
8. `components/landing/Footer.tsx` — text-based links, no border separators

No new tokens or product-side primitives should be introduced during Phase 2.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in |
|---|---|
| Two-layer token system | Task 1 |
| Inter + Noto Serif fonts | Task 2 |
| Button variants (primary, ghost, destructive) | Task 3 |
| Badge status variants (all 6) | Task 4 |
| Input underline/container treatment | Task 5 |
| Card — no border, surface tokens | Task 6 |
| Tabs — tonal active, bg-inset | Task 6 |
| Sheet — bg-overlay, shadow-lg | Task 7 |
| AlertDialog — bg-overlay, dim backdrop | Task 7 |
| Table — compact density, border-muted | Task 7 |
| Shadcn bridge | Task 1 |
| Tailwind bridge | Task 1 |
| Reduced-motion media query | Task 1 |
| Auth pages — nocturnal, Noto Serif title | Tasks 9–10 |
| Remove Space_Grotesk | Task 9 |
| Booking form — slot grid, step indicator | Task 11 |
| Payment page — container fields, confirmation | Task 12 |
| Customer bookings — tabs, cards, sheets | Task 13 |
| Status chips (all statuses) | Task 13 |
| Empty state (dashed border exception) | Task 13 |
| Admin sidebar — comfortable tier | Task 14 |
| Stat cards — comfortable tier | Task 15 |
| Admin tables — compact density tier | Task 16 |
| Filter bars — compact spacing | Task 16 |
| Token governance rule | Task 1 (documented in globals.css) |
| Regression rule (shadcn bridge) | Task 1 |
| tabular-nums for numeric content | Tasks 13, 15, 16 |
| Per-phase exit criteria | Each phase task |
| Accessibility gate | Task 8 (1A), Task 10 (1B), Task 12 (1C), Task 13 (1D), Task 17 (1E) |

**No gaps found.**
