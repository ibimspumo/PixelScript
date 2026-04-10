import { MemoryCanvas } from './memory-canvas';
import { resolveDocumentData, scaleRgbaFrame } from './internal';
import type { PixelArtRenderOptions, PixelScriptDocument } from '@/schema/types';

export type PixelScriptCanvas = HTMLCanvasElement | OffscreenCanvas | MemoryCanvas;

export function renderCanvas(document: PixelScriptDocument, options: PixelArtRenderOptions = {}): PixelScriptCanvas {
  const resolved = resolveDocumentData(document, options);
  const frame = resolved.frames[resolved.options.frame]!;
  const scaled = scaleRgbaFrame(frame.rgba, resolved.width, resolved.height, resolved.options.scale);

  if (typeof documentGlobal !== 'undefined') {
    const canvas = documentGlobal.createElement('canvas');
    paintBrowserCanvas(canvas, scaled.width, scaled.height, scaled.rgba);
    return canvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(scaled.width, scaled.height);
    paintContext(canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null, scaled.width, scaled.height, scaled.rgba);
    return canvas;
  }

  const canvas = new MemoryCanvas(scaled.width, scaled.height);
  canvas.setPixels(scaled.rgba);
  return canvas;
}

export function paintBrowserCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
  rgba: Uint8Array
): void {
  canvas.width = width;
  canvas.height = height;

  if ('style' in canvas) {
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
  }

  paintContext(canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null, width, height, rgba);
}

function paintContext(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  width: number,
  height: number,
  rgba: Uint8Array
): void {
  if (!context) {
    throw new Error('Could not acquire a 2D canvas context.');
  }

  context.clearRect(0, 0, width, height);

  if ('imageSmoothingEnabled' in context) {
    context.imageSmoothingEnabled = false;
  }

  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  context.putImageData(imageData, 0, 0);
}

const documentGlobal = typeof document !== 'undefined' ? document : undefined;
