import './styles.css';

import {
  BASE64_CHARSET,
  createAnimation,
  createArt,
  definePalette,
  fromArray,
  getDefaultPalette,
  mountPixelArt,
  parseCompact,
  parseDocument,
  parseHexColor,
  registerPixelArtElement,
  renderCanvas,
  renderDataURL,
  renderGIF,
  renderPNG,
  renderSVG,
  stringifyDocument,
  validateDocument
} from '@/index';
import type { PixelScriptDocument } from '@/schema/types';

registerPixelArtElement();

type GalleryKind = 'art' | 'animation';

type GalleryItem = {
  id: string;
  title: string;
  kind: GalleryKind;
  document: PixelScriptDocument;
  emphasis?: boolean;
};

type ApiAction = {
  id: string;
  title: string;
  description: string;
  language: 'js' | 'json' | 'markup';
  snippet: string;
  build: () => PixelScriptDocument;
  run: (document: PixelScriptDocument) => Promise<string>;
};

type RuntimePixelArt = HTMLElement & {
  play: (iterations?: number | 'infinite') => void;
  pause: () => void;
  stop: () => void;
  seek: (frameIndex: number) => void;
  setPixels: (updates: Array<{ x: number; y: number; paletteIndex: number }>, frameIndex?: number) => void;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root for demo.');
}

const version = '0.1.7';
const exampleDocumentPath = `${import.meta.env.BASE_URL}examples/comet.json`;
const defaultPalette = getDefaultPalette();
const neonPalette = definePalette({
  name: 'Neon Night',
  colors: [
    null,
    '#090f1f',
    '#0f2459',
    '#1848bf',
    '#0fd6ff',
    '#14ffe5',
    '#00c47f',
    '#2bff70',
    '#ffea47',
    '#ffba2e',
    '#ff6f32',
    '#ff2f73',
    '#b81bfc',
    '#3e00f8',
    '#09002a',
    '#00f4ff'
  ]
});

const compactCharsetMarkup = BASE64_CHARSET.split('')
  .map((character) => `<span class="charset-cell">${character}</span>`)
  .join('');

const heroDocument = createAnimation({
  width: 18,
  height: 18,
  frames: buildOrbitalFrames(18, 18, 3).map((pixels, index) => ({
    pixels,
    durationMs: 90 + index * 8
  })),
  animation: {
    fps: 11,
    loop: true
  },
  palette: neonPalette,
  meta: {
    name: 'Hero Orbital'
  }
});

const inlineDocument = createArt({
  width: 8,
  height: 8,
  pixels: createStaticPattern(8, 8, 11, 7),
  meta: {
    name: 'Inline Demo'
  }
});

const glyphDocument = createAnimation({
  width: 16,
  height: 16,
  frames: buildSignalFrames(16, 16),
  animation: {
    fps: 9,
    loop: true
  },
  palette: neonPalette,
  meta: {
    name: 'Signal Glyph'
  }
});

const checkerDocument = createArt({
  width: 4,
  height: 4,
  pixels: 'ABABBABAABABBABA',
  meta: {
    name: 'Checker'
  }
});

const featureCards = [
  {
    title: 'Ein Dokumentmodell',
    description: 'Canvas, SVG, PNG, GIF und Runtime-Mounting laufen auf derselben Document-Struktur.'
  },
  {
    title: 'Direkte Interaktion',
    description: 'Pixel-Events, Hold-Delay, Paint-Mutationen und Runtime-Kontrolle sind live eingebaut.'
  },
  {
    title: 'Landingpage + Demo',
    description: 'V2 kombiniert Produktseite, Playground, API-Lab, Glossar und Asset-Galerie in einer Oberfläche.'
  },
  {
    title: 'Viele Assets',
    description: 'Der Vault erzeugt 64 statische und animierte Pixelgrafiken pro Build direkt aus dem Code.'
  }
];

const glossaryItems = [
  { term: 'createArt()', type: 'Factory', hint: 'Erzeugt ein statisches Dokument aus einem Frame.' },
  { term: 'createAnimation()', type: 'Factory', hint: 'Erzeugt ein animiertes Dokument aus mehreren Frames.' },
  { term: 'fromArray()', type: 'Converter', hint: 'Nimmt numerische Arrays und validiert die Indices.' },
  { term: 'parseCompact()', type: 'Parser', hint: 'Liest kompakte Pixelstrings im Base64-ähnlichen Zeichensatz.' },
  { term: 'parseDocument()', type: 'Parser', hint: 'Akzeptiert String oder Objekt und normalisiert sofort.' },
  { term: 'stringifyDocument()', type: 'Serializer', hint: 'Serialisiert das Dokument stabil nach JSON.' },
  { term: 'validateDocument()', type: 'Validator', hint: 'Gibt { valid, errors } für Build-Checks oder Editor-UX zurück.' },
  { term: 'mountPixelArt()', type: 'Runtime', hint: 'Erzeugt einen Controller direkt in einem Host-Element.' },
  { term: 'renderCanvas()', type: 'Renderer', hint: 'Rendert synchron auf eine Canvas-Surface.' },
  { term: 'renderSVG()', type: 'Renderer', hint: 'Erzeugt SVG-Markup für statische oder inline Ausgaben.' },
  { term: 'renderPNG()', type: 'Renderer', hint: 'Erzeugt PNG-Bytes für Export oder Build-Pipelines.' },
  { term: 'renderGIF()', type: 'Renderer', hint: 'Erzeugt GIF-Bytes inklusive Iteration / Looping.' },
  { term: 'renderDataURL()', type: 'Renderer', hint: 'Wandelt Renderer-Ausgaben direkt in Browser-kompatible URLs.' }
];

