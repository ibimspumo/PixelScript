declare module 'gifenc' {
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        transparent?: boolean;
        transparentIndex?: number;
        delay?: number;
        palette?: Array<[number, number, number]>;
        repeat?: number;
        colorDepth?: number;
        dispose?: number;
      }
    ): void;
    finish(): void;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GIFEncoderInstance;
}
