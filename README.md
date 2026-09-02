# Gracefully

A home for gracefully developed apps by Grace P — live at **[gracefully.dev](https://gracefully.dev)**.

A warm, page-like index: light by default, serif throughout, textured paper, wobbly
hand-drawn rules, and a fountain pen that signs the masthead on arrival. Static HTML and
CSS, no build step, served by GitHub Pages from `main`.

## Adding an app to the index

Edit the `apps` array near the bottom of `index.html`:

```js
var apps = [
  { name: "Example", desc: "A one-line description.", url: "https://example.gracefully.dev" },
];
```

Commit and push to `main`. Pages redeploys automatically within a minute or so.
Numbering and entrance animation are generated — don't write them by hand.

## Adding an app itself

Apps live in their own folder off the root (`riftle/`, and so on) and are served at
`/<folder>/`. Each one loads the shared `/style.css` first, then its own stylesheet for
whatever it adds — never a second copy of the design system. Link back to `/` from its
colophon, then add it to the `apps` array above.

**One app deliberately breaks that rule.** `bts-album-match/` is a Spotify pastiche —
dark, Figtree, Spotify green — because the look *is* the puzzle: the page reads as an
album page with the title taken out. It is self-contained, shares nothing with
`/style.css`, and carries only a back-link to tie it to the site. Do not "fix" it into
the house style, and do not treat it as a precedent.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The index page |
| `404.html` | Custom not-found page, served by GitHub Pages |
| `style.css` | The design system — tokens, components, motion |
| `STYLE-GUIDE.md` | **The style guide** — read before changing anything visual |
| `CNAME` | Tells GitHub Pages the custom domain is `gracefully.dev` |
| `riftle/` | **Riftle** — a daily League of Legends word game, at [/riftle/](https://gracefully.dev/riftle/) |
| `wardle/` | **Wardle** — a daily champion-kit deduction game, at [/wardle/](https://gracefully.dev/wardle/) |
| `bts-album-match/` | **BTS Album Match** — an album guessing game in Spotify's clothes, at [/bts-album-match/](https://gracefully.dev/bts-album-match/) |

## Working on it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a server rather than opening the file directly —
`style.css` is referenced from the site root.

## Design

See **[STYLE-GUIDE.md](STYLE-GUIDE.md)** before changing anything visual. It covers the
palette, the three typefaces, the texture layers, the pen, and the motion system.

The one rule worth repeating here: **no full-caps letterspaced labels, anywhere.**

The style guide is documentation, not a page — it lives in the repo and is deliberately
not published to the site.
