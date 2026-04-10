import { bytesToDataUrl } from './utils';
import { encodePng } from './png-encoder';

export class MemoryCanvas {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  setPixels(rgba: Uint8Array): void {
    this.data = new Uint8ClampedArray(rgba);
  }

  getContext(contextType: '2d'): MemoryCanvasContext2D | null {
    if (contextType !== '2d') {
      return null;
    }

    return new MemoryCanvasContext2D(this);
  }

  toBuffer(): Uint8Array {
    return encodePng(this.width, this.height, Uint8Array.from(this.data));
  }

  toDataURL(): string {
    return bytesToDataUrl(this.toBuffer(), 'image/png');
  }
}

export class MemoryCanvasContext2D {
  constructor(private readonly canvas: MemoryCanvas) {}

  putImageData(imageData: { data: Uint8Array | Uint8ClampedArray }, _x: number, _y: number): void {
    this.canvas.setPixels(Uint8Array.from(imageData.data));
  }

  getImageData(_x: number, _y: number, width: number, height: number): { data: Uint8ClampedArray } {
    if (width !== this.canvas.width || height !== this.canvas.height) {
      throw new RangeError('MemoryCanvas only supports reading the full canvas surface.');
    }

    return {
      data: new Uint8ClampedArray(this.canvas.data)
    };
  }
}
