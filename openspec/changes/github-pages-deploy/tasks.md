## 1. Vite Configuration

- [x] 1.1 Create `vite.config.ts` at the project root with `base: process.env['VITE_BASE_PATH'] ?? '/'`

## 2. GitHub Actions Workflow

- [x] 2.1 Create `.github/workflows/deploy.yml` with a `deploy` job that triggers on push to `main`
- [x] 2.2 Add `concurrency` group `pages` with `cancel-in-progress: true` to the workflow
- [x] 2.3 Add workflow-level permissions: `contents: read`, `pages: write`, `id-token: write`
- [x] 2.4 Add a `build` job step: checkout → setup Node → `npm ci` → `npm run build` with `VITE_BASE_PATH` set to the repository sub-path
- [x] 2.5 Add `actions/configure-pages` step to the build job
- [x] 2.6 Add `actions/upload-pages-artifact` step pointing at `dist/` to the build job
- [x] 2.7 Add a `deploy` job that depends on `build`, uses `actions/deploy-pages`, and sets `environment: github-pages`

## 3. Repository Setup

- [ ] 3.1 In GitHub repository Settings → Pages, set the source to **GitHub Actions**

## 4. Verification

- [ ] 4.1 Push to `main` and confirm the workflow runs green in the Actions tab
- [ ] 4.2 Open the published GitHub Pages URL and confirm the app loads without asset 404s