const apiActions: ApiAction[] = [
  {
    id: 'create-art',
    title: 'createArt()',
    description: 'Statischen Sprite bauen',
    language: 'js',
    snippet: `import { createArt } from 'pixelscript';

const document = createArt({
  width: 10,
  height: 10,
  pixels: new Array(100).fill(0).map((_, index) => (index + 1) % 16 + 1)
});`,
    build: () =>
      createArt({
        width: 10,
        height: 10,
        pixels: new Array(100).fill(0).map((_, index) => (index + 3) % 16 + 1)
      }),
    run: async (document) =>
      `createArt() -> ${document.width}x${document.height}, ${document.frames.length} frame(s), palette.kind=${document.palette.kind}`
  },
  {
    id: 'from-array',
    title: 'fromArray()',
    description: 'Arrays zu Dokumenten wandeln',
    language: 'js',
    snippet: `import { fromArray } from 'pixelscript';

const frame = Array.from({ length: 64 }, (_, index) => index % 14);
const document = fromArray({ width: 8, height: 8, pixels: frame });`,
    build: () =>
      fromArray({
        width: 8,
        height: 8,
        pixels: Array.from({ length: 64 }, (_, index) => index % 14),
        meta: {
          name: 'Array Demo'
        }
      }),
    run: async (document) => `fromArray() -> first frame prefix=${document.frames[0]!.pixels.slice(0, 8)}`
  },
  {
    id: 'parse-compact',
    title: 'parseCompact()',
    description: 'Kompakte Strings decodieren',
    language: 'js',
    snippet: `import { parseCompact } from 'pixelscript';

const doc = parseCompact({
  width: 8,
  height: 8,
  pixels: 'AAAABAAAAAABNAAAAABNNNAAABNNNNNABNNNNNAAABNNNAAAAABNAAAAAAABAAA'
});`,
    build: () =>
      parseCompact({
        width: 8,
        height: 8,
        pixels: 'AAAABAAAAAABNAAAAABNNNAAABNNNNNABNNNNNAAABNNNAAAAABNAAAAAAABAAA'
      }),
    run: async (document) =>
      `parseCompact() -> ${document.frames.length} frame(s), packed length ${document.frames[0]!.pixels.length}`
  },
  {
    id: 'parse-validate',
    title: 'parseDocument() + validateDocument()',
    description: 'JSON roundtrip und Validation',
    language: 'js',
    snippet: `import { parseDocument, validateDocument } from 'pixelscript';

const parsed = parseDocument(jsonText);
const result = validateDocument(parsed);`,
    build: () =>
      parseDocument(
        JSON.stringify({
          version: 1,
          width: inlineDocument.width,
          height: inlineDocument.height,
          palette: inlineDocument.palette,
          frames: inlineDocument.frames
        })
      ),
    run: async (document) => {
      const result = validateDocument(document);
      return `parseDocument() + validateDocument() -> valid=${result.valid}`;
    }
  },
  {
    id: 'render-svg',
    title: 'renderSVG()',
    description: 'SVG direkt ausgeben',
    language: 'js',
    snippet: `import { renderSVG } from 'pixelscript';

const svg = renderSVG(document, { scale: 16 });`,
    build: () => inlineDocument,
    run: async (document) => {
      const svg = renderSVG(document, { scale: 16 });
      return `renderSVG() -> ${svg.length} chars, starts with: ${svg.slice(0, 20)}`;
    }
  },
  {
    id: 'render-canvas',
    title: 'renderCanvas()',
    description: 'Canvas synchron erzeugen',
    language: 'js',
    snippet: `import { renderCanvas } from 'pixelscript';

const node = renderCanvas(document, { scale: 12 });`,
    build: () => checkerDocument,
    run: async (document) => {
      const node = renderCanvas(document, { scale: 12 });
      return node instanceof HTMLCanvasElement
        ? `renderCanvas() -> ${node.width}x${node.height}`
        : 'renderCanvas() -> fallback canvas surface';
    }
  },
  {
    id: 'png-gif',
    title: 'renderPNG() + renderGIF()',
    description: 'Byte-Ausgaben vergleichen',
    language: 'js',
    snippet: `import { renderPNG, renderGIF } from 'pixelscript';

const png = await renderPNG(document, { scale: 12 });
const gif = await renderGIF(document, { scale: 10, iterations: 1 });`,
    build: () => heroDocument,
    run: async (document) => {
      const png = await renderPNG(document, { scale: 12 });
      const gif = await renderGIF(document, { scale: 10, iterations: 1 });
      return `renderPNG() -> ${png.byteLength} bytes | renderGIF() -> ${gif.byteLength} bytes`;
    }
  },
  {
    id: 'data-url',
    title: 'renderDataURL()',
    description: 'Browser-URL direkt aus PNG bauen',
    language: 'js',
    snippet: `import { renderDataURL } from 'pixelscript';

const url = await renderDataURL(document, { format: 'png', scale: 12 });`,
    build: () => glyphDocument,
    run: async (document) => {
      const url = await renderDataURL(document, { format: 'png', scale: 12 });
      apiBytesPreview.src = url;
      apiBytesPreview.hidden = false;
      return `renderDataURL() -> ${url.length} chars`;
    }
  },
  {
    id: 'mount',
    title: 'mountPixelArt()',
    description: 'Runtime-Controller mounten',
    language: 'js',
    snippet: `import { mountPixelArt } from 'pixelscript';

const controller = mountPixelArt(target, document, {
  render: 'canvas',
  scale: 16,
  autoplay: true
});`,
    build: () =>
      createAnimation({
        width: 14,
        height: 14,
        frames: buildGalleryAnimationFrames(14, 14, parseHexSeed('#00d9a6'), 9),
        animation: {
          fps: 8,
          loop: true
        },
        palette: neonPalette
      }),
    run: async (document) => {
      if (apiController) {
        apiController.destroy();
        apiController = null;
      }

      apiRuntimeTarget.innerHTML = '';
      apiController = mountPixelArt(apiRuntimeTarget, document, {
        render: 'canvas',
        autoplay: true,
        loop: true,
        interactive: true,
        scale: 18
      });
      apiRuntimeTarget.style.display = 'grid';
      return 'mountPixelArt() -> runtime controller active';
    }
  }
];

