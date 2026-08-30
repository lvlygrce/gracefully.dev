# Gracefully — Style Guide

The visual system behind [gracefully.dev](https://gracefully.dev). Everything here is
implemented as CSS custom properties in [`style.css`](style.css); this document explains
what each token is *for*, so new pages stay part of the same publication.

---

## 1. Principles

1. **It should read like a page, not a dashboard.** Serif type, a single measured column,
   generous margins, horizontal rules that behave like printed rules.
2. **Light is the default.** The palette is designed light-first. Dark is a considered
   alternative, offered by a toggle — never imposed by the operating system.
3. **Motion is arrival, not decoration.** Things settle into place once. Nothing loops,
   bounces, or competes for attention.
4. **One accent, used sparingly.** Green appears on the wordmark's full stop, on hover, and
   nowhere else. Its scarcity is what makes it work.
5. **Never sacrifice legibility for effect.** Every animation has a reduced-motion path and
   every interactive element has a visible focus ring.

---

## 2. Colour

Tokens are defined on `:root` (light) and overridden under `:root[data-theme="dark"]`.
Never hard-code a hex value in a component — add a token instead.

### Light (default)

| Token | Value | Used for |
|---|---|---|
| `--paper` | `#faf8f4` | Page background. Warm off-white, not pure white. |
| `--paper-sunk` | `#f2efe7` | Recessed surfaces. Reserved; unused so far. |
| `--ink` | `#16150f` | Body text. Warm near-black, never `#000`. |
| `--ink-muted` | `#6b665a` | Lede, descriptions, secondary text. |
| `--ink-faint` | `#9c968a` | Meta labels, entry numbers, colophon. |
| `--rule` | `#e0dcd2` | Hairlines between entries and under labels. |
| `--rule-strong` | `#c9c4b7` | Hairlines on hover. |
| `--accent` | `#2d6a4a` | The full stop, hover states, focus rings. |
| `--accent-wash` | `rgba(45,106,74,.07)` | Row hover background, text selection. |
| `--grain` | `0.035` | Opacity of the paper-grain overlay. |

### Dark

| Token | Value |
|---|---|
| `--paper` | `#121210` |
| `--paper-sunk` | `#1a1a17` |
| `--ink` | `#ecebe4` |
| `--ink-muted` | `#97928a` |
| `--ink-faint` | `#6d6960` |
| `--rule` | `#2a2924` |
| `--rule-strong` | `#3d3b34` |
| `--accent` | `#7fc9a2` |
| `--accent-wash` | `rgba(127,201,162,.09)` |
| `--grain` | `0.05` |

**Contrast.** `--ink` on `--paper` exceeds 15:1 in both themes. `--ink-muted` clears 4.5:1
(normal text). `--ink-faint` is only ever used at meta size on non-essential text, and is
never the sole carrier of meaning. Accent-on-paper clears 4.5:1 in both themes.

---

## 3. Typography

Three families, each with one job.

| Token | Family | Job |
|---|---|---|
| `--font-display` | Instrument Serif | The wordmark and page headings. High contrast, quiet. |
| `--font-text` | Newsreader | Body, lede, entry names, descriptions. |
| `--font-meta` | System sans | Uppercase labels, numbers, arrows, the colophon. |

Loaded from Google Fonts with `display=swap`; the fallback stack is Iowan Old Style →
Georgia → serif, which is metrically close enough that swap is not jarring.

### Scale

| Token | Size | Used for |
|---|---|---|
| `--size-display` | `clamp(3.25rem, 11vw, 6rem)` | Wordmark |
| `--size-lede` | `clamp(1.125rem, 2.4vw, 1.375rem)` | Opening paragraph |
| `--size-entry` | `1.3125rem` | App names |
| `--size-body` | `1.0625rem` | Body, descriptions |
| `--size-meta` | `0.75rem` | Labels, numbers, colophon |

### Line height and tracking

| Token | Value | Used for |
|---|---|---|
| `--leading-tight` | `1.02` | Display type only |
| `--leading-snug` | `1.35` | Lede, entry names |
| `--leading-loose` | `1.65` | Body copy |
| `--tracking-meta` | `0.16em` | Uppercase meta labels — always letterspace uppercase |

### Rules of thumb

- Uppercase meta labels are always `--font-meta`, `600`, letterspaced, and `--ink-faint`.
- Italic carries emphasis in the lede and descriptions; bold is not used anywhere.
- Body copy is capped at `--measure` (34rem, ~70 characters). Never let a paragraph run
  the full `--page` width.

---

## 4. Space

A named scale, not a numeric one — pick by role, not by size.

| Token | Value |
|---|---|
| `--space-2xs` | `0.375rem` |
| `--space-xs` | `0.75rem` |
| `--space-sm` | `1.25rem` |
| `--space-md` | `2rem` |
| `--space-lg` | `3.25rem` |
| `--space-xl` | `5rem` |

### Measures

| Token | Value | Meaning |
|---|---|---|
| `--measure` | `34rem` | Reading column — the limit for any paragraph |
| `--page` | `42rem` | Page column — the outer content width |

Top padding on `.page` is `clamp(3.5rem, 14vh, 8rem)`: the masthead sits low on tall
screens and stays reachable on short ones.

---

## 5. Motion

| Token | Value | Meaning |
|---|---|---|
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | Default — colour, opacity, small moves |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` | Arrivals and travel — decisive, no overshoot |
| `--dur-fast` | `180ms` | Colour-only changes |
| `--dur` | `340ms` | Hover states |
| `--dur-slow` | `760ms` | Entrance reveals |

### The reveal pattern

Add `.reveal` and a `--i` index to any element that should arrive:

```html
<p class="lede reveal" style="--i:3">…</p>
```

`--i` multiplies by `90ms` to stagger the sequence. An `IntersectionObserver` adds `.is-in`
when the element enters the viewport, then stops observing it — reveals happen once.

Two modifiers:

- `.reveal--display` — slower, with an `8px` blur that resolves. **Wordmarks only.**
- `.reveal--rule` — animates the element's `::after` hairline from `scaleX(0)`, drawing it
  left to right. Used on `.masthead__meta` and `.section-label`.

### Hover choreography

An entry row moves four things at once, all on `--dur`:

1. The number turns `--accent`.
2. The name draws a 1px underline left→right (a `background-size` transition, so it never
   reflows).
3. The arrow slides `4px` right.
4. A `--accent-wash` panel fades in, bleeding `--space-xs` past the column on both sides.

The row itself shifts `padding-left` from `--space-2xs` to `--space-sm`, so the text steps
forward as the wash arrives.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` collapses every duration and delay to `0.01ms`,
forces all `.reveal` elements visible, and removes the padding shift and toggle rotation.
**Any new animation must be accounted for in that block.**

---

## 6. Components

| Class | Notes |
|---|---|
| `.page` | The column. `max-width: var(--page)`, centred. |
| `.masthead__meta` | Uppercase kicker with a rule that fills the remaining width. |
| `.wordmark` | Display type. `.wordmark__mark` is the accented full stop. |
| `.lede` | Opening paragraph, `--ink-muted`, capped at `--measure`. |
| `.section-label` | Same construction as `.masthead__meta`, at `600` weight. |
| `.entry` / `.entry__link` | A three-column grid: number, name, arrow. An optional `.entry__desc` sits on row two under the name. `.entry__name` uses `justify-self: start` so its hover underline tracks the word, not the column. |
| `.empty` | Italic editorial note shown when the index is empty. Wrap the text in a `<span>` — the measure is capped on the span so the closing rule still spans the full column. |
| `.colophon` | Footer. Meta type, space-between, wraps on narrow screens. |
| `.theme-toggle` | Fixed circle, top right. Rotates `-18°` on hover; swaps sun/moon by `[data-theme]`. |

### The paper grain

`body::before` is a fixed, `pointer-events: none` layer carrying an inline SVG
`feTurbulence` at `--grain` opacity. All page content sits at `z-index: 1` above it.
It is the only texture in the system — do not add another.

---

## 7. Theming

Light is the default in the truest sense: `prefers-color-scheme` is **not** consulted.
`data-theme="light"` is set in the HTML, and an inline `<head>` script — before first
paint, so there is no flash — replaces it with the stored preference if the visitor has
chosen dark. The choice persists in `localStorage` under `gracefully-theme`; every read
and write is wrapped in `try/catch` so blocked storage falls back to light.

---

## 8. Adding an app to the index

Edit the `apps` array near the bottom of [`index.html`](index.html):

```js
var apps = [
  { name: "Example", desc: "A one-line description.", url: "https://example.gracefully.dev" },
];
```

- `name` — title case, short.
- `desc` — one line, sentence case, no trailing full stop needed.
- `url` — absolute.

Numbering (`01`, `02`, …) is generated from array order; don't write it by hand. Entries
inherit the reveal stagger automatically. Commit and push to `main` — GitHub Pages
redeploys within a minute.

---

## 9. Adding a new page

1. Copy the `<head>` from [`404.html`](404.html) — it carries the font links, the
   stylesheet, and the no-flash theme script.
2. Wrap content in `<main class="page">`.
3. Reuse `.masthead__meta`, `.wordmark`, and `.lede` for the header.
4. Add `.reveal` with sequential `--i` values to anything that should arrive.
5. Close with the `.colophon` footer.

Page-specific CSS goes in a `<style>` block on that page, built from existing tokens.
If a rule is needed on a second page, promote it to `style.css`.

---

## 10. Accessibility checklist

- Focus rings are a 2px `--accent` outline at 3px offset — never remove them.
- Decorative glyphs (arrows, numbers, icons) carry `aria-hidden="true"`.
- The theme toggle's `aria-label` updates to describe the action it will perform.
- Sections are labelled with `aria-labelledby` pointing at their heading.
- Colour is never the only signal: hover adds motion and an underline, not just a hue.
