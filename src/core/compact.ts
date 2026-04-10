import { decodePixelsString, encodeIndices } from '@/constants/base64';
import type {
  PixelScriptArrayInput,
  PixelScriptCompactInput,
  PixelScriptDocument,
  PixelScriptPixelInput
} from '@/schema/types';
import { normalizePalette } from '@/palette';

export function normalizePixelsInput(
  pixels: PixelScriptPixelInput,
  width: number,
  height: number
): string {
  const expectedLength = width * height;

  if (typeof pixels === 'string') {
    if (pixels.length !== expectedLength) {
      throw new RangeError(`Expected ${expectedLength} compact pixels, received ${pixels.length}.`);
    }

    decodePixelsString(pixels);
    return pixels;
  }

  if (pixels.length !== expectedLength) {
    throw new RangeError(`Expected ${expectedLength} pixels, received ${pixels.length}.`);
  }

  const indices = new Uint8Array(expectedLength);

  for (let index = 0; index < pixels.length; index += 1) {
    const value = pixels[index]!;

    if (!Number.isInteger(value) || value < 0 || value > 63) {
      throw new RangeError(`Pixel values must be integers between 0 and 63. Invalid value at ${index}: ${value}`);
    }

    indices[index] = value;
  }

  return encodeIndices(indices);
}

export function parseCompact(input: PixelScriptCompactInput): PixelScriptDocument {
  const document: PixelScriptDocument = {
    version: 1,
    width: input.width,
    height: input.height,
    palette: normalizePalette(input.palette),
    frames: [
      {
        pixels: normalizePixelsInput(input.pixels, input.width, input.height)
      }
    ]
  };

  if (input.animation) {
    document.animation = input.animation;
  }

  if (input.meta) {
    document.meta = input.meta;
  }

  return document;
}

export function fromArray(input: PixelScriptArrayInput): PixelScriptDocument {
  return parseCompact({
    width: input.width,
    height: input.height,
    pixels: normalizePixelsInput(input.pixels, input.width, input.height),
    ...(input.palette ? { palette: input.palette } : {}),
    ...(input.animation ? { animation: input.animation } : {}),
    ...(input.meta ? { meta: input.meta } : {})
  });
}
