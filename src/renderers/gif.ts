import { GIFEncoder } from 'gifenc';

import { resolveDocumentData, resolveGifIterations, scaleIndexedFrame } from './internal';
import type { PixelArtGIFRenderOptions, PixelScriptDocument } from '@/schema/types';

export async function renderGIF(
  document: PixelScriptDocument,
  options: PixelArtGIFRenderOptions = {}
): Promise<Uint8Array> {
  const resolved = resolveDocumentData(document, options);
  const scaledWidth = resolved.width * resolved.options.scale;
  const scaledHeight = resolved.height * resolved.options.scale;
  const palette = resolved.paletteRgba.map(([red, green, blue]) => [red, green, blue] as [number, number, number]);
  const encoder = GIFEncoder();
  const iterations = resolveGifIterations(document, options);
  const repeat = iterations === 'infinite' ? 0 : iterations === 1 ? -1 : iterations - 1;
  const colorDepth = Math.max(1, Math.ceil(Math.log2(palette.length || 1)));

  for (const frame of resolved.frames) {
    encoder.writeFrame(scaleIndexedFrame(frame.indices, resolved.width, resolved.height, resolved.options.scale), scaledWidth, scaledHeight, {
      palette,
      delay: frame.durationMs,
      repeat,
      transparent: true,
      transparentIndex: 0,
      colorDepth
    });
  }

  encoder.finish();
  return encoder.bytesView();
}
