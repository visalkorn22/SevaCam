# Design System Redesign — "The Digital Maître D'"

**Date:** 2026-04-01
**Status:** Approved — ready for implementation planning
**Approach:** Token-Layer First (Approach A)

---

## Creative North Star

The redesign moves the product away from generic SaaS patterns toward a "Digital Maître D'" aesthetic: calm, spacious, nocturnal, and obsessively curated. Every screen is treated as an editorial surface. Depth is achieved through tonal layering, not borders. Space is used as a design element, not filled.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Theme mode | Dark-only (Phase 1), light deferred | Faithful to spec; avoids doubling token/component work |
| Token architecture | Two-layer semantic system | Enables future light mode via single globals.css update |
| Body font | Inter | Cleaner than Geist for dense product UI |
| Display font | Noto Serif | Editorial contrast for customer-facing headlines |
| Admin density | Pragmatic density tier within the same system | Operational usability without fragmenting the aesthetic |
| Rollout order | Tokens → Auth → Booking → Account → Admin → Landing | Dependency chain: system first, densest surface last |

---

## Section 1 — Token System Architecture

### Layer 1: Raw Palette (private — never consumed directly by components)

```css
/* Charcoal scale */
--_color-charcoal-base: #131313;
--_color-charcoal-low:  #1c1b1b;
--_color-charcoal-mid:  #252524;
--_color-charcoal-high: #353534;
--_color-charcoal-dim:  #0e0e0e;
--_color-charcoal-inset:#101010;

/* Teal accent */
--_color-teal-primary:  #7ad5dd;
--_color-teal-on:       #00363a;
--_color-teal-subtle:   #1a3e41;

/* Warm accent */
--_color-amber:         #ffb785;

/* Text scale */
--_color-white:         #f0eeeb;
--_color-white-muted:   #a8a49e;
--_color-white-faint:   #6b6762;

/* State colors */
--_color-error:         #e57373;
--_color-error-subtle:  #2a1515;
--_color-success:       #7fd1a5;
--_color-success-subtle:#15241c;
--_color-warning-subtle:#2b1d14;
```

---

### Layer 2: Semantic Tokens (public — what all components consume)

