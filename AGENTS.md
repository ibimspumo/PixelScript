# AGENTS

## Project

- Name: `PixelScript`
- Repo: `ibimspumo/PixelScript`
- npm package: `@ibimspumo/pixelscript`
- Default branch: `main`
- Demo/Pages URL: `https://ibimspumo.github.io/PixelScript/`

## Local Verification

Run these before pushing release-related changes:

```bash
npm run typecheck
npm test
npm run build
npm run release:check
```

## Build Outputs

- Library ESM entry: `dist/index.js`
- Element subpath: `dist/element/register.js`
- Standalone browser bundle: `dist/pixelscript.min.js`
- Demo/docs build: `dist/demo`

## GitHub Actions

### CI

- Workflow file: `.github/workflows/ci.yml`
- Trigger: every push and PR
- Responsibilities:
  - install dependencies
  - install Playwright Chromium
  - typecheck
  - run unit and browser tests
  - build the project
  - upload `dist/pixelscript.min.js` as artifact

### Pages

- Workflow file: `.github/workflows/pages.yml`
- Trigger: pushes to `main`
- GitHub Pages is configured in `workflow` mode
- The workflow builds the demo with `BASE_PATH=/PixelScript/`
- The deploy artifact path is `dist/demo`

### Release

- Workflow file: `.github/workflows/release.yml`
- Trigger: tags matching `v*`
- Current release order:
  1. install
  2. build
  3. `npm pack --dry-run`
  4. `npm publish --access public`
  5. create/update GitHub Release
- The workflow intentionally publishes to npm before creating the GitHub release, so a failed npm publish does not leave behind a misleading new release entry.

## GitHub Secrets

- `NPM_TOKEN` is currently required by `.github/workflows/release.yml`
- The release workflow publishes with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
- Keep a local npm token only for manual debugging or private dependency installs if needed

## npm Notes

- The package publishes under the npm organization scope `@ibimspumo/pixelscript`
- The GitHub repository owner is also `ibimspumo`, which matches npm trusted publisher setup cleanly
- The first manual publish of `@ibimspumo/pixelscript@0.1.1` succeeded and created the package on npm
- Before future releases, verify availability with:

```bash
npm view @ibimspumo/pixelscript version --json
```

If the package is not yet published, npm returns `E404`, which is expected before the first successful publish.

## Release Workflow

For a new release:

1. update version in `package.json` and `package-lock.json`
2. run local verification
3. push `main`
4. create and push a tag like `v0.1.2`
5. watch:

```bash
gh run list -R ibimspumo/PixelScript --limit 10
gh release view v0.1.2 -R ibimspumo/PixelScript
```

## Important History

- `v0.1.0` was removed because the early release workflow and Pages setup were not final
- `v0.1.1` has a GitHub release entry and should be treated as the first real release candidate in GitHub
- `@ibimspumo/pixelscript@0.1.1` is the first successful npm release
- npm Trusted Publishing should be configured on npmjs.com for package `@ibimspumo/pixelscript` with:
  - Organization or user: `ibimspumo`
  - Repository: `PixelScript`
  - Workflow filename: `release.yml`
  - Environment name: leave empty unless the workflow is later bound to a GitHub Environment
- If a future npm publish must be retried, prefer cutting a fresh patch version instead of mutating an already-used tag

## Operational Notes

- Do not commit tokens or secrets into the repository
- Keep local shell env and GitHub secrets separate from repo-tracked files
- If GitHub Pages ever flips back to branch-based `/docs`, switch it back to workflow mode; the current deployment source of truth is the Pages workflow, not a committed `docs/` directory