const galleryItems = buildGalleryPack();

app.innerHTML = `
  <main class="v2-shell">
    <div class="aurora"></div>
    <div class="grain"></div>

    <header class="panel panel-soft reveal-up" id="top">
      <a class="brand" href="#top">PixelScript <span>Demo V2</span></a>
      <nav>
        <a href="#renderer">Renderer</a>
        <a href="#source">Source</a>
        <a href="#playground">Studio</a>
        <a href="#api-lab">API</a>
        <a href="#palette">Palette</a>
        <a href="#gallery">Vault</a>
      </nav>
      <a class="badge" href="https://github.com/ibimspumo/PixelScript" target="_blank" rel="noreferrer">GitHub</a>
    </header>

    <section class="hero panel reveal-up">
      <div class="hero-copy">
        <p class="eyebrow">dark pixel playground</p>
        <h1>Komplettes V2-Showcase mit 64 prozeduralen Pixel-Art Assets</h1>
        <p>
          Voller Neustart statt Facelift: Landingpage, Playground, API-Lab, Glossar und Asset-Vault in einer
          dunklen, verspielten Oberfläche mit viel Fokus auf Pixelgrafik.
        </p>
        <div class="hero-actions">
          <a class="button solid" href="#api-lab">API Lab</a>
          <a class="button ghost" href="#playground">Studio</a>
          <a class="button ghost" href="#gallery">Vault</a>
        </div>
        <p class="meta">Version ${version}</p>
      </div>
      <figure class="hero-art panel-soft">
        <pixel-art id="hero-art" render="canvas" autoplay loop fps="11" scale="16"></pixel-art>
      </figure>
    </section>

    <section class="panel reveal-up features">
      <div class="panel-title">Capabilities</div>
      <div class="feature-grid">
        ${featureCards
          .map(
            (card) => `
          <article class="feature-card">
            <h3>${card.title}</h3>
            <p>${card.description}</p>
          </article>`
          )
          .join('')}
      </div>
    </section>

    <section class="panel split reveal-up" id="renderer">
      <div class="copy-col">
        <p class="eyebrow">Renderer Hub</p>
        <h2>Ein Dokument, vier Ausgabewege</h2>
        <p>Canvas, SVG, PNG und GIF laufen durch denselben Datenpfad.</p>
        <pre class="code-block" id="render-code" data-testid="js-snippet"></pre>
        <pre class="code-block" id="svg-snippet" data-testid="svg-snippet"></pre>
      </div>
      <div class="render-grid">
        <article class="render-card"><span class="render-label">Canvas</span><pixel-art id="render-canvas" render="canvas" scale="14"></pixel-art></article>
        <article class="render-card"><span class="render-label">SVG</span><pixel-art id="render-svg" render="svg" scale="14"></pixel-art></article>
        <article class="render-card"><span class="render-label">PNG</span><pixel-art id="render-png" render="png" scale="14"></pixel-art></article>
        <article class="render-card"><span class="render-label">GIF</span><pixel-art id="render-gif" render="gif" scale="14" autoplay loop fps="9"></pixel-art></article>
      </div>
    </section>

    <section class="panel split reveal-up" id="source">
      <div class="copy-col">
        <p class="eyebrow">Inline & Remote</p>
        <h2>\`data\` und \`src\` liefern dieselbe Darstellung</h2>
        <p>Links kommt das Dokument direkt aus dem HTML-Attribut, rechts aus einer JSON-Datei.</p>
        <pre class="code-block" id="inline-json" data-testid="json-snippet"></pre>
      </div>
      <div class="inline-grid">
        <article class="render-card"><span class="render-label">data</span><pixel-art id="inline-data-art" data-testid="inline-data-art" render="canvas" scale="14"></pixel-art></article>
        <article class="render-card"><span class="render-label">src</span><pixel-art id="inline-remote-art" data-testid="src-art" render="svg" scale="12"></pixel-art></article>
      </div>
    </section>

    <section class="panel split reveal-up" id="playground">
      <div class="copy-col">
        <p class="eyebrow">Studio</p>
        <h2>Controller, Events und Pixel-Mutationen</h2>
        <div class="field-wrap">
          <label for="studio-mode">Render Mode</label>
          <select id="studio-mode" data-testid="mode-select">
            <option value="canvas">canvas</option>
            <option value="svg">svg</option>
            <option value="png">png</option>
            <option value="gif">gif</option>
          </select>
        </div>
        <div class="grid-control">
          <label>Scale <input id="studio-scale" type="range" min="6" max="26" step="1" value="18" /></label>
          <label>FPS <input id="studio-fps" type="range" min="2" max="24" step="1" value="8" /></label>
          <label>Rotate
            <select id="studio-rotate">
              <option value="0">0°</option>
              <option value="90">90°</option>
              <option value="180">180°</option>
              <option value="270">270°</option>
            </select>
          </label>
          <label><span>Loop</span><input id="studio-loop" type="checkbox" checked /></label>
          <label><span>Interactive</span><input id="studio-interactive" type="checkbox" checked /></label>
          <label>Hold Delay <input id="studio-hold" type="number" value="420" min="0" max="3000" step="20" /></label>
        </div>
        <div class="button-strip">
          <button id="studio-play" class="button solid">Play</button>
          <button id="studio-ping" data-testid="play-twice" class="button solid">Play x3</button>
          <button id="studio-pause" class="button ghost">Pause</button>
          <button id="studio-stop" class="button ghost">Stop</button>
          <button id="studio-seek" class="button ghost">Seek End</button>
          <button id="studio-random" class="button ghost">Randomize</button>
          <button id="studio-paint" class="button ghost">Paint Strokes</button>
        </div>
        <div class="status-pill">
          <span>Events: <output id="studio-completions" data-testid="completion-count">0</output></span>
          <span id="studio-event" class="muted">no event yet</span>
        </div>
      </div>
      <div>
        <div class="render-card studio-frame"><pixel-art id="playground-art" data-testid="playground-art" render="canvas" autoplay loop scale="18"></pixel-art></div>
        <div id="brush-colors" class="palette-mini"></div>
      </div>
    </section>

    <section class="panel split reveal-up" id="api-lab">
      <div class="copy-col">
        <p class="eyebrow">API Lab</p>
        <h2>API direkt ausführen</h2>
        <p>Jeder Tab führt echte Library-Funktionen aus und zeigt sofort den Output.</p>
        <div class="api-action-grid" id="api-actions">
          ${apiActions
            .map(
              (action, index) =>
                `<button class="chip${index === 0 ? ' active' : ''}" data-api-action="${action.id}" title="${action.description}">${action.title}</button>`
            )
            .join('')}
        </div>
        <pre class="code-block" id="api-snippet"></pre>
      </div>
      <div class="api-preview-col">
        <pixel-art id="api-preview" render="canvas" scale="18"></pixel-art>
        <div id="api-runtime-target" class="mount-target"></div>
        <img id="api-bytes-preview" class="api-bytes" alt="Data URL preview" hidden />
        <pre class="code-block" id="api-console"></pre>
      </div>
    </section>

    <section class="panel split reveal-up" id="palette">
      <div class="copy-col">
        <p class="eyebrow">Palette Lab</p>
        <h2>Farbindexierung und Transparenz</h2>
        <p>Index 0 ist immer transparent. Die Demo zeigt Default64 und eine neue Neon-Palette.</p>
        <pre class="code-block" id="palette-code"></pre>
      </div>
      <div>
        <div id="palette-grid" class="palette-grid"></div>
        <pre class="code-block" id="palette-summary"></pre>
      </div>
    </section>

    <section class="panel reveal-up" id="glossary">
      <p class="eyebrow">Code Glossary</p>
      <h2>API Begriffe in Kurzform</h2>
      <div id="glossary-grid" class="glossary-grid">
        ${glossaryItems
          .map(
            (item, index) =>
              `<article class="glossary-card" data-term-index="${index}"><span class="term-badge">${item.type}</span><h4>${item.term}</h4><p>${item.hint}</p></article>`
          )
          .join('')}
      </div>
      <p id="glossary-detail" class="glossary-detail"></p>
    </section>

    <section class="panel reveal-up" id="gallery">
      <div class="gallery-toolbar">
        <p class="eyebrow">Pixel Vault</p>
        <h2>64 prozedurale Assets: statisch und animiert</h2>
        <div class="toolbar-row">
          <div class="chip-set">
            <button class="chip active" data-filter="all">All</button>
            <button class="chip" data-filter="art">Static</button>
            <button class="chip" data-filter="animation">Animation</button>
          </div>
          <button id="shuffle-gallery" class="chip">Shuffle</button>
          <input id="gallery-search" placeholder="Titel filtern" />
          <span class="badge" id="gallery-count">0/0</span>
        </div>
      </div>
      <div id="gallery-grid" class="gallery-grid"></div>
    </section>

    <footer class="panel panel-soft reveal-up">
      <p>PixelScript Demo V2 · dunkles Playground- und Landingpage-Redesign · Version ${version}</p>
      <p class="meta">Charset: ${BASE64_CHARSET}</p>
      <div class="charset-strip">${compactCharsetMarkup}</div>
    </footer>
  </main>
`;

