# Contributing

## Setup

```bash
npm install
npx playwright install chromium
```

## Local workflow

```bash
npm run dev
npm run typecheck
npm run test
npm run build
```

## Project expectations

- Keep the JSON document model as the single source of truth.
- Avoid adding renderer-specific data paths that bypass normalization.
- Keep custom palettes capped at 64 entries for v1 compatibility.
- Add or update tests for any public API, renderer, or custom-element behavior change.
- Preserve browser support for modern evergreen browsers only.

## Release checklist

```bash
npm run release:check
```

Before tagging:

- update docs if public API changed
- confirm the demo still covers new behavior
- confirm `dist/pixelscript.min.js` is produced by `npm run build`
