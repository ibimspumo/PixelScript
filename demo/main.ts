import './styles.css';

import {
  BASE64_CHARSET,
  createAnimation,
  createArt,
  getDefaultPalette,
  mountPixelArt,
  registerPixelArtElement,
  renderSVG,
  stringifyDocument
} from '@/index';

registerPixelArtElement();

const checkerDocument = createArt({
  width: 2,
  height: 2,
  pixels: [0, 1, 0, 1],
  meta: {
    name: 'Checker'
  }
});

const cometDocument = createArt({
  width: 8,
  height: 8,
  pixels: rows(
    'AAAAABAA',
    'AAAABNAA',
    'AAABNNNA',
    'AABNNNNN',
    'ABNNNNNA',
    'AABNNNAA',
    'AAABNAAA',
    'AAAABAAA'
  ),
  meta: {
    name: 'Comet'
  }
});

const beaconDocument = createAnimation({
  width: 8,
  height: 8,
  frames: [
    {
      pixels: rows(
        'AAAAAAAA',
        'AAAABAAA',
        'AAABNBAA',
        'AABNNNBA',
        'AAABNBAA',
        'AAAABAAA',
        'AAAAAAAA',
        'AAAAAAAA'
      ),
      durationMs: 180
    },
    {
      pixels: rows(
        'AAAABAAA',
        'AAABNBAA',
        'AABNNNBA',
        'ABNNNNNB',
        'AABNNNBA',
        'AAABNBAA',
        'AAAABAAA',
        'AAAAAAAA'
      ),
      durationMs: 180
    },
    {
      pixels: rows(
        'AAABNBAA',
        'AABNNNBA',
        'ABNNNNNB',
        'BNNNONNN',
        'ABNNNNNB',
        'AABNNNBA',
        'AAABNBAA',
        'AAAAAAAA'
      ),
      durationMs: 220
    },
    {
      pixels: rows(
        'AAAABAAA',
        'AAABNBAA',
        'AABNNNBA',
        'ABNNNNNB',
        'AABNNNBA',
        'AAABNBAA',
        'AAAABAAA',
        'AAAAAAAA'
      ),
      durationMs: 180
    }
  ],
  animation: {
    fps: 6,
    loop: true
  },
  meta: {
    name: 'Beacon Pulse',
    description: 'A simple multi-frame beacon animation.'
  }
});

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('PixelScript demo root is missing.');
}

