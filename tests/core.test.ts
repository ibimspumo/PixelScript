import { describe, expect, it } from 'vitest';

import {
  BASE64_CHARSET,
  createAnimation,
  createArt,
  decodePixelsString,
  definePalette,
  fromArray,
  renderSVG,
  parseCompact,
  parseDocument,
  validateDocument,
  stringifyDocument,
  validatePalette
} from '@/index';

describe('PixelScript core document model', () => {
  it('normalizes numeric arrays into compact base64 strings', () => {
    const document = createArt({
      width: 2,
      height: 2,
      pixels: [0, 1, 0, 1]
    });

    expect(document.frames[0]?.pixels).toBe('ABAB');
  });

  it('keeps compact parsing reversible', () => {
    const document = parseCompact({
      width: 2,
      height: 2,
      pixels: 'AB+/'
    });

    expect(Array.from(decodePixelsString(document.frames[0]!.pixels))).toEqual([0, 1, 62, 63]);
    expect(BASE64_CHARSET[62]).toBe('+');
    expect(BASE64_CHARSET[63]).toBe('/');
  });

  it('round-trips documents through JSON serialization', () => {
    const original = createAnimation({
      width: 2,
      height: 2,
      frames: [
        { pixels: [0, 1, 0, 1], durationMs: 120 },
        { pixels: [1, 0, 1, 0], durationMs: 180 }
      ],
      animation: { fps: 8, loop: true },
      meta: { name: 'Blink' }
    });

    const parsed = parseDocument(stringifyDocument(original));

    expect(parsed).toEqual(original);
  });

  it('exposes array helpers and validates custom palettes', () => {
    const document = fromArray({
      width: 2,
      height: 2,
      pixels: [0, 2, 2, 0],
      palette: definePalette({
        colors: [null, '#ffffff', '#ff5d38']
      })
    });

    expect(document.frames[0]?.pixels).toBe('ACCA');

    expect(() =>
      validatePalette({
        kind: 'custom',
        colors: ['#ffffff']
      })
    ).toThrow(/reserved for transparency/i);
  });

  it('uses frame overrides before global fps for timing', () => {
    const animation = createAnimation({
      width: 1,
      height: 1,
      frames: [
        { pixels: [0], durationMs: 100 },
        { pixels: [1] }
      ],
      animation: {
        fps: 5
      }
    });

    expect(animation.frames[0]?.durationMs).toBe(100);
    expect(animation.frames[1]?.durationMs).toBeUndefined();
  });

  it('validates pixel indices against palette size during document creation', () => {
    expect(() =>
      createArt({
        width: 2,
        height: 2,
        pixels: [0, 1, 2, 0],
        palette: definePalette({
          colors: [null, '#ffffff']
        })
      })
    ).toThrow(/palette slot count/i);
  });

  it('honors overridden default64 palettes when rendering', () => {
    const document = createArt({
      width: 2,
      height: 2,
      palette: {
        kind: 'default64',
        colors: [null, '#ff00ff', '#00ff00']
      },
      pixels: 'ABAA'
    });

    const svg = renderSVG(document, { scale: 1 });

    expect(svg).toContain('fill="rgb(255, 0, 255)"');
  });

  it('reports validation errors without throwing for external document checks', () => {
    const result = validateDocument({
      version: 1,
      width: 1,
      height: 1,
      palette: {
        kind: 'default64',
        colors: [null]
      },
      frames: [{ pixels: 'B' }]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/palette slot count|slot count/i);
  });
});
