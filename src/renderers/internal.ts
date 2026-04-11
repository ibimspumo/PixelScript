import { decodePixelsString } from '@/constants/base64';
import { parseHexColor, resolvePaletteColors } from '@/palette';
import type {
  PixelArtGIFRenderOptions,
  PixelArtRenderOptions,
  PixelScriptDocument
} from '@/schema/types';

export interface ResolvedRenderOptions {
  scale: number;
  frame: number;
  fps: number;
  loop: boolean;
}

export interface ResolvedFrameData {
  indices: Uint8Array;
  rgba: Uint8Array;
  durationMs: number;
}

export interface ResolvedDocumentData {
  document: PixelScriptDocument;
  width: number;
  height: number;
  frames: ResolvedFrameData[];
  paletteRgba: [number, number, number, number][];
  options: ResolvedRenderOptions;
}

export function resolveDocumentData(
  document: PixelScriptDocument,
  options: PixelArtRenderOptions = {}
): ResolvedDocumentData {
  const resolvedOptions = resolveRenderOptions(document, options);
  const paletteRgba = resolvePaletteColors(document.palette).map((color) => parseHexColor(color));

  const frames = document.frames.map((frame) => {
    const indices = decodePixelsString(frame.pixels);
    const rgba = new Uint8Array(indices.length * 4);

    for (let index = 0; index < indices.length; index += 1) {
      const color = paletteRgba[indices[index]!];

      if (color === undefined) {
        throw new RangeError(`Pixel index ${indices[index]} is outside palette bounds.`);
      }

      const [red, green, blue, alpha] = color;
      const offset = index * 4;
      rgba[offset] = red;
      rgba[offset + 1] = green;
      rgba[offset + 2] = blue;
      rgba[offset + 3] = alpha;
    }

    return {
      indices,
      rgba,
      durationMs: frame.durationMs ?? Math.round(1000 / resolvedOptions.fps)
    };
  });

  return {
    document,
    width: document.width,
    height: document.height,
    frames,
    paletteRgba,
    options: resolvedOptions
  };
}

export function resolveRenderOptions(
  document: PixelScriptDocument,
  options: PixelArtRenderOptions = {}
): ResolvedRenderOptions {
  const frameCount = document.frames.length;
  const scale = options.scale ?? 1;
  const frame = options.frame ?? 0;
  const fps = options.fps ?? document.animation?.fps ?? 8;
  const loop = options.loop ?? document.animation?.loop ?? false;

  if (!Number.isInteger(scale) || scale < 1) {
    throw new RangeError('scale must be an integer of at least 1.');
  }

  if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) {
    throw new RangeError(`frame must be between 0 and ${frameCount - 1}.`);
  }

  if (typeof fps !== 'number' || Number.isNaN(fps) || fps <= 0) {
    throw new TypeError('fps must be a positive number.');
  }

  return {
    scale,
    frame,
    fps,
    loop
  };
}

export function resolveGifIterations(
  document: PixelScriptDocument,
  options: PixelArtGIFRenderOptions = {}
): number | 'infinite' {
  if (options.iterations !== undefined) {
    if (options.iterations !== 'infinite' && (!Number.isInteger(options.iterations) || options.iterations < 1)) {
      throw new TypeError('GIF iterations must be a positive integer or "infinite".');
    }

    return options.iterations;
  }

  return document.animation?.loop ? 'infinite' : 1;
}

export function scaleRgbaFrame(
  rgba: Uint8Array,
  width: number,
  height: number,
  scale: number
): { width: number; height: number; rgba: Uint8Array } {
  if (scale === 1) {
    return {
      width,
      height,
      rgba
    };
  }

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaled = new Uint8Array(scaledWidth * scaledHeight * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 4;

      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const targetX = x * scale + dx;
          const targetY = y * scale + dy;
          const targetOffset = (targetY * scaledWidth + targetX) * 4;
          scaled[targetOffset] = rgba[sourceOffset]!;
          scaled[targetOffset + 1] = rgba[sourceOffset + 1]!;
          scaled[targetOffset + 2] = rgba[sourceOffset + 2]!;
          scaled[targetOffset + 3] = rgba[sourceOffset + 3]!;
        }
      }
    }
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    rgba: scaled
  };
}

export function scaleIndexedFrame(indices: Uint8Array, width: number, height: number, scale: number): Uint8Array {
  if (scale === 1) {
    return indices;
  }

  const scaledWidth = width * scale;
  const scaled = new Uint8Array(scaledWidth * height * scale);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = indices[y * width + x]!;

      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const targetX = x * scale + dx;
          const targetY = y * scale + dy;
          scaled[targetY * scaledWidth + targetX] = value;
        }
      }
    }
  }

  return scaled;
}

export function totalAnimationDuration(document: PixelScriptDocument, options: PixelArtRenderOptions = {}): number {
  const resolved = resolveDocumentData(document, options);
  return resolved.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
}