app.innerHTML = `
  <main class="page-shell">
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">PixelScript v1</p>
        <h1>Programmable pixel art for code, JSON, and inline HTML.</h1>
        <p class="lede">
          One document model. Four render modes. Tiny compact strings with the Base64 character set. Built to move between JavaScript, custom elements, and shareable JSON without format drift.
        </p>
        <div class="hero-actions">
          <a class="button solid" href="#playground">Open Playground</a>
          <a class="button ghost" href="https://github.com/ibimspumo/PixelScript" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
      <div class="hero-preview">
        <div class="signal-stack">
          <pixel-art id="hero-art" render="svg" scale="24" aria-label="Beacon animation"></pixel-art>
          <div class="hero-badge">
            <span>64 slots</span>
            <span>transparent on index A</span>
          </div>
        </div>
      </div>
    </section>

    <section class="feature-grid">
      <article class="panel stat-card">
        <p class="stat-label">Compact format</p>
        <strong>${BASE64_CHARSET}</strong>
        <span>Palette slots map directly to Base64 characters.</span>
      </article>
      <article class="panel stat-card">
        <p class="stat-label">Canonical model</p>
        <strong>JSON first</strong>
        <span>JS helpers and HTML adapters normalize into one document schema.</span>
      </article>
      <article class="panel stat-card">
        <p class="stat-label">Native outputs</p>
        <strong>Canvas, SVG, PNG, GIF</strong>
        <span>Use the same art everywhere without maintaining parallel assets.</span>
      </article>
    </section>

    <section class="panel showcase">
      <div class="section-head">
        <p class="eyebrow">Render Modes</p>
        <h2>One document, four render targets.</h2>
      </div>
      <div class="showcase-grid">
        <div class="render-card">
          <span class="render-label">Canvas</span>
          <pixel-art data-testid="inline-data-art" id="inline-data-art" render="canvas" scale="24"></pixel-art>
        </div>
        <div class="render-card">
          <span class="render-label">SVG</span>
          <pixel-art id="svg-art" render="svg" scale="24"></pixel-art>
        </div>
        <div class="render-card">
          <span class="render-label">PNG</span>
          <pixel-art id="png-art" render="png" scale="24"></pixel-art>
        </div>
        <div class="render-card">
          <span class="render-label">GIF</span>
          <pixel-art id="gif-art" render="gif" scale="24" autoplay loop></pixel-art>
        </div>
      </div>
    </section>

    <section class="panel split">
      <div class="copy-column">
        <div class="section-head">
          <p class="eyebrow">JSON + Inline HTML</p>
          <h2>Inline payloads or remote documents.</h2>
        </div>
        <p>
          The left example uses a direct JSON payload in the element. The right example loads a shareable file from <code>/examples/comet.json</code>.
        </p>
        <pre class="code-block" data-testid="json-snippet"></pre>
      </div>
      <div class="inline-grid">
        <div class="render-card">
          <span class="render-label">Inline <code>data</code></span>
          <pixel-art id="data-art" render="canvas" scale="20"></pixel-art>
        </div>
        <div class="render-card">
          <span class="render-label">Remote <code>src</code></span>
          <pixel-art data-testid="src-art" id="src-art" src="/examples/comet.json" render="svg" scale="18"></pixel-art>
        </div>
      </div>
    </section>

    <section class="panel split" id="playground">
      <div class="copy-column">
        <div class="section-head">
          <p class="eyebrow">Playground</p>
          <h2>Trigger animations from your own UI.</h2>
        </div>
        <p>
          The controller drives the same animation through different website render modes. Finite runs emit a completion event, so external buttons can coordinate playback.
        </p>
        <div class="control-row">
          <label class="field">
            <span>Render mode</span>
            <select data-testid="mode-select" id="mode-select">
              <option value="canvas">canvas</option>
              <option value="svg">svg</option>
              <option value="png">png</option>
              <option value="gif">gif</option>
            </select>
          </label>
        </div>
        <div class="control-grid">
          <button class="button solid" data-testid="play-once" id="play-once">Play once</button>
          <button class="button solid" data-testid="play-twice" id="play-twice">Play twice</button>
          <button class="button ghost" data-testid="pause" id="pause">Pause</button>
          <button class="button ghost" data-testid="stop" id="stop">Stop</button>
          <button class="button ghost" data-testid="seek-last" id="seek-last">Seek last frame</button>
        </div>
        <div class="status-strip">
          <span>Completion events</span>
          <output data-testid="completion-count" id="completion-count">0</output>
        </div>
      </div>
      <div class="playground-stage">
        <pixel-art data-testid="playground-art" id="playground-art" render="canvas" scale="24"></pixel-art>
      </div>
    </section>

    <section class="panel split">
      <div class="copy-column">
        <div class="section-head">
          <p class="eyebrow">JS API</p>
          <h2>Mount directly without a custom element.</h2>
        </div>
        <p>
          Use <code>mountPixelArt()</code> when you want explicit lifecycle control or you are composing pixel art into an existing rendering surface.
        </p>
        <pre class="code-block" data-testid="js-snippet"></pre>
      </div>
      <div class="render-card">
        <span class="render-label">Mounted via JavaScript</span>
        <div id="js-api-mount" class="mount-target" data-testid="js-api-mount"></div>
      </div>
    </section>

    <section class="panel split">
      <div class="copy-column">
        <div class="section-head">
          <p class="eyebrow">Default Palette</p>
          <h2>One transparent slot plus 63 visible colors.</h2>
        </div>
        <p>
          The built-in palette is fixed, compact-friendly, and readable against transparent or solid backgrounds.
        </p>
      </div>
      <div class="palette-grid" id="palette-grid"></div>
    </section>

    <section class="panel split">
      <div class="copy-column">
        <div class="section-head">
          <p class="eyebrow">SVG Export</p>
          <h2>Direct string output for server-side or inline use.</h2>
        </div>
        <p>
          PixelScript can emit inline SVG markup from the same JSON source. That keeps previews, generated docs, and static assets aligned.
        </p>
      </div>
      <pre class="code-block svg-preview" data-testid="svg-snippet"></pre>
    </section>
  </main>
`;

