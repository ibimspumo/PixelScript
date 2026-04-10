import { resolveDocumentData } from './internal';
import type { PixelArtRenderOptions, PixelScriptDocument } from '@/schema/types';

export function renderSVG(document: PixelScriptDocument, options: PixelArtRenderOptions = {}): string {
  const resolved = resolveDocumentData(document, options);
  const frame = resolved.frames[resolved.options.frame]!;
  const scale = resolved.options.scale;
  const rects: string[] = [];

  for (let y = 0; y < resolved.height; y += 1) {
    let x = 0;

    while (x < resolved.width) {
      const pixelOffset = (y * resolved.width + x) * 4;
      const alpha = frame.rgba[pixelOffset + 3]!;

      if (alpha === 0) {
        x += 1;
        continue;
      }

      let runLength = 1;

      while (x + runLength < resolved.width) {
        const nextOffset = (y * resolved.width + x + runLength) * 4;

        if (
          frame.rgba[nextOffset] !== frame.rgba[pixelOffset] ||
          frame.rgba[nextOffset + 1] !== frame.rgba[pixelOffset + 1] ||
          frame.rgba[nextOffset + 2] !== frame.rgba[pixelOffset + 2] ||
          frame.rgba[nextOffset + 3] !== alpha
        ) {
          break;
        }

        runLength += 1;
      }

      rects.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${runLength * scale}" height="${scale}"${formatFill(
          frame.rgba[pixelOffset]!,
          frame.rgba[pixelOffset + 1]!,
          frame.rgba[pixelOffset + 2]!,
          alpha
        )} />`
      );

      x += runLength;
    }
  }

  const width = resolved.width * scale;
  const height = resolved.height * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges" role="img" aria-label="PixelScript pixel art">${rects.join('')}</svg>`;
}

function formatFill(red: number, green: number, blue: number, alpha: number): string {
  const opacity = alpha / 255;

  if (opacity >= 1) {
    return ` fill="rgb(${red}, ${green}, ${blue})"`;
  }

  return ` fill="rgb(${red}, ${green}, ${blue})" fill-opacity="${opacity.toFixed(3)}"`;
}