```css
/* ─── Surfaces ──────────────────────────────────────────────────────────────
   Usage doctrine:
   --bg-base      = app/page background (Layer 0)
   --bg-surface   = default cards, panels, sections (Layer 1)
   --bg-elevated  = emphasized or active grouped content (Layer 2)
   --bg-overlay   = modals, sheets, dropdowns (Layer 3)
   --bg-inset     = nested containers, table bodies, inset areas, dense embedded zones
   --bg-dim       = scrims, backdrops, de-emphasis zones (behind overlays)
   --bg-hover     = transient row/item hover wash — NOT a structural surface layer
*/
--bg-base:              var(--_color-charcoal-base);
--bg-surface:           var(--_color-charcoal-low);
--bg-elevated:          var(--_color-charcoal-mid);
--bg-overlay:           var(--_color-charcoal-high);
--bg-inset:             var(--_color-charcoal-inset);
--bg-dim:               var(--_color-charcoal-dim);
--bg-hover:             rgba(240, 238, 235, 0.04);

/* ─── Text ───────────────────────────────────────────────────────────────── */
--text-primary:         var(--_color-white);
--text-secondary:       var(--_color-white-muted);
--text-disabled:        var(--_color-white-faint);
--text-on-accent:       var(--_color-teal-on);
--text-on-dark:         var(--_color-white);

/* ─── Accent ─────────────────────────────────────────────────────────────── */
--accent-primary:       var(--_color-teal-primary);
--accent-on:            var(--_color-teal-on);
--accent-subtle:        var(--_color-teal-subtle);
--accent-warm:          var(--_color-amber);

/* Explicit button state tokens (not prose rules) */
--accent-primary-hover:  color-mix(in srgb, var(--_color-teal-primary) 92%, white);
--accent-primary-active: color-mix(in srgb, var(--_color-teal-primary) 84%, black);
--ghost-hover-bg:        rgba(122, 213, 221, 0.06);
--ghost-hover-text:      var(--_color-teal-primary);

/* ─── Borders ────────────────────────────────────────────────────────────────
   Usage doctrine:
   --border-muted       = table row separators, low-emphasis list dividers (faintest)
   --border-subtle      = card outlines, container boundaries (default structural)
   --border-interactive = hover/selected state on cards, slots, list items
   --border-focus       = keyboard focus ring — must be unmistakable
*/
--border-muted:          rgba(240, 238, 235, 0.05);
--border-subtle:         rgba(240, 238, 235, 0.08);
--border-interactive:    rgba(122, 213, 221, 0.25);
--border-focus:          rgba(122, 213, 221, 0.40);

/* ─── State / Status ─────────────────────────────────────────────────────── */
--state-error:           var(--_color-error);
--state-error-subtle:    var(--_color-error-subtle);
--state-success:         var(--_color-success);
--state-success-subtle:  var(--_color-success-subtle);
--state-warning:         var(--_color-amber);
--state-warning-subtle:  var(--_color-warning-subtle);

/* ─── Spacing Tiers ──────────────────────────────────────────────────────────
   comfortable = customer-facing flows (booking, account, auth, confirmation)
   compact     = admin operational surfaces (tables, schedules, filter bars)
*/
--spacing-comfortable-x: 1.25rem;
--spacing-comfortable-y: 1.5rem;
--spacing-compact-x:     0.75rem;
--spacing-compact-y:     0.75rem;

/* Fine-grained comfortable scale */
--space-comfortable-1:   0.75rem;
--space-comfortable-2:   1rem;
--space-comfortable-3:   1.5rem;

/* Fine-grained compact scale */
--space-compact-1:       0.5rem;
--space-compact-2:       0.75rem;
--space-compact-3:       1rem;

/* ─── Radius ─────────────────────────────────────────────────────────────── */
--radius-sm:    0.5rem;
--radius-md:    0.75rem;
--radius-lg:    1rem;
--radius-xl:    1.5rem;

/* ─── Elevation ──────────────────────────────────────────────────────────── */
--shadow-sm:    0 1px 2px rgba(0, 0, 0, 0.24);
--shadow-md:    0 8px 24px rgba(0, 0, 0, 0.28);
--shadow-lg:    0 16px 48px rgba(0, 0, 0, 0.36);

/* ─── Blur (glassmorphism) ───────────────────────────────────────────────── */
--blur-sm:      8px;
--blur-md:      16px;

/* ─── Motion ─────────────────────────────────────────────────────────────── */
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast:  150ms;
--duration-base:  250ms;
```

---

### Shadcn Bridge (legacy compatibility — do not delete until all components are migrated)

```css
/* Maps shadcn token names to the new semantic layer.
   Components consuming old tokens remain functional during rollout. */
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
```

---

### Tailwind Bridge

```css
@theme inline {
  --font-sans:              var(--font-inter);
  --font-display:           var(--font-serif);

  --color-background:       var(--bg-base);
  --color-foreground:       var(--text-primary);
  --color-surface:          var(--bg-surface);
  --color-elevated:         var(--bg-elevated);
  --color-overlay:          var(--bg-overlay);
  --color-inset:            var(--bg-inset);

  --color-accent:           var(--accent-primary);
  --color-accent-on:        var(--text-on-accent);

  --color-border-subtle:    var(--border-subtle);
  --color-border-muted:     var(--border-muted);
  --color-border-focus:     var(--border-focus);
  --color-border-interactive: var(--border-interactive);
}
```

**Token governance rule:** After Phase 1A ships, new tokens require written justification that the need cannot be satisfied by an existing semantic token. Tokens are not added per-page without review.

**Regression rule:** Until a page is explicitly redesigned, it must remain functionally usable even if visually unstyled by the new system. The shadcn bridge exists to enforce this.

---

## Section 2 — Typography System

### Font Loading

```tsx
// app/layout.tsx
import { Inter, Noto_Serif } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})
```

---

### Font Family Tokens

```css
--font-display: var(--font-serif);   /* Noto Serif — editorial/display moments only */
--font-body:    var(--font-inter);   /* Inter — all UI, body, labels, admin */
```

---

### Type Scale (split-variable format)