const heroArt = q<RuntimePixelArt>('#hero-art');
const renderCanvasEl = q<RuntimePixelArt>('#render-canvas');
const renderSvgEl = q<RuntimePixelArt>('#render-svg');
const renderPngEl = q<RuntimePixelArt>('#render-png');
const renderGifEl = q<RuntimePixelArt>('#render-gif');
const inlineDataArt = q<RuntimePixelArt>('#inline-data-art');
const inlineRemoteArt = q<RuntimePixelArt>('#inline-remote-art');
const playgroundArt = q<RuntimePixelArt>('#playground-art');
const apiPreview = q<RuntimePixelArt>('#api-preview');
const apiRuntimeTarget = q<HTMLElement>('#api-runtime-target');
const apiBytesPreview = q<HTMLImageElement>('#api-bytes-preview');
const apiSnippet = q<HTMLElement>('#api-snippet');
const apiConsole = q<HTMLElement>('#api-console');
const paletteGrid = q<HTMLElement>('#palette-grid');
const paletteSummary = q<HTMLElement>('#palette-summary');
const paletteCode = q<HTMLElement>('#palette-code');
const renderCode = q<HTMLElement>('#render-code');
const svgSnippet = q<HTMLElement>('#svg-snippet');
const inlineJson = q<HTMLElement>('#inline-json');
const galleryGrid = q<HTMLElement>('#gallery-grid');
const galleryCount = q<HTMLElement>('#gallery-count');
const gallerySearch = q<HTMLInputElement>('#gallery-search');
const glossaryGrid = q<HTMLElement>('#glossary-grid');
const glossaryDetail = q<HTMLElement>('#glossary-detail');
const studioMode = q<HTMLSelectElement>('#studio-mode');
const studioScale = q<HTMLInputElement>('#studio-scale');
const studioFps = q<HTMLInputElement>('#studio-fps');
const studioRotate = q<HTMLSelectElement>('#studio-rotate');
const studioLoop = q<HTMLInputElement>('#studio-loop');
const studioInteractive = q<HTMLInputElement>('#studio-interactive');
const studioHold = q<HTMLInputElement>('#studio-hold');
const studioCompletions = q<HTMLOutputElement>('#studio-completions');
const studioEvent = q<HTMLElement>('#studio-event');
const brushContainer = q<HTMLElement>('#brush-colors');
const studioPlay = q<HTMLButtonElement>('#studio-play');
const studioPing = q<HTMLButtonElement>('#studio-ping');
const studioPause = q<HTMLButtonElement>('#studio-pause');
const studioStop = q<HTMLButtonElement>('#studio-stop');
const studioSeek = q<HTMLButtonElement>('#studio-seek');
const studioRandom = q<HTMLButtonElement>('#studio-random');
const studioPaint = q<HTMLButtonElement>('#studio-paint');
heroArt.setAttribute('data', stringifyDocument(heroDocument));
heroArt.setAttribute('autoplay', '');
heroArt.setAttribute('loop', '');

