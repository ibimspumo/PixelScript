import { DEFAULT_PALETTE_NAME, PIXELSCRIPT_64 } from './default64';
import type { PixelScriptPalette, PixelScriptPaletteColor } from '@/schema/types';

const HEX_COLOR_PATTERN = /^#(?:[\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/;

export function getDefaultPalette(): PixelScriptPalette {
  return {
    kind: 'default64',
    name: DEFAULT_PALETTE_NAME,
    colors: [...PIXELSCRIPT_64]
  };
}

export function definePalette(input: { name?: string; colors: PixelScriptPaletteColor[] }): PixelScriptPalette {
  return validatePalette({
    kind: 'custom',
    ...(input.name ? { name: input.name } : {}),
    colors: [...input.colors]
  });
}

export function validatePalette(palette: PixelScriptPalette): PixelScriptPalette {
  if (palette.kind === 'default64') {
    if (palette.colors !== undefined) {
      validatePaletteColors(palette.colors);
    }

    const normalized: PixelScriptPalette = {
      kind: 'default64',
      name: palette.name ?? DEFAULT_PALETTE_NAME
    };

    if (palette.colors) {
      normalized.colors = [...palette.colors];
    }

    return normalized;
  }

  if (!Array.isArray(palette.colors)) {
    throw new TypeError('Custom palettes must provide a colors array.');
  }

  validatePaletteColors(palette.colors);

  const normalized: PixelScriptPalette = {
    kind: 'custom',
    colors: [...palette.colors]
  };

  if (palette.name) {
    normalized.name = palette.name;
  }

  return normalized;
}

export function normalizePalette(palette?: PixelScriptPalette | 'default64'): PixelScriptPalette {
  if (!palette || palette === 'default64') {
    return {
      kind: 'default64',
      name: DEFAULT_PALETTE_NAME
    };
  }

  return validatePalette(palette);
}

export function resolvePaletteColors(palette: PixelScriptPalette): readonly PixelScriptPaletteColor[] {
  if (palette.kind === 'default64') {
    return PIXELSCRIPT_64;
  }

  return palette.colors ?? PIXELSCRIPT_64;
}

export function parseHexColor(color: string | null): [number, number, number, number] {
  if (color === null) {
    return [0, 0, 0, 0];
  }

  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new TypeError(`Unsupported palette color "${color}". Use hex notation like #fff or #112233ff.`);
  }

  const expanded = normalizeHex(color);

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
    Number.parseInt(expanded.slice(6, 8), 16)
  ];
}

function validatePaletteColors(colors: PixelScriptPaletteColor[]): void {
  if (colors.length < 1 || colors.length > 64) {
    throw new RangeError('Palette color arrays must contain between 1 and 64 entries.');
  }

  if (colors[0] !== null) {
    throw new TypeError('Palette index 0 is reserved for transparency and must be null.');
  }

  for (let index = 1; index < colors.length; index += 1) {
    const color = colors[index];

    if (typeof color !== 'string' || !HEX_COLOR_PATTERN.test(color)) {
      throw new TypeError(`Invalid palette color at index ${index}. Use null or a hex color string.`);
    }
  }
}

function normalizeHex(color: string): string {
  const value = color.slice(1);

  if (value.length === 3) {
    return `${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}ff`;
  }

  if (value.length === 4) {
    return `${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  if (value.length === 6) {
    return `${value}ff`;
  }

  return value;
}
