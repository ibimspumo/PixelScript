import * as PixelScript from '@/index';
import { registerPixelArtElement } from '@/element/register';

registerPixelArtElement();

declare global {
  interface Window {
    PixelScript?: typeof PixelScript;
  }
}

if (typeof window !== 'undefined') {
  window.PixelScript = PixelScript;
}

export * from '@/index';
