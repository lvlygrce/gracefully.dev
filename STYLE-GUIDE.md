# Gracefully — Style Guide

The design system behind [gracefully.dev](https://gracefully.dev). Everything here is
implemented as CSS custom properties in [`style.css`](style.css).

> **There is a living version of this document at
> [gracefully.dev/style-guide.html](https://gracefully.dev/style-guide.html)** — same
> rules, but with real swatches, type specimens, texture samples and a pen you can make
> write again. Read that one if you want to *see* the system; read this one if you want to
> grep it.

---

## 1. Principles

1. **It should read like a page someone wrote, not a screen someone shipped.** Serif type,
   a measured column, paper that isn't quite flat, rules that wobble the way a hand
   wobbles.
2. **Warm before formal.** Given the correct move and the friendly one, take the friendly
   one — softer letterforms, rounder shapes, a little wonk.
3. **Light is the default.** The palette is designed light-first. Dark is a considered
   alternative offered by a toggle, never imposed by the operating system.
4. **Motion is arrival, not decoration.** Things settle once. The pen writes once and
   lifts. Nothing loops.
5. **One accent, used sparingly.** Green appears on the full stop, the ink, and hover. Its
   scarcity is the point.
6. **Never trade legibility for effect.** Every animation has a reduced-motion path; every
   interactive element keeps a visible focus ring.

---

## 2. No full caps

**Small uppercase letterspaced labels are banned.** Not discouraged — banned.

They read as generic system chrome: the house style of every AI-generated interface and
admin dashboard, and the exact opposite of a page someone wrote by hand. They also hurt
legibility at the small sizes they invite, and screen readers sometimes spell them out.

Subtitles, section labels, kickers, eyebrows, button text and meta lines are **always
sentence case**, and almost always set in Caveat, the handwriting face. If a label needs to
feel quieter, lower its contrast — never shrink it and shout it.

| | |
|---|---|
| ✗ | `SECTION LABEL` — uppercase, letterspaced, 12px, sans-serif |
| ✓ | *Section label* — sentence case, handwritten, ≥19px |

In practice: `text-transform: uppercase` appears nowhere in the stylesheet, and there is no
letterspacing token to reach for. If you find yourself wanting one, you want a different
component.

---

## 3. Colour

Tokens live on `:root` (light) and are overridden under `:root[data-theme="dark"]`. Never
hard-code a hex value in a component — add a token instead.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` | `#fbf7ef` | `#17150f` | Page background. Cream, never white. |
| `--paper-warm` | `#f5eee0` | `#1f1c14` | Cards, demo panels. |
| `--paper-sunk` | `#f1e9d9` | `#241f16` | Inline code, recessed surfaces. |
| `--ink` | `#241f1a` | `#f2ece0` | Body text. Warm, never pure black. |
| `--ink-muted` | `#6f6558` | `#a49a89` | Lede, labels, descriptions. |
| `--ink-faint` | `#a09585` | `#746a5c` | Decorative, `aria-hidden` text only. |
| `--rule` | `#ddd2bd` | `#3a3327` | Every wobbly hairline. |
| `--rule-strong` | `#c6b99f` | `#524936` | Hairlines under emphasis. |
| `--accent` | `#2b7d58` | `#86d0a4` | The full stop, the ink, hover, focus. |
| `--accent-wash` | `rgba(43,125,88,.10)` | `rgba(134,208,164,.11)` | Hover blob, selection. |
| `--blotch` | `rgba(198,176,132,.16)` | `rgba(120,100,62,.18)` | Paper mottling. |
| `--grain` | `0.05` | `0.07` | Grain overlay opacity. |

**Contrast.** `--ink` on `--paper` clears 14:1 in both themes. `--ink-muted` clears 4.5:1,
which is why every label that carries meaning uses it. `--ink-faint` does **not** clear
4.5:1 and is therefore restricted to decorative text that screen readers skip — the index
numbers, and nothing else.

---

## 4. Typography

Three families, one job each.

| Token | Family | Job |
|---|---|---|
| `--font-display` | Fraunces | Wordmarks, headings, app names. |
| `--font-text` | Newsreader | Body, lede, descriptions. |
| `--font-hand` | Caveat | Every label, number, and note in the margin. |

**Fraunces must always carry `font-variation-settings: "SOFT" 100, "WONK" 1`** plus
`font-optical-sizing: auto`. Those two axes are the difference between friendly and stately;
without them the site turns formal again.

**Caveat has a small x-height**, so it never goes below `--size-hand-sm` (`1.1875rem`).
Handwriting set small is just illegible handwriting.

Italic carries emphasis in the lede and descriptions. **Bold is not used anywhere.**

### Scale

| Token | Size | Used for |
|---|---|---|
| `--size-display` | `clamp(3.25rem, 11vw, 6rem)` | Wordmark |
| `--size-lede` | `clamp(1.1875rem, 2.4vw, 1.4375rem)` | Opening paragraph |
| `--size-entry` | `1.375rem` | App names |
| `--size-body` | `1.0625rem` | Body, descriptions |
| `--size-hand` | `1.375rem` | Labels, meta lines |
| `--size-hand-sm` | `1.1875rem` | Index numbers, colophon |

Line heights: `--leading-tight` (1.06) for display only, `--leading-snug` (1.4) for lede and
app names, `--leading-loose` (1.7) for body copy.

Body copy is capped at `--measure` (34rem, ~70 characters). Never let a paragraph run the
full `--page` width.

---

## 5. Texture

The page is never a flat fill. Three layers do the work, and **there is no fourth** —
resist adding one.

1. **Grain** — a fixed `feTurbulence` layer on `body::before` at `--grain` opacity,
   `pointer-events: none`, beneath all content.
2. **Blotch** — three soft radial gradients on `body::after` in `--blotch`, so the paper
   tone drifts across the page.
3. **The wobbly rule** — every hairline is one repeating SVG squiggle
   (`--wave-mask`), applied as a *mask* over a `--rule` background so it themes correctly.

**Plain `1px solid` borders are not used anywhere.** Use the `.rule-wave` class, or add
your selector to the shared pseudo-element rule in §4 of the stylesheet.

---

## 6. Motion

| Token | Value | Meaning |
|---|---|---|
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | Colour, opacity, small moves |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` | Arrivals and travel |
| `--ease-bounce` | `cubic-bezier(.34,1.56,.64,1)` | Anything that should feel springy |
| `--ease-pen` | `cubic-bezier(.5,.02,.35,1)` | The ink stroke |
| `--dur-fast` | `180ms` | Colour-only changes |
| `--dur` | `340ms` | Hover states |
| `--dur-slow` | `760ms` | Entrance reveals |
| `--dur-write` | `1700ms` | One pen stroke |

### The pen

A fountain pen draws an ink stroke, then lifts off the page.

```html
<div class="penstroke penstroke--swash reveal" style="--i:3" aria-hidden="true">
  <svg class="penstroke__svg" viewBox="0 0 420 46" fill="none">
    <path class="penstroke__ink" pathLength="1" d="M10 30 C 74 8 …" />
    <g class="penstroke__pen">…nib…</g>
  </svg>
</div>
```

- The ink path carries `pathLength="1"`, so `stroke-dasharray: 1` animating
  `stroke-dashoffset: 1 → 0` draws it with **no JavaScript** and no length measurement.
- The nib rides the identical path via CSS `offset-path`, with `offset-rotate: 0deg` so it
  stays at the angle a hand would hold it. Its tip sits at the group's `0,0`, which is what
  `offset-path` places on the line.
- **The `d` attribute and the `path()` in CSS must match exactly**, or the nib drifts off
  its own line. Each path is a variant: `.penstroke--swash`, `.penstroke--squiggle`.
- The pen fades in as it starts and out as it finishes (`pen-lift`) — it is never parked
  on the page.
- Browsers without CSS motion path get `.no-motionpath` on `<html>` from a feature check,
  which hides the nib. The ink still draws.

Use it sparingly: **one pen per page.** It is the loudest thing on the site.

### Arrivals

Add `.reveal` and an `--i` index to anything that should arrive:

```html
<p class="lede reveal" style="--i:4">…</p>
```

`--i` multiplies by 90ms to stagger. An `IntersectionObserver` adds `.is-in` once, then
stops watching. Two modifiers: `.reveal--display` (wordmarks only — slower, with a blur
that resolves) and `.reveal--rule` (draws the element's hairline in from the left).

### Hover choreography

An index row moves four things at once, all on `--dur`:

1. The number turns `--accent`.
2. The wobbly underline draws under the word — `scaleX(0 → 1)` on a masked pseudo-element,
   so it never reflows.
3. The arrow springs 5px right on `--ease-bounce`.
4. A soft `--accent-wash` blob scales in behind the row, bleeding `--space-xs` past the
   column on both sides.

The row itself shifts `padding-left`, so the text steps forward as the blob arrives.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` collapses every duration and delay to `0.01ms`,
forces reveals visible, drops the padding shift and the toggle wobble, and shows the
finished ink stroke with the pen hidden. **Any new animation must be accounted for in that
block.**

---

## 7. Space and shape

| Token | Value |
|---|---|
| `--space-2xs` | `0.375rem` |
| `--space-xs` | `0.75rem` |
| `--space-sm` | `1.25rem` |
| `--space-md` | `2rem` |
| `--space-lg` | `3.25rem` |
| `--space-xl` | `5rem` |

| Token | Value | Meaning |
|---|---|---|
| `--measure` | `34rem` | Reading column — the limit for any paragraph |
| `--page` | `42rem` | Page column — the outer content width |

**Corners.** `--radius-blob` sets four *different* radii on purpose — nothing here should
look stamped out by a machine. The theme toggle goes further, using percentage radii that
shift on hover so it wobbles like a drawn circle. Use `--radius-soft` only where an uneven
shape would read as a mistake.

---

## 8. Components

| Class | Notes |
|---|---|
| `.page` | The column. `max-width: var(--page)`, centred. |
| `.masthead__meta` | Handwritten kicker with a wobbly rule filling the remaining width. |
| `.wordmark` | Fraunces with soft + wonk. `.wordmark__mark` is the accented full stop. |
| `.penstroke` | The pen. See §6. One per page. |
| `.lede` | Opening paragraph, `--ink-muted`, capped at `--measure`. |
| `.section-label` | Handwritten, sentence case. **Never uppercase** — see §2. |
| `.entry` / `.entry__link` | A three-column grid: number, name, arrow. An optional `.entry__desc` sits on row two under the name. `.entry__name` uses `justify-self: start` so its underline tracks the word, not the column. |
| `.empty` | Italic note shown when the index is empty. Wrap the text in a `<span>` — the measure is capped on the span so the closing rule still spans the full column. |
| `.colophon` | Footer. Handwritten, space-between, wraps on narrow screens. |
| `.theme-toggle` | Fixed wobbly circle, top right. Swaps sun/moon by `[data-theme]`. |
| `.rule-wave` | A standalone wobbly hairline, for anywhere the shared pseudo-element doesn't reach. |

---

## 9. Theming

Light is the default in the truest sense: **`prefers-color-scheme` is never consulted.**
`data-theme="light"` is set in the HTML, and an inline `<head>` script — before first
paint, so there is no flash — replaces it with the stored preference if the visitor has
chosen dark. The choice persists in `localStorage` under `gracefully-theme`; every read and
write is wrapped in `try/catch` so blocked storage falls back to light.

---

## 10. Adding an app to the index

Edit the `apps` array near the bottom of [`index.html`](index.html):

```js
var apps = [
  { name: "Example", desc: "A one-line description.", url: "https://example.gracefully.dev" },
];
```

- `name` — title case, short.
- `desc` — one line, sentence case.
- `url` — absolute.

Numbering (`01`, `02`, …) is generated from array order; don't write it by hand. Entries
inherit the reveal stagger automatically. Commit and push to `main` — GitHub Pages
redeploys within a minute.

---

## 11. Adding a new page

1. Copy the `<head>` from [`404.html`](404.html) — it carries the font links, the
   stylesheet, the no-flash theme script and the motion-path check.
2. Wrap content in `<main class="page">`.
3. Reuse `.masthead__meta`, `.wordmark` and `.lede` for the header.
4. Add `.reveal` with sequential `--i` values to anything that should arrive.
5. Close with the `.colophon` footer.

Page-specific CSS goes in a `<style>` block on that page, built from existing tokens. If a
rule is needed on a second page, promote it to `style.css`.

---

## 12. Accessibility checklist

- Focus rings are a 2px `--accent` outline at 4px offset — never remove them.
- Decorative glyphs (arrows, index numbers, the pen) carry `aria-hidden="true"`.
- The theme toggle's `aria-label` describes the action it will perform, not its state.
- Sections are labelled with `aria-labelledby` pointing at their heading.
- Colour is never the only signal: hover adds motion and an underline, not just a hue.
- Labels that carry meaning use `--ink-muted` or darker. `--ink-faint` is decorative only.
