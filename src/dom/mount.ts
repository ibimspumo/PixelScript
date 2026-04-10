import { PixelArtRuntimeController } from './controller';
import type { PixelArtController, PixelArtMountOptions, PixelScriptDocument } from '@/schema/types';

export function mountPixelArt(
  target: HTMLElement,
  document: PixelScriptDocument,
  options: PixelArtMountOptions = {}
): PixelArtController {
  return new PixelArtRuntimeController(target, document, options);
}