```css
/* ─── Display (Noto Serif) ───────────────────────────────────────────────── */
--text-display-xl-size:      clamp(2.5rem, 5vw, 3.5rem);
--text-display-xl-lh:        1.1;
--text-display-xl-tracking:  -0.02em;
--text-display-xl-weight:    500;

--text-display-lg-size:      clamp(2rem, 4vw, 2.5rem);
--text-display-lg-lh:        1.15;
--text-display-lg-tracking:  -0.02em;
--text-display-lg-weight:    500;

--text-display-md-size:      clamp(1.5rem, 3vw, 1.75rem);
--text-display-md-lh:        1.2;
--text-display-md-tracking:  -0.015em;
--text-display-md-weight:    500;

/* ─── Title (Inter) ──────────────────────────────────────────────────────── */
--text-title-lg-size:        1.25rem;
--text-title-lg-lh:          1.3;
--text-title-lg-tracking:    -0.01em;
--text-title-lg-weight:      600;

--text-title-md-size:        1rem;
--text-title-md-lh:          1.4;
--text-title-md-tracking:    -0.005em;
--text-title-md-weight:      600;

--text-title-sm-size:        0.875rem;
--text-title-sm-lh:          1.4;
--text-title-sm-tracking:    0;
--text-title-sm-weight:      600;

/* ─── Body (Inter) ───────────────────────────────────────────────────────── */
--text-body-lg-size:         1rem;
--text-body-lg-lh:           1.6;
--text-body-lg-tracking:     0;
--text-body-lg-weight:       400;

--text-body-md-size:         0.875rem;
--text-body-md-lh:           1.5;
--text-body-md-tracking:     0;
--text-body-md-weight:       400;

--text-body-sm-size:         0.8125rem;
--text-body-sm-lh:           1.5;
--text-body-sm-tracking:     0;
--text-body-sm-weight:       400;

/* ─── UI Label (Inter, mixed-case form labels) ───────────────────────────── */
--text-ui-label-size:        0.8125rem;
--text-ui-label-lh:          1.4;
--text-ui-label-tracking:    0;
--text-ui-label-weight:      500;

/* ─── Label (Inter, all-caps utility only) ───────────────────────────────── */
--text-label-lg-size:        0.75rem;
--text-label-lg-lh:          1.3;
--text-label-lg-tracking:    0.12em;
--text-label-lg-weight:      600;

--text-label-md-size:        0.6875rem;
--text-label-md-lh:          1.3;
--text-label-md-tracking:    0.10em;
--text-label-md-weight:      600;

--text-label-sm-size:        0.625rem;
--text-label-sm-lh:          1.3;
--text-label-sm-tracking:    0.08em;
--text-label-sm-weight:      600;

/* ─── Dense tier overrides (admin operational surfaces only) ─────────────── */
--text-body-dense-size:      0.8125rem;
--text-body-dense-lh:        1.4;
--text-body-dense-tracking:  0;
--text-body-dense-weight:    400;

--text-label-dense-size:     0.625rem;
--text-label-dense-lh:       1.3;
--text-label-dense-tracking: 0.06em;
--text-label-dense-weight:   500;
```

---

### Usage Doctrine

**Noto Serif** — customer/editorial moments only. Never in admin operational UI.

| Token | Usage |
|---|---|
| `display-xl` | Landing hero headline (Phase 2) |
| `display-lg` | Page titles: My Bookings, Booking Confirmed, Login |
| `display-md` | Key section headers, confirmation panels, customer-facing empty state headlines |

**Inter** — all UI, utility, and operational text.

| Token | Usage |
|---|---|
| `title-lg/md` | Card headers, sheet titles (admin), nav items |
| `title-sm` | Compact card headers, dense section labels |
| `body-lg` | Long descriptions, booking summaries |
| `body-md` | Default body, form descriptions |
| `body-sm` | Timestamps, meta, staff names, secondary info |
| `ui-label` | Mixed-case form field labels (not all-caps) |
| `label-lg/md` | ALL-CAPS eyebrows (section labels, step indicators) |
| `label-md` | Badges, status chips |
| `label-sm` | Dense admin column headers, inline admin meta |
| `body-dense` | Admin table rows, filter lists, schedule items |
| `label-dense` | Admin column headers in compact tables |

