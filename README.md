# Gracefully

A home for gracefully developed apps by Grace P — live at **[gracefully.dev](https://gracefully.dev)**.

An editorial, page-like index: light by default, serif throughout, with a dark theme
behind a toggle. Static HTML and CSS, no build step, served by GitHub Pages from `main`.

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
| `STYLE-GUIDE.md` | What every token is for, and how to add pages |
| `CNAME` | Tells GitHub Pages the custom domain is `gracefully.dev` |

## Working on it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a server rather than opening the file directly —
`style.css` is referenced from the site root.

## Design

See **[STYLE-GUIDE.md](STYLE-GUIDE.md)** before changing anything visual.
