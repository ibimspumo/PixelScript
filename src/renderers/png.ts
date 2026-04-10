import { resolveDocumentData, scaleRgbaFrame } from './internal';
import { encodePng } from './png-encoder';
import type { PixelArtRenderOptions, PixelScriptDocument } from '@/schema/types';

export async function renderPNG(document: PixelScriptDocument, options: PixelArtRenderOptions = {}): Promise<Uint8Array> {
  const resolved = resolveDocumentData(document, options);
  const frame = resolved.frames[resolved.options.frame]!;
  const scaled = scaleRgbaFrame(frame.rgba, resolved.width, resolved.height, resolved.options.scale);
  return encodePng(scaled.width, scaled.height, scaled.rgba);
}