**Rule:** Dense tier tokens are selective overrides. They apply only to tables, schedules, filter rows, and compact admin lists. They are not defaults for the admin area as a whole.

**Rule:** `label-*` tokens (all-caps, wide tracking) are never used for form field labels. Use `ui-label` for those.

**Rule — Numeric text:** Any context displaying numbers that must align vertically — prices, times, durations, booking IDs, report figures, schedule slots — must apply `font-variant-numeric: tabular-nums`. This applies to table cells, stat card values, time slot labels, and payment amounts. Set it at the container level for tables; set it per-element for inline figures.

---

### Body Baseline

```css
body {
  font-family: var(--font-body);
  font-size: var(--text-body-md-size);
  line-height: var(--text-body-md-lh);
  letter-spacing: var(--text-body-md-tracking);
  font-weight: var(--text-body-md-weight);
  color: var(--text-primary);
  background: var(--bg-base);
  -webkit-font-smoothing: antialiased;
}
```

---

## Section 3 — Surface, Elevation & Component Rules

### Surface Ladder

```
Layer 0  --bg-base      (#131313)             page/app background
Layer 1  --bg-surface   (#1c1b1b)             cards, panels, sections
Layer 2  --bg-elevated  (#252524)             emphasized or active grouped content
Layer 3  --bg-overlay   (#353534)             modals, sheets, dropdowns
Layer 4  --bg-inset     (#101010)             nested containers, table bodies, inset zones
         --bg-dim       (#0e0e0e)             scrims, backdrops, de-emphasis zones
         --bg-hover     rgba(…, 0.04)         transient hover/active row wash (not structural)
```

**Default rule (structural surfaces):** A structural container sits one level above its host surface. A card (`bg-surface`) lives on `bg-base`. A focused input (`bg-elevated`) lives inside a card (`bg-surface`). This rule applies to cards, panels, inputs, sheets, and table containers.

**Exception:** Inline UI — badges, buttons, pills, chips, selected states — is exempt from the ladder rule. Forcing inline elements into the ladder creates awkward edge cases.

**`--bg-hover` is not a surface layer.** It is a transient interaction state wash. It must not be used as a permanent background for any element.

---

### The No-Border Rule

Sections and cards are separated by surface shifts and whitespace, not lines. Before adding a border, first try adding `2rem` of vertical space. If that resolves the hierarchy problem, no border is needed.

| Token | Permitted use |
|---|---|
| `--border-muted` | Table row separators, low-emphasis list dividers only |
| `--border-subtle` | Card outlines when tonal contrast alone is insufficient (rare) |
| `--border-interactive` | Hover state on selectable cards, time slots, list items |
| `--border-focus` | Keyboard focus — must always be unmistakable |

**Explicit exception:** Empty state containers may use `1px dashed border-subtle`. This is one of the few permitted decorative borders in the system. It does not conflict with the no-border doctrine — it is a documented exception.

---

### Glassmorphism Rules

Used only on floating surfaces that sit above scrolling content: sticky navigation, booking summary panels, floating confirmation cards.

```css
.glass {
  background: color-mix(in srgb, var(--bg-overlay) 70%, transparent);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--border-subtle);
}
```

**Fallback rule:** Every glass surface must read correctly without blur. Blur is visual enhancement, not a structural dependency. Background opacity alone must provide sufficient contrast.

**Never apply glassmorphism to:** Static cards, panels, table containers, or any non-floating element.

---

### Component Rules

#### Buttons

```
Primary:
  background:   --accent-primary
  color:        --text-on-accent
  radius:       --radius-md (0.75rem)
  hover:        --accent-primary-hover
  active:       --accent-primary-active
  disabled:     opacity: 0.40, cursor: not-allowed
  transition:   var(--ease-standard) var(--duration-fast)

Ghost (customer flows):
  color:        --text-primary → --ghost-hover-text on hover
  background:   transparent → --ghost-hover-bg on hover
  no container, arrow/chevron suffix in customer-facing contexts
  transition:   var(--ease-standard) var(--duration-fast)

Ghost (admin):
  same tokens, but: no forced arrow suffix
  supports: text-only, icon-only, compact neutral variants
  transition:   var(--ease-standard) var(--duration-fast)

Destructive:
  background:   --state-error-subtle
  color:        --state-error
  hover bg:     color-mix(in srgb, var(--state-error-subtle) 80%, var(--state-error))
  radius:       --radius-md
  disabled:     opacity: 0.40, cursor: not-allowed
  transition:   var(--ease-standard) var(--duration-fast)
  Use for:      cancel booking dialogs, delete actions, admin bulk-delete, destructive confirmations
  Never use:    primary button slot — destructive is always secondary/ghost-tier in hierarchy
```

