## Why

The app has no deployment pipeline — it only runs locally. Adding a GitHub Pages deployment config and CI workflow lets anyone access the live app via a public URL and keeps it automatically up to date on every push to `main`.

## What Changes

- Add a GitHub Actions workflow that runs `npm run build` on each push to `main` and publishes the output to GitHub Pages
- Add Vite base-path configuration so asset URLs resolve correctly when served from the repository sub-path on `github.io`
- Configure the repository to use GitHub Pages from the `gh-pages` branch (or the `docs/` folder) — using the Actions deployment method

## Capabilities

### New Capabilities

- `ci-deploy`: GitHub Actions workflow that builds the Vite app and deploys it to GitHub Pages on every push to `main`

### Modified Capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

- **New file**: `.github/workflows/deploy.yml`
- **Modified**: `vite.config.ts` (or `vite.config.js`) — add `base` option for the GitHub Pages sub-path; file may need to be created if it doesn't already exist
- **No runtime code changes** — only build tooling and CI configuration
- **Dependency**: GitHub Pages must be enabled in the repository settings (Actions deployment source)
