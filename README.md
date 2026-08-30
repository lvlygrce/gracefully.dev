# Gracefully

A home for gracefully developed apps by Grace Piddington &mdash; live at **[gracefully.dev](https://gracefully.dev)**.

## What this is

A single static `index.html` (no build step) served by GitHub Pages from the `main` branch.

## Adding an app to the list

Edit the `apps` array near the bottom of `index.html`:

```js
const apps = [
  { name: "Example", desc: "A one-line description.", url: "https://example.gracefully.dev" },
];
```

Commit and push to `main`. GitHub Pages redeploys automatically within a minute or so.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole site |
| `404.html`   | Custom not-found page (served by GitHub Pages) |
| `CNAME`      | Tells GitHub Pages the custom domain is `gracefully.dev` |