No outline buttons. No secondary filled buttons in customer flows.

---

#### Input Fields

**Text inputs and textareas:**
```
Default:   background: --bg-surface / border-bottom: 1px solid --border-subtle / no box border
Focus:     background: --bg-elevated / border-bottom: 1px solid --border-focus
           + focus-visible: box-shadow inset 0 0 0 1px --border-focus (keyboard fallback)
Error:     border-bottom: 1px solid --state-error
Label:     --text-ui-label (mixed-case, Inter) / --text-secondary / sits above field
Help text: --text-body-sm / --text-disabled
```

**Select, combobox, date picker:**
```
Default:   background: --bg-surface / border: 1px solid --border-subtle / radius: --radius-md
Focus:     border: 1px solid --border-focus / + focus-visible shadow as above
Reason:    These controls are inherently "container-like" — underline treatment is insufficient
```

**Textarea:**
```
Default:   background: --bg-surface / border: 1px solid --border-subtle / radius: --radius-md
Focus:     border: 1px solid --border-focus / + focus-visible shadow
```

**Payment fields:**
```
Container: background: --bg-surface / border: 1px solid --border-subtle / radius: --radius-md
Focus:     border: 1px solid --border-focus
Reason:    Payment field containers require clear visual boundaries for trust and accessibility
```

**Focus-visible rule:** The bottom-line treatment is the primary focus indicator for text inputs. If contrast testing shows it is insufficient on its own, the focus-visible inset shadow (`box-shadow: inset 0 0 0 1px var(--border-focus)`) is permitted as a reinforcement — not replacement.

---

#### Cards

```
Default:   background: --bg-surface / radius: --radius-lg (1rem)
           padding: --spacing-comfortable-x + --spacing-comfortable-y
Elevated:  background: --bg-elevated / shadow: --shadow-sm / radius: --radius-lg
Image:     radius: --radius-xl (1.5rem) / object-cover / full bleed to container edge
Empty:     background: --bg-surface / border: 1px dashed --border-subtle (explicit exception)
           radius: --radius-xl / centered content / min padding: --space-comfortable-3
```

No card dividers. Vertical space (`--spacing-comfortable-y`) separates internal sections.

---

#### Time Slots (Booking Flow)

```
Unselected: background: --bg-elevated / color: --text-primary / radius: --radius-md
            padding: 0.75rem 1rem
Selected:   background: --accent-primary / color: --text-on-accent / radius: --radius-md
Disabled:   background: --bg-inset / color: --text-disabled / opacity: 0.50
Hover:      border: 1px solid --border-interactive
Transition: var(--ease-standard) var(--duration-fast)
```

Time slots are buttons, not table cells. Padding must be generous enough for confident tap targets.

---

#### Badges / Status Chips

All badges: `--text-label-md` (Inter, all-caps, 0.10em tracking) / `--radius-sm` / no border.

| Status | Background | Text |
|---|---|---|
| `pending` | `--accent-subtle` | `--accent-primary` |
| `confirmed` | `--state-success-subtle` | `--state-success` |
| `cancelled` | `--state-error-subtle` | `--state-error` |
| `completed` | `--bg-elevated` | `--text-secondary` |
| `no-show` | `--bg-inset` | `--text-disabled` |
| `warning` | `--state-warning-subtle` | `--state-warning` |

---

#### Tabs

```
List:      background: --bg-inset / radius: --radius-md
Trigger:   color: --text-secondary → --text-primary on active
           no underline, no border indicator
Active:    background: --bg-elevated / color: --text-primary / radius: --radius-sm
Transition: var(--ease-standard) var(--duration-fast)
```

---

#### Sheets & Modals

