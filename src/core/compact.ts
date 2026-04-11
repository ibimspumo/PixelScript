import { decodePixelsString, encodeIndices } from '@/constants/base64';
import type {
  PixelScriptArrayInput,
  PixelScriptCompactInput,
  PixelScriptDocument,
  PixelScriptPixelInput
} from '@/schema/types';
import { getPaletteColorCount, normalizePalette } from '@/palette';

export function normalizePixelsInput(
  pixels: PixelScriptPixelInput,
  width: number,
  height: number,
  maxIndex = 63
): string {
  const expectedLength = width * height;

  if (typeof pixels === 'string') {
    if (pixels.length !== expectedLength) {
      throw new RangeError(`Expected ${expectedLength} compact pixels, received ${pixels.length}.`);
    }

    const decoded = decodePixelsString(pixels);

    for (let index = 0; index < decoded.length; index += 1) {
      if (decoded[index]! > maxIndex) {
        throw new RangeError(`Pixel index at ${index} (${decoded[index]}) exceeds palette slot count ${maxIndex + 1}.`);
      }
    }

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

    if (value > maxIndex) {
      throw new RangeError(`Pixel index at ${index} (${value}) exceeds palette slot count ${maxIndex + 1}.`);
    }

    indices[index] = value;
  }

  return encodeIndices(indices);
}

export function parseCompact(input: PixelScriptCompactInput): PixelScriptDocument {
  const palette = normalizePalette(input.palette);
  const maxIndex = getPaletteColorCount(palette) - 1;

  const document: PixelScriptDocument = {
    version: 1,
    width: input.width,
    height: input.height,
    palette,
    frames: [
      {
        pixels: normalizePixelsInput(input.pixels, input.width, input.height, maxIndex)
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
  const palette = normalizePalette(input.palette);
  const maxIndex = getPaletteColorCount(palette) - 1;

  return parseCompact({
    width: input.width,
    height: input.height,
    pixels: normalizePixelsInput(input.pixels, input.width, input.height, maxIndex),
    palette,
    ...(input.animation ? { animation: input.animation } : {}),
    ...(input.meta ? { meta: input.meta } : {})
  });
}
