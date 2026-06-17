# mdsvr GitHub Pages

Landing page for [mdsvr](https://github.com/satoshiman/mdsvr) — zero config Markdown server.

## Files

```
gh-pages/
├── index.html   # Landing page
├── styles.css   # All styles (dark/light mode, responsive)
├── main.js      # Theme toggle, terminal animation, copy, scroll effects
├── docs/        # Generated documentation (from docs/ folder)
└── README.md    # This file
```

## Deploy to GitHub Pages

### 1. Generate documentation

```bash
npm run docs:generate
```

This exports the static site from `docs/` to `gh-pages/docs/`.

### 2. Push to gh-pages branch

```bash
git add gh-pages/
git commit -m "Update generated docs"
git subtree push --prefix gh-pages origin gh-pages
```

### 3. GitHub Pages Settings

Go to **Settings → Pages**:

- **Source**: Deploy from a branch
- **Branch**: `gh-pages` / `/ (root)`

Site will be live at: `https://satoshiman.github.io/mdsvr/`

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
