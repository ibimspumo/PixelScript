import { zlibSync } from 'fflate';

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = createCrcTable();

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) {
    throw new RangeError('RGBA buffer size does not match PNG dimensions.');
  }

  const scanlines = new Uint8Array((width * 4 + 1) * height);

  for (let row = 0; row < height; row += 1) {
    const targetOffset = row * (width * 4 + 1);
    const sourceOffset = row * width * 4;
    scanlines[targetOffset] = 0;
    scanlines.set(rgba.subarray(sourceOffset, sourceOffset + width * 4), targetOffset + 1);
  }

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlibSync(scanlines);

  return concatBytes(
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', new Uint8Array(0))
  );
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);

  const typeOffset = 4;
  chunk[typeOffset] = type.charCodeAt(0);
  chunk[typeOffset + 1] = type.charCodeAt(1);
  chunk[typeOffset + 2] = type.charCodeAt(2);
  chunk[typeOffset + 3] = type.charCodeAt(3);
  chunk.set(data, 8);

  const crc = crc32(chunk.subarray(4, 8 + data.length));
  writeUint32(chunk, chunk.length - 4, crc);

  return chunk;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function crc32(data: Uint8Array): number {
  let crc = -1;

  for (let index = 0; index < data.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[index]!) & 0xff]!;
  }

  return (crc ^ -1) >>> 0;
}

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }

    table[index] = value >>> 0;
  }

  return table;
}