renderCanvasEl.setAttribute('data', stringifyDocument(inlineDocument));
renderSvgEl.setAttribute('data', stringifyDocument(inlineDocument));
renderPngEl.setAttribute('data', stringifyDocument(inlineDocument));
renderGifEl.setAttribute('data', stringifyDocument(glyphDocument));
renderGifEl.setAttribute('autoplay', '');
renderGifEl.setAttribute('loop', '');

inlineDataArt.setAttribute('data', stringifyDocument(inlineDocument));
inlineRemoteArt.setAttribute('src', exampleDocumentPath);

playgroundArt.setAttribute('data', stringifyDocument(heroDocument));
playgroundArt.setAttribute('loop', '');

apiPreview.setAttribute('data', stringifyDocument(inlineDocument));

renderHighlightedCode(
  renderCode,
  `const doc = createAnimation({
  width: 18,
  height: 18,
  frames,
  animation: { fps: 11, loop: true }
});`,
  'js'
);
renderHighlightedCode(svgSnippet, renderSVG(inlineDocument, { scale: 12 }), 'markup');
renderHighlightedCode(inlineJson, formatJson(stringifyDocument(inlineDocument)), 'json');
renderHighlightedCode(
  paletteCode,
  `import { definePalette, parseHexColor } from 'pixelscript';

const base = parseHexColor('#00f0ff');
const neon = definePalette({ name: 'Neon Night', colors: [null, ...] });`,
  'js'
);
paletteSummary.textContent = `parseHexColor('#00f0ff') => ${parseHexColor('#00f0ff').join(', ')}`;
glossaryDetail.textContent = 'Klicke auf einen Begriff fuer eine Kurzreferenz.';

populatePalette();

let apiController: ReturnType<typeof mountPixelArt> | null = null;
let studioCompletionsCount = 0;
let studioBrush = 3;
let currentStudioDocument = heroDocument;

for (const color of defaultPalette.colors ?? []) {
  if (color === null) {
    continue;
  }
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'brush-dot';
  swatch.style.background = color;
  swatch.dataset.color = String(defaultPalette.colors?.indexOf(color) ?? 0);
  brushContainer.append(swatch);
}

