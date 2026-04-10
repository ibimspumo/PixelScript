import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAnimation,
  createArt,
  definePalette,
  renderGIF,
  renderPNG,
  renderSVG,
  stringifyDocument
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'docs', 'readme-assets');

const paletteEntries = [
  ['.', null],
  ['W', '#ffffff'],
  ['I', '#d9fff5'],
  ['K', '#1f1f1f'],
  ['P', '#ffb9a8'],
  ['R', '#ff5d38'],
  ['Y', '#ffe08a'],
  ['G', '#57c84d'],
  ['T', '#1bc8af'],
  ['B', '#4f8dff'],
  ['V', '#944ff0'],
  ['N', '#0a1c52'],
  ['O', '#9b6300']
];

const palette = definePalette({
  kind: 'custom',
  name: 'README Arcade',
  colors: paletteEntries.map(([, color]) => color)
});

const symbolToIndex = new Map(paletteEntries.map(([symbol], index) => [symbol, index]));

const ghostWave = createAnimation({
  width: 8,
  height: 8,
  palette,
  animation: { fps: 5, loop: true },
  meta: {
    name: 'Ghost Wave',
    description: 'A tiny ghost waving from the README gallery.',
    tags: ['readme', 'sprite', 'animation']
  },
  frames: [
    { pixels: rowsToPixels(ghostRows('awake')) },
    { pixels: rowsToPixels(ghostRows('blink')) },
    { pixels: rowsToPixels(ghostRows('awake')) },
    { pixels: rowsToPixels(ghostRows('float')) }
  ]
});

const catFace = createArt({
  width: 8,
  height: 8,
  palette,
  meta: {
    name: 'Cat Face',
    description: 'A cheerful cat sprite.',
    tags: ['readme', 'sprite']
  },
  pixels: rowsToPixels([
    '.W..W...',
    '.WWWW...',
    'WPPPPW..',
    'WPKPKPW.',
    'WPPPPPW.',
    '.WPYYW..',
    '..WYYW..',
    '...WW...'
  ])
});

const potionBrew = createArt({
  width: 8,
  height: 8,
  palette,
  meta: {
    name: 'Potion Brew',
    description: 'A glowing potion bottle.',
    tags: ['readme', 'sprite']
  },
  pixels: rowsToPixels([
    '..WW....',
    '..YY....',
    '..WW....',
    '.OTTTO..',
    'OTVVVTO.',
    'OTVVVTO.',
    '.OTTTO..',
    '..OO....'
  ])
});

const flowerSpark = createArt({
  width: 8,
  height: 8,
  palette,
  meta: {
    name: 'Flower Spark',
    description: 'A playful flower icon.',
    tags: ['readme', 'sprite']
  },
  pixels: rowsToPixels([
    '..R.R...',
    '.RRYRR..',
    '..RRR...',
    '...Y....',
    '...G....',
    '..GGG...',
    '...G....',
    '........'
  ])
});

const cometBurst = createAnimation({
  width: 16,
  height: 8,
  palette,
  animation: { fps: 8, loop: true },
  meta: {
    name: 'Comet Burst',
    description: 'One document rendered as SVG, PNG, and GIF.',
    tags: ['readme', 'animation', 'comet']
  },
  frames: [
    { pixels: cometFrame(3, 5) },
    { pixels: cometFrame(6, 4) },
    { pixels: cometFrame(9, 3) },
    { pixels: cometFrame(12, 2) }
  ]
});

const paletteGrid = createArt({
  width: 8,
  height: 8,
  meta: {
    name: 'PixelScript-64 Grid',
    description: 'The built-in 64-slot palette laid out in order.',
    tags: ['readme', 'palette', 'default64']
  },
  pixels: Array.from({ length: 64 }, (_, index) => index)
});

const heroArcadeNight = createAnimation({
  width: 24,
  height: 14,
  palette,
  animation: { fps: 6, loop: true },
  meta: {
    name: 'Arcade Night',
    description: 'A playful hero scene assembled from reusable sprites.',
    tags: ['readme', 'hero', 'animation']
  },
  frames: [
    { pixels: heroFrame({ ghost: 'awake', stars: 'wide', cometX: 4, cometY: 4 }) },
    { pixels: heroFrame({ ghost: 'blink', stars: 'tight', cometX: 8, cometY: 3 }) },
    { pixels: heroFrame({ ghost: 'awake', stars: 'wide', cometX: 12, cometY: 2 }) },
    { pixels: heroFrame({ ghost: 'float', stars: 'tight', cometX: 16, cometY: 3 }) }
  ]
});

await mkdir(outputDir, { recursive: true });

await writeArtifactSet('hero-arcade-night', heroArcadeNight, {
  pngScale: 16,
  svgScale: 16,
  gifScale: 16
});
await writeArtifactSet('ghost-wave', ghostWave, {
  pngScale: 18,
  svgScale: 18,
  gifScale: 18
});
await writeArtifactSet('cat-face', catFace, {
  pngScale: 20,
  svgScale: 20
});
await writeArtifactSet('potion-brew', potionBrew, {
  pngScale: 20,
  svgScale: 20
});
await writeArtifactSet('flower-spark', flowerSpark, {
  pngScale: 20,
  svgScale: 20
});
await writeArtifactSet('comet-burst', cometBurst, {
  pngScale: 18,
  svgScale: 18,
  gifScale: 18
});
await writeArtifactSet('palette-grid', paletteGrid, {
  pngScale: 28,
  svgScale: 28
});

