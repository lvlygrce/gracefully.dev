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

## Files

| File | Purpose |
|------|---------|
| `index.html` | The index page |
| `404.html` | Custom not-found page, served by GitHub Pages |
| `style.css` | The design system — tokens, components, motion |
| `style-guide.html` | The living style guide, at [/style-guide.html](https://gracefully.dev/style-guide.html) |
| `STYLE-GUIDE.md` | The same rules in writing, for grepping |
| `CNAME` | Tells GitHub Pages the custom domain is `gracefully.dev` |

## Working on it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a server rather than opening the file directly —
`style.css` is referenced from the site root.

## Design

See **[STYLE-GUIDE.md](STYLE-GUIDE.md)** — or the living version at
**[gracefully.dev/style-guide.html](https://gracefully.dev/style-guide.html)** — before
changing anything visual.

The one rule worth repeating here: **no full-caps letterspaced labels, anywhere.**
