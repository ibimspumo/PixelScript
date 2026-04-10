import { renderGIF } from './gif';
import { renderPNG } from './png';
import { renderSVG } from './svg';
import { bytesToDataUrl } from './utils';
import type { PixelArtDataUrlOptions, PixelScriptDocument } from '@/schema/types';

export function renderDataURL(document: PixelScriptDocument, options: PixelArtDataUrlOptions): Promise<string> | string {
  if (options.format === 'svg') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(document, options))}`;
  }

  if (options.format === 'png') {
    return renderPNG(document, options).then((bytes) => bytesToDataUrl(bytes, 'image/png'));
  }

  if (options.format === 'gif') {
    return renderGIF(document, options).then((bytes) => bytesToDataUrl(bytes, 'image/gif'));
  }

  return renderPNG(document, options).then((bytes) => bytesToDataUrl(bytes, 'image/png'));
}