```
Sheet:     background: --bg-overlay / shadow: --shadow-lg
           enters from right / no border
Modal:     background: --bg-overlay / shadow: --shadow-lg / radius: --radius-xl
           backdrop: --bg-dim at 60% opacity

Header (customer sheets):  Noto Serif display-md — reschedule, booking details, review
Header (admin sheets):     Inter title-lg — staff assignment, schedule edit, operational actions
```

---

### Admin Density Tier

Admin is one system, not a separate aesthetic. The density tier applies only to operational data surfaces.

**Comfortable tier (admin):** Stat cards, sidebar navigation, summary panels.
**Compact tier (admin):** Tables, schedules, filter bars, bulk-action bars, management lists.

```
Row height:        --spacing-compact-y padding
Body text:         --text-body-dense
Column headers:    --text-label-dense / --text-secondary / uppercase
Row hover:         --bg-hover wash (transient — not a permanent bg)
Selected row:      background: --accent-subtle / color: --text-primary
Row separator:     --border-muted (only where scanability requires it)
Table container:   --bg-inset
Sticky header:     background: --bg-inset / maintains compact height / shadow-sm on scroll
Bulk-action bar:   appears above table on row selection / --bg-elevated / --spacing-compact-y
                   compact height / ghost action buttons / dismiss on deselect
Action buttons:    ghost style preferred / compact size / icon-only supported in admin
```

---

## Section 4 — Page-by-Page Rollout Plan

### Phase Sequence

```
Phase 1A  →  Token system + primitive alignment (globals.css, layout.tsx)
Phase 1B  →  Auth pages (Login, Auth Error)
Phase 1C  →  Booking flow (Service selection, Booking form, Payment, Confirmation)
Phase 1D  →  Customer account (My Bookings)
Phase 1E  →  Staff / Admin dashboard
Phase 2   →  Landing page (deferred)
```

Each phase has a primary ownership boundary. Cross-phase shared files (`components/ui/*`, shared booking components, layout wrappers) may be touched only when required to support the current phase's locked patterns.

**Regression rule:** Until a page is explicitly redesigned, it must remain functionally usable even if visually incomplete. The shadcn bridge in Phase 1A enforces this.

**Token governance rule:** After Phase 1A ships, new tokens require written justification that the need cannot be satisfied by an existing semantic token.

---

### Phase 1A — Token System & Primitive Alignment

**Files:**
- `styles/globals.css` — full token replacement
- `app/layout.tsx` — Noto Serif + Inter via next/font, CSS variables applied

**Primitive alignment step (before page work begins):**
The following shared primitives must be verified against new tokens — not redesigned in isolation, but aligned enough that pages are not fighting old defaults:
`Button`, `Input`, `Card`, `Sheet`, `Tabs`, `Dialog`, `Table`, `Badge`

**Exit criterion:** All semantic tokens exist and resolve. Shadcn bridge is in place. Shared primitives are token-aligned (not redesigned). No page-specific redesign or new component variants introduced in this phase.

---

### Phase 1B — Auth Pages

**Files:** `app/login/`, `app/auth/error/`

**Patterns locked:**
- Page layout: centered card on `bg-base`
- Noto Serif `display-lg` page title
- `--text-ui-label` form labels, `--text-body-md` descriptions
- Input underline treatment + focus-visible halo
- Primary button: `accent-primary`, `radius-md`
- Error state: `state-error` token, inline message

**Exit criterion:** Login and auth error pages use only locked input, button, and error patterns. No old border or generic color tokens remain in these files.

---

### Phase 1C — Booking Flow

**Files:** `app/book/`, `app/payment/`, `app/booking-confirmed/`

**Patterns locked:**
- Step indicator: `label-lg` all-caps, tonal active state
- Service selection: card grid on `bg-base`, image containers `radius-xl`
- Booking form: date picker, time slot grid (slot component rules applied)
- Payment page: container-style input treatment for payment fields, booking summary panel
- Confirmation page: Noto Serif `display-lg` headline, `state-success` accent, summary on `bg-surface`

**Exit criterion:** Booking flow defines canonical step, slot, summary, and confirmation patterns. Every interactive component in the flow uses the locked token set only.

---

### Phase 1D — Customer Account

**Files:** `app/bookings/`, `components/booking/customer-bookings-client.tsx`, `components/booking/BookingCard.tsx`

