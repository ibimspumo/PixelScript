# PixelScript

PixelScript is a TypeScript-authored JavaScript library for programmable pixel art and animations. It keeps one canonical JSON document model at the center, then fans that source into:

- JavaScript APIs
- inline HTML via `<pixel-art>`
- SVG, PNG, GIF, and Canvas rendering
- shareable JSON documents

## Install

```bash
npm install @pumo/pixelscript
```

The package is configured for the scoped npm name `@pumo/pixelscript` so the release flow does not depend on the previously unpublished unscoped `pixelscript` package.

## Core idea

PixelScript stores pixel art as a compact Base64-indexed string plus dimensions and palette metadata.

```json
{
  "version": 1,
  "width": 2,
  "height": 2,
  "palette": { "kind": "default64", "name": "PixelScript-64" },
  "frames": [{ "pixels": "ABAB" }]
}
```

- `A` is palette index `0`, reserved for transparency
- `B` is palette index `1`, the first visible color in the default palette
- the default palette contains 64 slots including transparency

## JavaScript usage

```js
import { createArt, renderSVG, renderPNG } from '@pumo/pixelscript';

const art = createArt({
  width: 2,
  height: 2,
  pixels: [0, 1, 0, 1]
});

const svg = renderSVG(art, { scale: 24 });
const png = await renderPNG(art, { scale: 24 });
```

## Animation usage

```js
import { createAnimation, mountPixelArt } from '@pumo/pixelscript';

const animation = createAnimation({
  width: 2,
  height: 2,
  frames: [
    { pixels: [0, 1, 0, 1], durationMs: 120 },
    { pixels: [1, 0, 1, 0], durationMs: 120 }
  ],
  animation: {
    fps: 8,
    loop: true
  }
});

const controller = mountPixelArt(document.querySelector('#target'), animation, {
  render: 'canvas',
  scale: 24
});

controller.play({ iterations: 2 });
```

## Custom element usage

```html
<script src="pixelscript.min.js"></script>

<pixel-art
  render="svg"
  scale="20"
  data='{"version":1,"width":2,"height":2,"palette":{"kind":"default64","name":"PixelScript-64"},"frames":[{"pixels":"ABAB"}]}'
></pixel-art>
```

The standalone bundle auto-registers `<pixel-art>`. Module usage can register explicitly:

```js
import { registerPixelArtElement } from '@pumo/pixelscript/element';

registerPixelArtElement();
```

## Public API

- `createArt(input)`
- `createAnimation(input)`
- `parseDocument(json)`
- `stringifyDocument(doc)`
- `parseCompact({ width, height, pixels, palette? })`
- `fromArray({ width, height, pixels, palette? })`
- `getDefaultPalette()`
- `definePalette({ name?, colors })`
- `validatePalette(palette)`
- `renderSVG(doc, options)`
- `renderCanvas(doc, options)`
- `renderPNG(doc, options)`
- `renderGIF(doc, options)`
- `renderDataURL(doc, options)`
- `mountPixelArt(target, doc, options)`
- `registerPixelArtElement()`

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

## Docs and examples

- Demo/docs app: built from [`demo/main.ts`](/Users/timocorvinus/Desktop/PixelScript/demo/main.ts)
- JSON schema: [`schema/pixelscript.schema.json`](/Users/timocorvinus/Desktop/PixelScript/schema/pixelscript.schema.json)
- Example documents: [`examples/checker.json`](/Users/timocorvinus/Desktop/PixelScript/examples/checker.json), [`examples/comet.json`](/Users/timocorvinus/Desktop/PixelScript/examples/comet.json)

## License

MIT
