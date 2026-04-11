import { normalizePixelsInput } from './compact';
import { getPaletteColorCount, normalizePalette, validatePalette } from '@/palette';
import type {
  PixelScriptAnimationInput,
  PixelScriptArtInput,
  PixelScriptDocument,
  PixelScriptFrame,
  PixelScriptMeta,
  PixelScriptPalette,
  PixelScriptValidationResult
} from '@/schema/types';

export function createArt(input: PixelScriptArtInput): PixelScriptDocument {
  const palette = normalizePalette(input.palette);
  const maxPixelIndex = getPaletteColorCount(palette) - 1;

  return finalizeDocument({
    version: 1,
    width: input.width,
    height: input.height,
    palette,
    frames: [
      {
        pixels: normalizePixelsInput(input.pixels, input.width, input.height, maxPixelIndex)
      }
    ],
    ...(input.animation ? { animation: input.animation } : {}),
    ...(input.meta ? { meta: input.meta } : {})
  });
}

export function createAnimation(input: PixelScriptAnimationInput): PixelScriptDocument {
  const palette = normalizePalette(input.palette);
  const maxPixelIndex = getPaletteColorCount(palette) - 1;

  return finalizeDocument({
    version: 1,
    width: input.width,
    height: input.height,
    palette,
    frames: input.frames.map((frame) => ({
      pixels: normalizePixelsInput(frame.pixels, input.width, input.height, maxPixelIndex),
      ...(frame.durationMs ? { durationMs: frame.durationMs } : {})
    })),
    ...(input.animation ? { animation: input.animation } : {}),
    ...(input.meta ? { meta: input.meta } : {})
  });
}

export function parseDocument(input: string | PixelScriptDocument): PixelScriptDocument {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  return finalizeDocument(parsed);
}

export function validateDocument(document: unknown): PixelScriptValidationResult {
  try {
    finalizeDocument(document);
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export function stringifyDocument(document: PixelScriptDocument, space = 2): string {
  return JSON.stringify(finalizeDocument(document), null, space);
}

export function finalizeDocument(document: unknown): PixelScriptDocument {
  if (!isRecord(document)) {
    throw new TypeError('PixelScript documents must be objects.');
  }

  const version = document.version;
  const width = document.width;
  const height = document.height;
  const palette = document.palette;
  const frames = document.frames;
  const animation = document.animation;
  const meta = document.meta;

  if (version !== 1) {
    throw new TypeError('PixelScript document version must be 1.');
  }

  assertPositiveInteger(width, 'width');
  assertPositiveInteger(height, 'height');

  if (!Array.isArray(frames) || frames.length < 1) {
    throw new TypeError('PixelScript documents must contain at least one frame.');
  }

  const normalizedPalette = validatePaletteObject(palette);
  const maxPixelIndex = getPaletteColorCount(normalizedPalette) - 1;
  const normalizedFrames = frames.map((frame, index) => normalizeFrame(frame, width, height, index, maxPixelIndex));

  const normalizedDocument: PixelScriptDocument = {
    version: 1,
    width,
    height,
    palette: normalizedPalette,
    frames: normalizedFrames
  };

  const normalizedAnimation = normalizeAnimation(animation);
  const normalizedMeta = normalizeMeta(meta);

  if (normalizedAnimation) {
    normalizedDocument.animation = normalizedAnimation;
  }

  if (normalizedMeta) {
    normalizedDocument.meta = normalizedMeta;
  }

  return normalizedDocument;
}

function normalizeFrame(
  frame: unknown,
  width: number,
  height: number,
  index: number,
  maxPixelIndex: number
): PixelScriptFrame {
  if (!isRecord(frame)) {
    throw new TypeError(`Frame ${index} must be an object.`);
  }

  if (typeof frame.pixels !== 'string') {
    throw new TypeError(`Frame ${index} is missing a compact pixel string.`);
  }

  const normalized: PixelScriptFrame = {
    pixels: normalizePixelsInput(frame.pixels, width, height, maxPixelIndex)
  };

  if (frame.durationMs !== undefined) {
    assertPositiveInteger(frame.durationMs, `frames[${index}].durationMs`);
    normalized.durationMs = frame.durationMs;
  }

  return normalized;
}

function validatePaletteObject(palette: unknown): PixelScriptPalette {
  if (!isRecord(palette) || (palette.kind !== 'default64' && palette.kind !== 'custom')) {
    throw new TypeError('PixelScript documents must provide a valid palette definition.');
  }

  return validatePalette({
    kind: palette.kind,
    ...(typeof palette.name === 'string' ? { name: palette.name } : {}),
    ...(Array.isArray(palette.colors) ? { colors: [...palette.colors] } : {})
  });
}

function normalizeAnimation(animation: unknown): PixelScriptDocument['animation'] {
  if (animation === undefined) {
    return undefined;
  }

  if (!isRecord(animation)) {
    throw new TypeError('animation must be an object when provided.');
  }

  const normalized: NonNullable<PixelScriptDocument['animation']> = {};

  if (animation.fps !== undefined) {
    if (typeof animation.fps !== 'number' || Number.isNaN(animation.fps) || animation.fps <= 0) {
      throw new TypeError('animation.fps must be a positive number.');
    }

    normalized.fps = animation.fps;
  }

  if (animation.loop !== undefined) {
    if (typeof animation.loop !== 'boolean') {
      throw new TypeError('animation.loop must be a boolean.');
    }

    normalized.loop = animation.loop;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeMeta(meta: unknown): PixelScriptMeta | undefined {
  if (meta === undefined) {
    return undefined;
  }

  if (!isRecord(meta)) {
    throw new TypeError('meta must be an object when provided.');
  }

  const normalized: PixelScriptMeta = {};

  if (typeof meta.name === 'string') {
    normalized.name = meta.name;
  }

  if (typeof meta.author === 'string') {
    normalized.author = meta.author;
  }

  if (typeof meta.description === 'string') {
    normalized.description = meta.description;
  }

  if (Array.isArray(meta.tags)) {
    normalized.tags = meta.tags.map((tag, index) => {
      if (typeof tag !== 'string') {
        throw new TypeError(`meta.tags[${index}] must be a string.`);
      }

      return tag;
    });
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