**Patterns locked:**
- Page header: Noto Serif `display-lg`, `label-lg` eyebrow ("MY ACCOUNT")
- Tabs: `bg-inset` container, tonal active state, no underlines
- Booking cards: `bg-surface`, comfortable spacing, no dividers
- Status chips: full badge token set (all six statuses)
- Detail sheet: right-side, `bg-overlay`, Noto Serif header, timeline history
- Reschedule sheet: date input (container-style), time slot grid, confirm button
- Cancel dialog: `bg-overlay`, Inter body, destructive action
- Empty states: dashed border exception, serif headline, ghost CTA
- Waitlist cards: `bg-surface`, comfortable tier

**Exit criterion:** Customer bookings page defines canonical tabs, booking card, status chip, and sheet patterns. No old border or shadcn default tokens remain in owned files.

---

### Phase 1E — Staff / Admin Dashboard

**Files:** `app/admin/`, `app/dashboard/`, `app/staff/`, `components/dashboard/`

**Sub-surfaces:**
- **Comfortable tier:** Sidebar navigation, stat cards, summary panels — comfortable spacing, Inter titles, no Noto Serif
- **Compact tier:** Tables, schedules, filter bars, bulk-action bars, management lists — compact spacing, dense text tokens

**Patterns locked:**
- Sidebar: `bg-surface`, `title-md` nav labels, tonal active item
- Stat cards: `bg-surface`, comfortable spacing, `title-lg` for numbers
- Admin tables: `bg-inset` container, compact density, `border-muted` separators, `bg-hover` row wash, selected row state, sticky headers
- Bulk-action bar: `bg-elevated`, appears on row selection, compact height, ghost actions
- Filters and action bars: compact spacing, `label-dense` column headers, ghost buttons
- Admin sheets: Inter `title-lg` (no Noto Serif in operational flows)

**Exit criterion:** Admin defines canonical dense table, sidebar, filter/action bar, and admin sheet patterns. Comfortable and compact tier distinction is visibly implemented and consistent.

---

### Phase 2 — Landing Page (deferred)

**Files:** `components/landing/`, `app/page.tsx`

Inherits the full locked system from Phases 1A–1E. Adds editorial serif moments, asymmetric layouts, cinematic image containers, and hero sections. Designed after Phase 1E ships so the landing inherits a battle-tested system rather than one assembled speculatively.

**Exit criterion:** Landing uses only established tokens and components. No new product-side primitives or token additions introduced during Phase 2.

---

### Cross-Cutting Accessibility Gate

Every phase must pass these checks before sign-off. These are not audits — they are baseline requirements.

| Requirement | Rule |
|---|---|
| **Keyboard focus** | Focus state must be visually unmistakable on every interactive element. `--border-focus` inset shadow is the minimum standard. Do not ship a phase where any interactive element has no visible focus indicator. |
| **Touch targets** | Minimum 44×44px tap area for all buttons, time slots, and interactive cards. Comfortable-tier padding in customer flows must satisfy this by default. Compact-tier admin controls must be verified individually. |
| **Reduced motion** | All transitions and animations must respect `prefers-reduced-motion: reduce`. Wrap motion-dependent effects in a media query. Glassmorphism blur and slide-in sheets must fall back to instant/opacity-only transitions. |
| **Contrast** | Dark surface + light text combinations must meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI components). `--text-primary` (#f0eeeb) on `--bg-base` (#131313) passes. Verify `--text-secondary` and `--text-disabled` at point of use. |

---

### Rollout Summary

| Phase | Primary files | Patterns introduced |
|---|---|---|
| 1A | globals.css, layout.tsx | Full token + font system, primitive alignment |
| 1B | app/login/, app/auth/error/ | Form inputs, primary button, error states |
| 1C | app/book/, app/payment/, app/booking-confirmed/ | Step flow, time slots, payment fields, confirmation |
| 1D | app/bookings/, booking components | Tabs, booking cards, status chips, sheets |
| 1E | app/admin/, app/dashboard/, app/staff/ | Density tier, tables, sidebar, admin sheets |
| 2 | components/landing/, app/page.tsx | Editorial serif, hero, categories (inherits all above) |