async function writeArtifactSet(name, document, options) {
  const jsonPath = path.join(outputDir, `${name}.json`);
  await writeFile(jsonPath, `${stringifyDocument(document)}\n`, 'utf8');

  const pngPath = path.join(outputDir, `${name}.png`);
  const png = await renderPNG(document, { scale: options.pngScale });
  await writeFile(pngPath, png);

  const svgPath = path.join(outputDir, `${name}.svg`);
  await writeFile(svgPath, `${renderSVG(document, { scale: options.svgScale })}\n`, 'utf8');

  if (options.gifScale) {
    const gifPath = path.join(outputDir, `${name}.gif`);
    const gif = await renderGIF(document, { scale: options.gifScale, iterations: 'infinite' });
    await writeFile(gifPath, gif);
  }
}

function rowsToPixels(rows) {
  const width = rows[0]?.length ?? 0;

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`Row "${row}" does not match width ${width}.`);
    }
  }

  return rows.join('').split('').map((symbol) => {
    const index = symbolToIndex.get(symbol);

    if (index === undefined) {
      throw new Error(`Unknown palette symbol "${symbol}".`);
    }

    return index;
  });
}

function ghostRows(mode) {
  switch (mode) {
    case 'blink':
      return [
        '..WWWW..',
        '.WIIIIW.',
        'WIIIIIIW',
        'WIIIIIIW',
        'WIIIIIIW',
        'WWIWWIWW',
        'W.W..W.W',
        '........'
      ];
    case 'float':
      return [
        '..WWWW..',
        '.WIIIIW.',
        'WIKIIKIW',
        'WIIIIIIW',
        'WIIIIIIW',
        'WIIWWIIW',
        'WW....WW',
        '.W....W.'
      ];
    case 'awake':
    default:
      return [
        '..WWWW..',
        '.WIIIIW.',
        'WIKIIKIW',
        'WIIIIIIW',
        'WIIIIIIW',
        'WWIWWIWW',
        'W.W..W.W',
        '........'
      ];
  }
}

function cometFrame(headX, headY) {
  const frame = createFrame(16, 8, '.');
  const tail = [
    [headX, headY, 'W'],
    [headX - 1, headY + 1, 'I'],
    [headX - 2, headY + 2, 'Y'],
    [headX - 3, headY + 2, 'Y'],
    [headX - 4, headY + 3, 'Y']
  ];

  for (const [x, y, symbol] of tail) {
    put(frame, 16, 8, x, y, symbol);
  }

  return Array.from(frame);
}

function heroFrame({ ghost, stars, cometX, cometY }) {
  const width = 24;
  const height = 14;
  const frame = createFrame(width, height, 'N');

  for (let y = 9; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      put(frame, width, height, x, y, y === 9 ? 'G' : x % 2 === 0 ? 'T' : 'B');
    }
  }

  stamp(frame, width, height, [
    '.YYY.',
    'YYYYY',
    'YYYYY',
    'YYYYY',
    '.YYY.'
  ], 1, 1);

  if (stars === 'wide') {
    stamp(frame, width, height, ['.Y.', 'YYY', '.Y.'], 9, 2);
    stamp(frame, width, height, ['.W.', 'WWW', '.W.'], 18, 4);
  } else {
    stamp(frame, width, height, ['...', '.Y.', '...'], 9, 2);
    stamp(frame, width, height, ['...', '.W.', '...'], 18, 4);
  }

  const cometPixels = cometFrame(cometX, cometY);
  stampIndices(frame, width, height, cometPixels, 16, 8, 0, 0);

  stamp(frame, width, height, [
    '.W..W...',
    '.WWWW...',
    'WPPPPW..',
    'WPKPKPW.',
    'WPPPPPW.',
    '.WPYYW..',
    '..WYYW..',
    '...WW...'
  ], 1, 6);

  stamp(frame, width, height, [
    '..WW....',
    '..YY....',
    '..WW....',
    '.OTTTO..',
    'OTVVVTO.',
    'OTVVVTO.',
    '.OTTTO..',
    '..OO....'
  ], 8, 6);

  stamp(frame, width, height, ghostRows(ghost), 15, ghost === 'float' ? 5 : 6);

  return Array.from(frame);
}

function createFrame(width, height, fillSymbol) {
  const fillIndex = symbolToIndex.get(fillSymbol);

  if (fillIndex === undefined) {
    throw new Error(`Unknown fill symbol "${fillSymbol}".`);
  }

  return new Uint8Array(width * height).fill(fillIndex);
}

function stamp(frame, frameWidth, frameHeight, rows, offsetX, offsetY) {
  const sprite = rowsToPixels(rows);
  stampIndices(frame, frameWidth, frameHeight, sprite, rows[0].length, rows.length, offsetX, offsetY);
}

function stampIndices(frame, frameWidth, frameHeight, sprite, spriteWidth, spriteHeight, offsetX, offsetY) {
  for (let y = 0; y < spriteHeight; y += 1) {
    for (let x = 0; x < spriteWidth; x += 1) {
      const value = sprite[y * spriteWidth + x];

      if (value === 0) {
        continue;
      }

      putIndex(frame, frameWidth, frameHeight, offsetX + x, offsetY + y, value);
    }
  }
}

function put(frame, width, height, x, y, symbol) {
  const index = symbolToIndex.get(symbol);

  if (index === undefined) {
    throw new Error(`Unknown symbol "${symbol}".`);
  }

  putIndex(frame, width, height, x, y, index);
}

function putIndex(frame, width, height, x, y, index) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  frame[y * width + x] = index;
}