brushContainer.addEventListener('click', (event) => {
  const target = event.target as HTMLButtonElement | null;
  const color = Number(target?.dataset.color);
  if (!Number.isFinite(color)) {
    return;
  }
  studioBrush = color;
  for (const child of Array.from(brushContainer.children)) {
    child.classList.toggle('active', child === target);
  }
});

for (const button of queryAll<HTMLElement>('#api-actions .chip')) {
  button.addEventListener('click', () => {
    const actionId = button.dataset.apiAction;
    if (!actionId) {
      return;
    }
    void activateApiAction(actionId);
    for (const peer of queryAll<HTMLElement>('#api-actions .chip')) {
      peer.classList.remove('active');
    }
    button.classList.add('active');
  });
}

for (const eventType of [
  'pixelscript:complete',
  'pixelscript:pixel-hover',
  'pixelscript:pixel-enter',
  'pixelscript:pixel-leave',
  'pixelscript:pixel-down',
  'pixelscript:pixel-up',
  'pixelscript:pixel-click',
  'pixelscript:pixel-drag',
  'pixelscript:pixel-hold',
  'pixelscript:pixel-change'
] as const) {
  playgroundArt.addEventListener(eventType, (event) => {
    if (eventType === 'pixelscript:complete') {
      studioCompletionsCount += 1;
      studioCompletions.value = String(studioCompletionsCount);
      studioCompletions.textContent = String(studioCompletionsCount);
      studioEvent.textContent = 'pixelscript:complete';
      return;
    }

    const detail = (event as CustomEvent<{ x: number; y: number; paletteIndex: number; previousIndex?: number }>).detail;
    studioEvent.textContent = detail
      ? `${eventType} (${detail.x}x${detail.y}) -> ${detail.paletteIndex}`
      : eventType;
  });
}

studioMode.addEventListener('change', applyStudioSettings);
studioScale.addEventListener('input', applyStudioSettings);
studioFps.addEventListener('input', applyStudioSettings);
studioRotate.addEventListener('change', applyStudioSettings);
studioLoop.addEventListener('change', applyStudioSettings);
studioInteractive.addEventListener('change', applyStudioSettings);
studioHold.addEventListener('change', applyStudioSettings);

studioPlay.addEventListener('click', () => {
  playgroundArt.play(1);
});
studioPing.addEventListener('click', () => {
  playgroundArt.play(3);
});
studioPause.addEventListener('click', () => {
  playgroundArt.pause();
});
studioStop.addEventListener('click', () => {
  playgroundArt.stop();
});
studioSeek.addEventListener('click', () => {
  playgroundArt.seek(Math.max(0, currentStudioDocument.frames.length - 1));
});
studioRandom.addEventListener('click', () => {
  const size = 12;
  currentStudioDocument = createAnimation({
    width: size,
    height: size,
    frames: [
      { pixels: randomNoiseFrame(size, size), durationMs: 140 },
      { pixels: randomNoiseFrame(size, size), durationMs: 140 }
    ],
    animation: {
      fps: 8,
      loop: true
    },
    palette: neonPalette
  });
  playgroundArt.setAttribute('data', stringifyDocument(currentStudioDocument));
  applyStudioSettings();
});
studioPaint.addEventListener('click', () => {
  const updates = Array.from({ length: 36 }, () => ({
    x: Math.floor(Math.random() * currentStudioDocument.width),
    y: Math.floor(Math.random() * currentStudioDocument.height),
    paletteIndex: studioBrush
  }));
  playgroundArt.setPixels(updates, 0);
});

glossaryGrid.addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLElement>('.glossary-card');
  if (!card) {
    return;
  }
  const index = Number(card.dataset.termIndex);
  const item = glossaryItems[index];
  if (item) {
    glossaryDetail.textContent = `${item.term} — ${item.type}: ${item.hint}`;
  }
});

const galleryCards: Array<{ node: HTMLElement; item: GalleryItem }> = [];
const galleryState: { filter: 'all' | GalleryKind } = { filter: 'all' };

for (const item of galleryItems) {
  const figure = document.createElement('figure');
  figure.className = `gallery-card${item.emphasis ? ' emph' : ''}`;
  figure.dataset.kind = item.kind;
  figure.dataset.title = item.title.toLowerCase();

  const badge = document.createElement('span');
  badge.className = 'gallery-label';
  badge.textContent = item.kind;

  const title = document.createElement('figcaption');
  title.className = 'gallery-title';
  title.textContent = item.title;

  const preview = document.createElement('pixel-art');
  preview.setAttribute('render', 'canvas');
  preview.setAttribute('scale', '8');
  preview.setAttribute('data', stringifyDocument(item.document));
  if (item.document.frames.length > 1) {
    preview.setAttribute('autoplay', '');
    preview.setAttribute('loop', '');
    preview.setAttribute('fps', '10');
  }

  figure.append(badge, title, preview);
  figure.addEventListener('click', () => {
    currentStudioDocument = item.document;
    playgroundArt.setAttribute('data', stringifyDocument(item.document));
    applyStudioSettings();
    window.scrollTo({
      top: q<HTMLElement>('#playground').offsetTop - 16,
      behavior: 'smooth'
    });
  });

  galleryGrid.append(figure);
  galleryCards.push({ node: figure, item });
}

