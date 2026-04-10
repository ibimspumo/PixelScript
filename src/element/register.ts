import { PixelArtElement } from './pixel-art-element';

export function registerPixelArtElement(tagName = 'pixel-art'): void {
  if (typeof customElements === 'undefined') {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, PixelArtElement);
  }
}

export { PixelArtElement };
