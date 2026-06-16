# mdsvr GitHub Pages

Landing page for [mdsvr](https://github.com/satoshiman/mdsvr) — zero config Markdown server.

## Files

```
gh-pages/
├── index.html   # Landing page (single file, no build step)
├── styles.css   # All styles (dark/light mode, responsive)
├── main.js      # Theme toggle, terminal animation, copy, scroll effects
└── README.md    # This file
```

## Deploy to GitHub Pages

### Option A — Dedicated `gh-pages` branch (recommended)

```bash
# From repo root
git subtree push --prefix gh-pages origin gh-pages
```

Then in GitHub → Settings → Pages:
- **Source**: Deploy from a branch
- **Branch**: `gh-pages` / `/ (root)`

Your site will be live at: `https://satoshiman.github.io/mdsvr/`

### Option B — `/docs` folder on `main`

```bash
# Copy gh-pages/ content to docs/ folder (already used by mdsvr for its own docs)
# Not recommended — conflicts with mdsvr's own docs folder
```

### Option C — GitHub Actions (auto deploy on push)

Create `.github/workflows/pages.yml`:

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
    paths: [gh-pages/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./gh-pages
```

Then push and it auto-deploys on every change to `gh-pages/`.

## Local Preview

Open `index.html` directly in browser, or serve with any static server:

```bash
npx serve gh-pages
# or
python3 -m http.server 8080 --directory gh-pages
```

## Customization

- **Accent color**: Change `--accent` in `styles.css` `:root`
- **npm badge counts**: Add real shields.io badges once package has downloads
- **Demo GIF/screenshot**: Add to `assets/` and reference in the hero section
- **Custom domain**: Add a `CNAME` file to `gh-pages/` with your domain (e.g. `mdsvr.dev`)