for (const chip of queryAll<HTMLElement>('.chip[data-filter]')) {
  chip.addEventListener('click', () => {
    const filter = chip.dataset.filter;
    if (!filter) {
      return;
    }
    galleryState.filter = filter as 'all' | GalleryKind;
    for (const peer of queryAll<HTMLElement>('.chip[data-filter]')) {
      peer.classList.toggle('active', peer === chip);
    }
    renderGallery();
  });
}

q<HTMLButtonElement>('#shuffle-gallery').addEventListener('click', () => {
  const cards = Array.from(galleryGrid.children);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const swapNode = cards[swap];
    const indexNode = cards[index];
    if (!swapNode || !indexNode) {
      continue;
    }
    galleryGrid.append(swapNode, indexNode);
  }
  renderGallery();
});

gallerySearch.addEventListener('input', renderGallery);

function applyStudioSettings(): void {
  playgroundArt.setAttribute('render', studioMode.value);
  playgroundArt.setAttribute('scale', studioScale.value);
  playgroundArt.setAttribute('fps', studioFps.value);
  playgroundArt.setAttribute('rotate', studioRotate.value);

  if (studioLoop.checked) {
    playgroundArt.setAttribute('loop', '');
  } else {
    playgroundArt.removeAttribute('loop');
  }

  playgroundArt.setAttribute('interactive', String(studioInteractive.checked));
  const holdDelay = Number(studioHold.value);
  if (Number.isFinite(holdDelay)) {
    playgroundArt.setAttribute('hold-delay', String(Math.max(0, holdDelay)));
  }

  if (studioMode.value === 'gif') {
    playgroundArt.removeAttribute('brightness');
    playgroundArt.removeAttribute('contrast');
  } else {
    playgroundArt.setAttribute('brightness', '1.08');
    playgroundArt.setAttribute('contrast', '1.05');
  }
}

function renderGallery(): void {
  const query = gallerySearch.value.trim().toLowerCase();
  let visible = 0;

  for (const { node, item } of galleryCards) {
    const passFilter = galleryState.filter === 'all' || item.kind === galleryState.filter;
    const passSearch = !query || item.title.toLowerCase().includes(query);
    const show = passFilter && passSearch;
    node.style.display = show ? 'grid' : 'none';
    if (show) {
      visible += 1;
    }
  }

  galleryCount.textContent = `${visible}/${galleryCards.length}`;
}

