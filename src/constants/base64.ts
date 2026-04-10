export const BASE64_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const charToIndex = new Map(BASE64_CHARSET.split('').map((char, index) => [char, index]));

export function getBase64Char(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= BASE64_CHARSET.length) {
    throw new RangeError(`Palette index must be between 0 and ${BASE64_CHARSET.length - 1}.`);
  }

  return BASE64_CHARSET[index]!;
}

export function getBase64Index(char: string): number {
  if (char.length !== 1) {
    throw new TypeError('Compact pixel strings must be read one character at a time.');
  }

  const index = charToIndex.get(char);

  if (index === undefined) {
    throw new TypeError(`Unsupported compact pixel character "${char}".`);
  }

  return index;
}

export function encodeIndices(indices: ArrayLike<number>): string {
  let output = '';

  for (let index = 0; index < indices.length; index += 1) {
    output += getBase64Char(indices[index]!);
  }

  return output;
}

export function decodePixelsString(pixels: string): Uint8Array {
  const indices = new Uint8Array(pixels.length);

  for (let index = 0; index < pixels.length; index += 1) {
    indices[index] = getBase64Index(pixels[index]!);
  }

  return indices;
}
