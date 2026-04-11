import { describe, expect, it } from 'vitest';

import {
  createAnimation,
  createArt,
  definePalette,
  renderCanvas,
  renderDataURL,
  renderGIF,
  renderPNG,
  renderSVG
} from '@/index';
import { MemoryCanvas } from '@/renderers/memory-canvas';

const document = createAnimation({
  width: 2,
  height: 2,
  frames: [
    {
      pixels: [0, 1, 1, 0],
      durationMs: 100
    },
    {
      pixels: [1, 0, 0, 1],
      durationMs: 100
    }
  ],
  animation: {
    fps: 8,
    loop: true
  }
});

describe('PixelScript renderers', () => {
  it('renders the first frame to a canvas-like surface in Node', () => {
    const canvas = renderCanvas(document, { scale: 2 });

    expect(canvas).toBeInstanceOf(MemoryCanvas);
    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(4);

    const firstPixel = Array.from((canvas as MemoryCanvas).data.slice(0, 4));
    const secondPixel = Array.from((canvas as MemoryCanvas).data.slice(4, 8));

    expect(firstPixel).toEqual([0, 0, 0, 0]);
    expect(secondPixel).toEqual([0, 0, 0, 0]);
  });

  it('renders SVG with crisp rect output', () => {
    const svg = renderSVG(createArt({ width: 2, height: 2, pixels: [0, 1, 0, 1] }), { scale: 10 });

    expect(svg).toContain('<svg');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="rgb(255, 255, 255)"');
  });

  it('applies geometry transforms during render resolution', () => {
    const palette = definePalette({
      colors: [null, '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff']
    });

    const document = createArt({
      width: 2,
      height: 3,
      pixels: [0, 1, 2, 3, 4, 5],
      palette
    });

    const canvas = renderCanvas(document, { transform: { rotate: 90 } }) as MemoryCanvas;

    expect(canvas.width).toBe(3);
    expect(canvas.height).toBe(2);
    expect(Array.from(canvas.data.slice(0, 4))).toEqual([255, 255, 0, 255]);
  });

  it('applies color transforms during render resolution', () => {
    const document = createArt({
      width: 1,
      height: 1,
      pixels: [1],
      palette: definePalette({
        colors: [null, '#404040']
      })
    });

    const brightened = renderCanvas(document, { color: { brightness: 2 } }) as MemoryCanvas;

    expect(Array.from(brightened.data.slice(0, 4))).toEqual([128, 128, 128, 255]);
  });

  it('interpolates color keyframes at sample times', () => {
    const document = createArt({
      width: 1,
      height: 1,
      pixels: [1],
      palette: definePalette({
        colors: [null, '#404040']
      })
    });

    const sampled = renderCanvas(document, {
      color: { brightness: 1 },
      motion: {
        durationMs: 1000,
        color: [
          {
            at: 0,
            value: { brightness: 1 }
          },
          {
            at: 1,
            value: { brightness: 2 }
          }
        ]
      },
      motionTimeMs: 500
    }) as MemoryCanvas;

    expect(Array.from(sampled.data.slice(0, 4))).toEqual([96, 96, 96, 255]);
  });

  it('follows transform keyframes over timeline', () => {
    const document = createArt({
      width: 2,
      height: 1,
      pixels: [1, 2],
      palette: definePalette({
        colors: [null, '#ff0000', '#00ff00']
      })
    });

    const sampled = renderCanvas(document, {
      motion: {
        durationMs: 1000,
        transform: [
          {
            at: 0,
            value: { rotate: 0 }
          },
          {
            at: 0.4,
            value: { rotate: 90 }
          }
        ]
      },
      motionTimeMs: 500
    }) as MemoryCanvas;

    expect(sampled.width).toBe(1);
    expect(sampled.height).toBe(2);
    expect(Array.from(sampled.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });

  it('renders PNG bytes with the PNG header signature', async () => {
    const png = await renderPNG(document, { scale: 2 });

    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('renders GIF bytes with the GIF89a header', async () => {
    const gif = await renderGIF(document, { scale: 2, iterations: 2 });
    const header = new TextDecoder().decode(gif.slice(0, 6));

    expect(header).toBe('GIF89a');
  });

  it('renders data URLs for svg, png, and gif', async () => {
    const svgUrl = renderDataURL(document, { format: 'svg', scale: 2 });
    const pngUrl = await renderDataURL(document, { format: 'png', scale: 2 });
    const gifUrl = await renderDataURL(document, { format: 'gif', scale: 2 });

    expect(svgUrl).toMatch(/^data:image\/svg\+xml/);
    expect(pngUrl).toMatch(/^data:image\/png;base64,/);
    expect(gifUrl).toMatch(/^data:image\/gif;base64,/);
  });
});
