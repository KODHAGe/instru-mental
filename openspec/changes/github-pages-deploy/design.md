## Context

instru-mental is a Vite + TypeScript application with no existing CI or deployment setup. The build command (`tsc && vite build`) outputs static assets to `dist/`. We want to publish that output to GitHub Pages on every push to `main`, with no manual steps.

GitHub Pages supports two source modes: serving from a branch (e.g. `gh-pages`) or serving via a GitHub Actions deployment. The Actions-based approach is preferred — it avoids committing build artifacts to the repo and integrates cleanly with the modern Pages API.

## Goals / Non-Goals

**Goals:**
- Automated deployment to GitHub Pages on every push to `main`
- Asset paths resolve correctly under the `/<repo>/` sub-path
- Minimal, auditable workflow file with scoped permissions

**Non-Goals:**
- Preview deployments for pull requests
- Environment-specific builds (staging vs production)
- Custom domain configuration (can be added later via `CNAME`)
- Caching/optimisation of `node_modules` between runs (nice-to-have, out of scope)

## Decisions

### D1: Use GitHub Actions Pages deployment (not `gh-pages` branch)

**Choice:** Use the official `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` actions to deploy directly from the workflow.

This keeps build artifacts out of the git history, uses OIDC for auth (no tokens to rotate), and is the current GitHub-recommended approach.

**Alternatives considered:**
- *`gh-pages` npm package pushing to a branch* — requires a personal access token or deploy key; pollutes git log with build commits.
- *Serve from `docs/` folder on `main`* — requires committing built output, is harder to automate cleanly.

---

### D2: Set Vite `base` to `/<repo>/` via an environment variable

**Choice:** Set `base: process.env.VITE_BASE_PATH ?? '/'` in `vite.config.ts`. The workflow sets `VITE_BASE_PATH=/<repo-name>/` as an environment variable during the build step.

This lets local development continue to work with `base: '/'` (no env var set) while producing correct sub-path URLs in CI.

**Alternatives considered:**
- *Hardcode `base: '/instru-mental/'` in config* — works but ties the config to the repository name; breaks if the repo is renamed or self-hosted at a root domain.
- *Use `actions/configure-pages` `base_path` output* — cleaner, but requires reading the action output into an env var anyway; the explicit env var approach is equally portable and easier to read.

---

### D3: Concurrency group to cancel stale deployments

**Choice:** Add a `concurrency` block with `group: pages` and `cancel-in-progress: true` so that a rapid sequence of pushes doesn't queue multiple deployments.

This is a GitHub Pages best practice to avoid race conditions on the Pages endpoint.

## Risks / Trade-offs

- **[Sub-path breakage]** If the repo is served at a root domain (custom domain), `VITE_BASE_PATH` must be changed to `/`. Mitigation: document in README; the env var approach makes this a one-line workflow change.
- **[First-time Pages setup]** The repository Pages source must be set to "GitHub Actions" in Settings → Pages before the first deploy succeeds. Mitigation: note in tasks; cannot be automated via workflow.
- **[Build time]** Cold install + build on every push may take ~60–90 s. Mitigation: acceptable for now; `node_modules` caching can be added later.

## Migration Plan

1. Create `vite.config.ts` with `base` env var support
2. Add `.github/workflows/deploy.yml`
3. In repository Settings → Pages, set source to **GitHub Actions**
4. Push to `main` and verify deployment succeeds
