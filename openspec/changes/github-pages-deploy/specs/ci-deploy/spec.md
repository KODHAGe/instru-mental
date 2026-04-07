## ADDED Requirements

### Requirement: App builds and deploys to GitHub Pages on push to main
On every push to the `main` branch, the CI system SHALL build the Vite application and publish the output to GitHub Pages using the GitHub Actions deployment mechanism.

#### Scenario: Push to main triggers deployment
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the `deploy` GitHub Actions workflow SHALL trigger and build the app with `npm run build`

#### Scenario: Build output is published to GitHub Pages
- **WHEN** the build succeeds
- **THEN** the `dist/` output directory SHALL be deployed to GitHub Pages and accessible at the repository's GitHub Pages URL

#### Scenario: Build failure prevents deployment
- **WHEN** `npm run build` exits with a non-zero code
- **THEN** the deployment step SHALL NOT run and the workflow SHALL fail visibly

---

### Requirement: Assets resolve correctly under the GitHub Pages sub-path
When served from a GitHub Pages repository URL (e.g. `https://<user>.github.io/<repo>/`), all JavaScript and CSS asset references SHALL resolve correctly.

#### Scenario: Vite base path is set for sub-path hosting
- **WHEN** the app is built for production
- **THEN** all asset URLs in the HTML output SHALL be prefixed with the repository name sub-path so they load correctly from `/<repo>/`

---

### Requirement: Workflow uses least-privilege permissions
The GitHub Actions workflow SHALL request only the permissions required for Pages deployment and OIDC token exchange.

#### Scenario: Workflow permissions are scoped
- **WHEN** the deploy workflow runs
- **THEN** it SHALL declare `contents: read`, `pages: write`, and `id-token: write` permissions and no others