async function activateApiAction(actionId: string): Promise<void> {
  const action = apiActions.find((entry) => entry.id === actionId);
  if (!action) {
    return;
  }

  if (apiController) {
    apiController.destroy();
    apiController = null;
  }

  apiRuntimeTarget.innerHTML = '';
  apiRuntimeTarget.style.display = 'none';
  apiBytesPreview.hidden = true;

  const documentData = action.build();
  apiPreview.setAttribute('data', stringifyDocument(documentData));
  if (documentData.frames.length > 1) {
    apiPreview.setAttribute('autoplay', '');
    apiPreview.setAttribute('loop', '');
  } else {
    apiPreview.removeAttribute('autoplay');
    apiPreview.removeAttribute('loop');
  }

  renderHighlightedCode(apiSnippet, action.snippet, action.language);

  try {
    apiConsole.textContent = await action.run(documentData);
  } catch (error) {
    apiConsole.textContent = `error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function populatePalette(): void {
  paletteGrid.textContent = '';

  for (const pack of [
    { title: 'Default64', colors: defaultPalette.colors ?? [] },
    { title: 'Neon Night', colors: neonPalette.colors ?? [] }
  ]) {
    const heading = document.createElement('h3');
    heading.className = 'palette-heading';
    heading.textContent = pack.title;
    paletteGrid.append(heading);

    for (const [index, color] of pack.colors.entries()) {
      const swatch = document.createElement('div');
      swatch.className = 'palette-swatch';
      swatch.style.setProperty('--swatch-color', color ?? 'transparent');

      const idx = document.createElement('span');
      idx.className = 'palette-index';
      idx.textContent = String(index);

      const hex = document.createElement('span');
      hex.className = 'palette-color';
      hex.textContent = color ?? 'transparent';

      swatch.append(idx, hex);
      paletteGrid.append(swatch);
    }
  }
}

function renderHighlightedCode(target: HTMLElement, source: string, language: 'json' | 'js' | 'markup'): void {
  target.innerHTML = highlightCode(source, language);
}

function highlightCode(source: string, language: 'json' | 'js' | 'markup'): string {
  const patterns =
    language === 'json'
      ? [
          { regex: /"(?:\\.|[^"\\])*"(?=\s*:)/g, css: 'token token-key' },
          { regex: /"(?:\\.|[^"\\])*"/g, css: 'token token-string' },
          { regex: /\b(?:true|false|null)\b/g, css: 'token token-keyword' },
          { regex: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, css: 'token token-number' }
        ]
      : language === 'markup'
        ? [
            { regex: /<!--[^]*?-->/g, css: 'token token-comment' },
            { regex: /<[^>]+>/g, css: 'token token-tag' },
            { regex: /[A-Za-z0-9_-]+(?=\=)/g, css: 'token token-attr' }
          ]
        : [
            { regex: /\/\/.*$/gm, css: 'token token-comment' },
            { regex: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, css: 'token token-string' },
            { regex: /\b(?:import|from|const|let|return|new|async|await|function|if|else|for|while)\b/g, css: 'token token-keyword' },
            { regex: /[A-Za-z_$][\w$]*(?=\()/g, css: 'token token-function' },
            { regex: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, css: 'token token-number' }
          ];

  return applyPatterns(source, patterns);
}

function applyPatterns(source: string, patterns: Array<{ regex: RegExp; css: string }>): string {
  let value = source;
  const replacements: string[] = [];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    value = value.replace(pattern.regex, (match) => {
      const token = `__PS_${replacements.length}__`;
      replacements.push(`<span class="${pattern.css}">${escapeHtml(match)}</span>`);
      return token;
    });
  }

  value = escapeHtml(value);
  for (let index = 0; index < replacements.length; index += 1) {
    value = value.replace(`__PS_${index}__`, replacements[index]!);
  }

  return value;
}

function formatJson(source: string): string {
  return JSON.stringify(JSON.parse(source), null, 2);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function buildGalleryPack(): GalleryItem[] {
  const items: GalleryItem[] = [];

  for (let index = 0; index < 64; index += 1) {
    const seed = hash32(0x5f3759df, index);
    const size = 8 + (seed % 7);
    const palette = seed % 2 === 0 ? neonPalette : defaultPalette;
    const isAnimation = index % 4 === 0;

    if (isAnimation) {
      items.push({
        id: `anim-${index}`,
        title: `Animated ${index + 1} (${size}x${size})`,
        kind: 'animation',
        emphasis: index % 12 === 0,
        document: createAnimation({
          width: size,
          height: size,
          palette,
          frames: buildGalleryAnimationFrames(size, size, seed, 8 + (seed % 5)),
          animation: {
            fps: 8 + (seed % 4),
            loop: true
          },
          meta: {
            name: `animated-${index + 1}`
          }
        })
      });
      continue;
    }

    items.push({
      id: `static-${index}`,
      title: `Static ${index + 1} (${size}x${size})`,
      kind: 'art',
      emphasis: index % 10 === 0,
      document: createArt({
        width: size,
        height: size,
        palette,
        pixels: createStaticPattern(size, size, seed % 11, (seed >> 1) % 13),
        meta: {
          name: `static-${index + 1}`
        }
      })
    });
  }

  return items;
}

function buildOrbitalFrames(width: number, height: number, seed: number): Uint8Array[] {
  const frames: Uint8Array[] = [];

  for (let frame = 0; frame < 12; frame += 1) {
    const values = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin((x + y + frame + seed) * 0.35);
        const ring = dist > 2.3 + wave && dist < 4.1 + wave;
        values[idx] = ring ? ((frame + x + y + seed) % 15) + 1 : 0;
      }
    }

    frames.push(values);
  }

  return frames;
}

function createStaticPattern(width: number, height: number, seedX: number, seedY: number): Uint8Array {
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const value = positiveMod(x * seedX + y * seedY + x * y, 14) + 1;
      pixels[idx] = positiveMod(x + y + seedX + seedY, 4) === 0 ? 0 : value;
    }
  }

  return pixels;
}

function buildSignalFrames(width: number, height: number): Array<{ pixels: Uint8Array; durationMs: number }> {
  return Array.from({ length: 8 }, (_, frame) => {
    const pixels = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const wave = Math.sin((x + frame) * 0.3) + Math.cos((y - frame) * 0.35);
        pixels[idx] = ((Math.floor((wave + 2) * 4 + x * 0.25 + y * 0.25) % 14) + 1);
      }
    }

    return { pixels, durationMs: 110 };
  });
}

function buildGalleryAnimationFrames(
  width: number,
  height: number,
  seed: number,
  frameCount: number
): Array<{ pixels: Uint8Array; durationMs: number }> {
  return Array.from({ length: frameCount }, (_, frame) => {
    const pixels = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const active = Math.abs(Math.sin(dist + frame * 0.7 + seed * 0.01)) > 0.7;
        pixels[idx] = active ? ((seed + frame + x + y) % 15) + 1 : 0;
      }
    }

    return {
      pixels,
      durationMs: 80 + ((frame * 3) % 12)
    };
  });
}

function randomNoiseFrame(width: number, height: number): Uint8Array {
  const pixels = new Uint8Array(width * height);
  for (let index = 0; index < pixels.length; index += 1) {
    const noise = (index * 11 + Math.floor(Math.random() * 29)) % 22;
    pixels[index] = noise > 11 ? (noise % 15) + 1 : 0;
  }
  return pixels;
}

function hash32(a: number, b: number): number {
  let x = (a ^ b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = (x + (b >>> 0) + (x << 6) + (x >>> 2)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function parseHexSeed(value: string): number {
  const parsed = parseHexColor(value);
  return (parsed[0] + parsed[1] + parsed[2] + parsed[3]) % 64;
}

function q<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node;
}

function queryAll<T extends Element>(selector: string): NodeListOf<T> {
  return document.querySelectorAll<T>(selector);
}

function setupReveal(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.14 }
  );

  for (const node of queryAll<HTMLElement>('.reveal-up')) {
    observer.observe(node);
  }
}

populatePalette();
applyStudioSettings();
renderGallery();
if (apiActions[0]) {
  activateApiAction(apiActions[0].id);
}
setupReveal();

window.addEventListener('beforeunload', () => {
  apiController?.destroy();
});