const heroArt = document.querySelector<HTMLElement>('#hero-art');
const inlineDataArt = document.querySelector<HTMLElement>('#inline-data-art');
const svgArt = document.querySelector<HTMLElement>('#svg-art');
const pngArt = document.querySelector<HTMLElement>('#png-art');
const gifArt = document.querySelector<HTMLElement>('#gif-art');
const dataArt = document.querySelector<HTMLElement>('#data-art');
const playgroundArt = document.querySelector<HTMLElement>('#playground-art');
const jsonSnippet = document.querySelector<HTMLElement>('[data-testid="json-snippet"]');
const jsSnippet = document.querySelector<HTMLElement>('[data-testid="js-snippet"]');
const svgSnippet = document.querySelector<HTMLElement>('[data-testid="svg-snippet"]');
const paletteGrid = document.querySelector<HTMLDivElement>('#palette-grid');
const completionCount = document.querySelector<HTMLOutputElement>('#completion-count');
const jsMount = document.querySelector<HTMLDivElement>('#js-api-mount');

if (!heroArt || !inlineDataArt || !svgArt || !pngArt || !gifArt || !dataArt || !playgroundArt || !jsonSnippet || !jsSnippet || !svgSnippet || !paletteGrid || !completionCount || !jsMount) {
  throw new Error('PixelScript demo surface is incomplete.');
}

const checkerJson = stringifyDocument(checkerDocument);
const beaconJson = stringifyDocument(beaconDocument);

heroArt.setAttribute('data', beaconJson);
heroArt.setAttribute('autoplay', '');
heroArt.setAttribute('loop', '');

inlineDataArt.setAttribute('data', checkerJson);
svgArt.setAttribute('data', checkerJson);
pngArt.setAttribute('data', checkerJson);
gifArt.setAttribute('data', beaconJson);
dataArt.setAttribute('data', checkerJson);

(playgroundArt as HTMLElement & { document?: unknown }).document = beaconDocument;

jsonSnippet.textContent = checkerJson;
svgSnippet.textContent = renderSVG(cometDocument, { scale: 12 });
jsSnippet.textContent = `import { mountPixelArt } from 'pixelscript';

const controller = mountPixelArt(target, document, {
  render: 'svg',
  scale: 16,
  autoplay: true
});

controller.play({ iterations: 2 });`;

const mountedController = mountPixelArt(jsMount, beaconDocument, {
  render: 'svg',
  scale: 18,
  autoplay: true,
  loop: true
});

let completions = 0;
playgroundArt.addEventListener('pixelscript:complete', () => {
  completions += 1;
  completionCount.value = String(completions);
  completionCount.textContent = String(completions);
});

document.querySelector<HTMLSelectElement>('#mode-select')?.addEventListener('change', (event) => {
  const select = event.currentTarget as HTMLSelectElement;
  playgroundArt.setAttribute('render', select.value);
});

document.querySelector<HTMLButtonElement>('#play-once')?.addEventListener('click', () => {
  (playgroundArt as HTMLElement & { play: (iterations?: number | 'infinite') => void }).play(1);
});

document.querySelector<HTMLButtonElement>('#play-twice')?.addEventListener('click', () => {
  (playgroundArt as HTMLElement & { play: (iterations?: number | 'infinite') => void }).play(2);
});

document.querySelector<HTMLButtonElement>('#pause')?.addEventListener('click', () => {
  (playgroundArt as HTMLElement & { pause: () => void }).pause();
});

document.querySelector<HTMLButtonElement>('#stop')?.addEventListener('click', () => {
  (playgroundArt as HTMLElement & { stop: () => void }).stop();
});

document.querySelector<HTMLButtonElement>('#seek-last')?.addEventListener('click', () => {
  (playgroundArt as HTMLElement & { seek: (frameIndex: number) => void }).seek(beaconDocument.frames.length - 1);
});

for (const [index, color] of getDefaultPalette().colors!.entries()) {
  const swatch = document.createElement('div');
  swatch.className = 'palette-swatch';
  swatch.innerHTML = `
    <span class="palette-index">${BASE64_CHARSET[index]}</span>
    <span class="palette-color">${color ?? 'transparent'}</span>
  `;

  if (color === null) {
    swatch.classList.add('transparent');
  } else {
    swatch.style.setProperty('--swatch-color', color);
  }

  paletteGrid.append(swatch);
}

window.addEventListener('beforeunload', () => {
  mountedController.destroy();
});

function rows(...values: string[]): string {
  return values.join('');
}
