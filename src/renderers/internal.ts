import { decodePixelsString } from '@/constants/base64';
import { parseHexColor, resolvePaletteColors } from '@/palette';
import type {
  PixelArtColorTransform,
  PixelArtGIFRenderOptions,
  PixelArtRenderOptions,
  PixelArtTransform,
  PixelArtTransformKeyframe,
  PixelArtColorKeyframe,
  PixelArtMotion,
  PixelScriptDocument
} from '@/schema/types';

type PixelArtRotateValue = 0 | 90 | 180 | 270;

interface ResolvedTransformOptions {
  rotate: PixelArtRotateValue;
  flipX: boolean;
  flipY: boolean;
}

interface ResolvedColorOptions {
  brightness: number;
  contrast: number;
  alpha: number;
  tint?: {
    red: number;
    green: number;
    blue: number;
  };
  tintAmount: number;
}

interface ResolvedMotionTransformKeyframe {
  at: number;
  value: {
    rotate?: PixelArtRotateValue;
    flipX?: boolean;
    flipY?: boolean;
  };
}

interface ResolvedMotionColorKeyframe {
  at: number;
  value: {
    brightness: number;
    contrast: number;
    alpha: number;
    tint?: {
      red: number;
      green: number;
      blue: number;
    };
    tintAmount: number;
  };
}

interface ResolvedMotionOptions {
  durationMs: number;
  transform?: ResolvedMotionTransformKeyframe[];
  color?: ResolvedMotionColorKeyframe[];
}

export interface ResolvedRenderOptions {
  scale: number;
  frame: number;
  fps: number;
  loop: boolean;
  transform: ResolvedTransformOptions;
  color: ResolvedColorOptions;
  motion?: ResolvedMotionOptions;
  motionTimeMs?: number;
}

export interface ResolvedFrameData {
  indices: Uint8Array;
  rgba: Uint8Array;
  durationMs: number;
  width: number;
  height: number;
}

export interface ResolvedDocumentData {
  document: PixelScriptDocument;
  width: number;
  height: number;
  frames: ResolvedFrameData[];
  paletteRgba: [number, number, number, number][];
  options: ResolvedRenderOptions;
}

export function resolveDocumentData(
  document: PixelScriptDocument,
  options: PixelArtRenderOptions = {}
): ResolvedDocumentData {
  const resolvedOptions = resolveRenderOptions(document, options);
  const paletteRgba = resolvePaletteColors(document.palette).map((color) => parseHexColor(color));
  const frameTimings = document.frames.map((frame) => frame.durationMs ?? Math.round(1000 / resolvedOptions.fps));
  const totalDuration = frameTimings.reduce((sum, duration) => sum + duration, 0);
  const motionDuration = resolvedOptions.motion?.durationMs ?? totalDuration;

  if (motionDuration <= 0) {
    throw new TypeError('motion.durationMs must be positive.');
  }

  let outputWidth = document.width;
  let outputHeight = document.height;
  let hasResolvedDimensions = false;
  let frameStartTime = 0;

  const frames = document.frames.map((frame) => {
    const indices = decodePixelsString(frame.pixels);
    const sampleTime = resolvedOptions.motionTimeMs ?? frameStartTime;
    const frameProgress = resolveMotionProgress(sampleTime, motionDuration);
    const motionTransform = resolveMotionTransform(resolvedOptions.transform, resolvedOptions.motion?.transform, frameProgress);
    const motionColor = resolveMotionColor(resolvedOptions.color, resolvedOptions.motion?.color, frameProgress);
    const transformed = applyGeometryTransform(indices, document.width, document.height, motionTransform);
    const motionPaletteRgba = paletteRgba.map((color) => applyColorTransformToPaletteColor(color, motionColor));

    if (!hasResolvedDimensions) {
      outputWidth = transformed.width;
      outputHeight = transformed.height;
      hasResolvedDimensions = true;
    } else if (outputWidth !== transformed.width || outputHeight !== transformed.height) {
      throw new RangeError('All transformed frames must keep the same dimensions for this render call.');
    }

    const rgba = decodeToRgba(transformed.indices, transformed.width, transformed.height, motionPaletteRgba);

    if (resolvedOptions.motionTimeMs === undefined) {
      frameStartTime += frame.durationMs ?? Math.round(1000 / resolvedOptions.fps);
    }

    return {
      indices: transformed.indices,
      rgba,
      width: transformed.width,
      height: transformed.height,
      durationMs: frame.durationMs ?? Math.round(1000 / resolvedOptions.fps)
    };
  });

  return {
    document,
    width: outputWidth,
    height: outputHeight,
    frames,
    paletteRgba,
    options: resolvedOptions
  };
}

export function resolveRenderOptions(
  document: PixelScriptDocument,
  options: PixelArtRenderOptions = {}
): ResolvedRenderOptions {
  const frameCount = document.frames.length;
  const scale = options.scale ?? 1;
  const frame = options.frame ?? 0;
  const fps = options.fps ?? document.animation?.fps ?? 8;
  const loop = options.loop ?? document.animation?.loop ?? false;
  const totalDuration = document.frames.reduce((sum, frame) => sum + (frame.durationMs ?? Math.round(1000 / fps)), 0);

  if (!Number.isInteger(scale) || scale < 1) {
    throw new RangeError('scale must be an integer of at least 1.');
  }

  if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) {
    throw new RangeError(`frame must be between 0 and ${frameCount - 1}.`);
  }

  if (typeof fps !== 'number' || Number.isNaN(fps) || fps <= 0) {
    throw new TypeError('fps must be a positive number.');
  }

  if (options.motionTimeMs !== undefined) {
    if (!Number.isFinite(options.motionTimeMs) || options.motionTimeMs < 0) {
      throw new TypeError('motionTimeMs must be a non-negative number.');
    }
  }

  const motion = resolveMotionOptions(options.motion, {
    durationMs: totalDuration
  });

  return {
    scale,
    frame,
    fps,
    loop,
    transform: resolveTransformOptions(options.transform),
    color: resolveColorOptions(options.color),
    ...(motion === undefined ? {} : { motion }),
    ...(options.motionTimeMs === undefined ? {} : { motionTimeMs: options.motionTimeMs })
  };
}

export function resolveGifIterations(
  document: PixelScriptDocument,
  options: PixelArtGIFRenderOptions = {}
): number | 'infinite' {
  if (options.iterations !== undefined) {
    if (options.iterations !== 'infinite' && (!Number.isInteger(options.iterations) || options.iterations < 1)) {
      throw new TypeError('GIF iterations must be a positive integer or "infinite".');
    }

    return options.iterations;
  }

  return document.animation?.loop ? 'infinite' : 1;
}

export function scaleRgbaFrame(
  rgba: Uint8Array,
  width: number,
  height: number,
  scale: number
): { width: number; height: number; rgba: Uint8Array } {
  if (scale === 1) {
    return {
      width,
      height,
      rgba
    };
  }

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaled = new Uint8Array(scaledWidth * scaledHeight * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 4;

      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const targetX = x * scale + dx;
          const targetY = y * scale + dy;
          const targetOffset = (targetY * scaledWidth + targetX) * 4;
          scaled[targetOffset] = rgba[sourceOffset]!;
          scaled[targetOffset + 1] = rgba[sourceOffset + 1]!;
          scaled[targetOffset + 2] = rgba[sourceOffset + 2]!;
          scaled[targetOffset + 3] = rgba[sourceOffset + 3]!;
        }
      }
    }
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    rgba: scaled
  };
}

export function scaleIndexedFrame(indices: Uint8Array, width: number, height: number, scale: number): Uint8Array {
  if (scale === 1) {
    return indices;
  }

  const scaledWidth = width * scale;
  const scaled = new Uint8Array(scaledWidth * height * scale);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = indices[y * width + x]!;

      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const targetX = x * scale + dx;
          const targetY = y * scale + dy;
          scaled[targetY * scaledWidth + targetX] = value;
        }
      }
    }
  }

  return scaled;
}

function decodeToRgba(
  indices: Uint8Array,
  width: number,
  height: number,
  paletteRgba: ReadonlyArray<[number, number, number, number]>
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);

  for (let index = 0; index < indices.length; index += 1) {
    const color = paletteRgba[indices[index]!];

    if (color === undefined) {
      throw new RangeError(`Pixel index ${indices[index]} is outside palette bounds.`);
    }

    const offset = index * 4;
    rgba[offset] = color[0];
    rgba[offset + 1] = color[1];
    rgba[offset + 2] = color[2];
    rgba[offset + 3] = color[3];
  }

  return rgba;
}

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError('motion keyframes must use an `at` value between 0 and 1.');
  }

  return value;
}

function compareProgress(a: PixelArtTransformKeyframe | PixelArtColorKeyframe, b: PixelArtTransformKeyframe | PixelArtColorKeyframe): number {
  return a.at - b.at;
}

function resolveMotionOptions(
  motion: PixelArtMotion | undefined,
  defaults: { durationMs: number }
): ResolvedMotionOptions | undefined {
  if (!motion) {
    return undefined;
  }

  const normalized: ResolvedMotionOptions = {
    durationMs: motion.durationMs ?? defaults.durationMs
  };

  if (normalized.durationMs <= 0) {
    throw new TypeError('motion.durationMs must be positive.');
  }

  if (motion.transform !== undefined) {
    const transform = [...motion.transform];
    transform.sort(compareProgress);
    normalized.transform = transform.map((frame) => ({
      at: normalizeProgress(frame.at),
      value: resolveTransformOptions(frame.value)
    }));
  }

  if (motion.color !== undefined) {
    const color = [...motion.color];
    color.sort(compareProgress);
    normalized.color = color.map((frame) => ({
      at: normalizeProgress(frame.at),
      value: resolveColorOptions(
        (() => {
          const value: PixelArtColorTransform = {};
          if (frame.value.brightness !== undefined) {
            value.brightness = frame.value.brightness;
          }
          if (frame.value.contrast !== undefined) {
            value.contrast = frame.value.contrast;
          }
          if (frame.value.alpha !== undefined) {
            value.alpha = frame.value.alpha;
          }
          if (frame.value.tint !== undefined) {
            value.tint = frame.value.tint;
          }
          if (frame.value.tintAmount !== undefined) {
            value.tintAmount = frame.value.tintAmount;
          }
          return value;
        })()
      )
    }));
  }

  return normalized;
}

function resolveMotionProgress(timeMs: number, durationMs: number): number {
  const normalized = timeMs / durationMs;
  return ((normalized % 1) + 1) % 1;
}

function resolveMotionTransform(
  base: ResolvedTransformOptions,
  transformMotion: ResolvedMotionTransformKeyframe[] | undefined,
  progress: number
): ResolvedTransformOptions {
  if (!transformMotion || transformMotion.length === 0) {
    return base;
  }

  const value: ResolvedTransformOptions = {
    rotate: base.rotate,
    flipX: base.flipX,
    flipY: base.flipY
  };

  for (const keyframe of transformMotion) {
    if (progress < keyframe.at) {
      break;
    }

    if (keyframe.value.rotate !== undefined) {
      value.rotate = keyframe.value.rotate;
    }

    if (keyframe.value.flipX !== undefined) {
      value.flipX = keyframe.value.flipX;
    }

    if (keyframe.value.flipY !== undefined) {
      value.flipY = keyframe.value.flipY;
    }
  }

  return value;
}

function resolveMotionColor(
  base: ResolvedColorOptions,
  colorMotion: ResolvedMotionColorKeyframe[] | undefined,
  progress: number
): ResolvedColorOptions {
  if (!colorMotion || colorMotion.length === 0) {
    return base;
  }

  const first = colorMotion[0]!;
  if (progress <= first.at) {
    return interpolateColor(base, resolveColorFrame(base, colorMotion, 0), first.at === 0 ? 0 : progress / first.at);
  }

  let left = 0;
  while (left + 1 < colorMotion.length && progress >= colorMotion[left + 1]!.at) {
    left += 1;
  }

  if (left === colorMotion.length - 1) {
    return resolveColorFrame(base, colorMotion, left);
  }

  const right = left + 1;
  const leftFrame = colorMotion[left]!;
  const rightFrame = colorMotion[right]!;
  const rightRange = rightFrame.at - leftFrame.at;
  const segmentProgress = rightRange === 0 ? 0 : (progress - leftFrame.at) / rightRange;

  const leftResolved = resolveColorFrame(base, colorMotion, left);
  const rightResolved = resolveColorFrame(base, colorMotion, right);

  return interpolateColor(leftResolved, rightResolved, segmentProgress);
}

function resolveColorFrame(
  base: ResolvedColorOptions,
  frames: ResolvedMotionColorKeyframe[],
  index: number
): ResolvedColorOptions {
  const color: ResolvedColorOptions = {
    brightness: base.brightness,
    contrast: base.contrast,
    alpha: base.alpha,
    tintAmount: base.tintAmount
  };

  if (base.tint !== undefined) {
    color.tint = base.tint;
  }

  for (let frameIndex = 0; frameIndex <= index; frameIndex += 1) {
    const keyframe = frames[frameIndex]!;
    if (keyframe.value.brightness !== undefined) {
      color.brightness = keyframe.value.brightness;
    }

    if (keyframe.value.contrast !== undefined) {
      color.contrast = keyframe.value.contrast;
    }

    if (keyframe.value.alpha !== undefined) {
      color.alpha = keyframe.value.alpha;
    }

    if (keyframe.value.tint !== undefined) {
      color.tint = keyframe.value.tint;
    }

    if (keyframe.value.tintAmount !== undefined) {
      color.tintAmount = keyframe.value.tintAmount;
    }
  }

  return color;
}

function interpolateColor(
  left: ResolvedColorOptions,
  right: ResolvedColorOptions,
  progress: number
): ResolvedColorOptions {
  const clampProgress = Math.min(1, Math.max(0, progress));
  const tint = interpolateTint(clampProgress, left.tint, right.tint);

  const color: ResolvedColorOptions = {
    brightness: left.brightness + (right.brightness - left.brightness) * clampProgress,
    contrast: left.contrast + (right.contrast - left.contrast) * clampProgress,
    alpha: left.alpha + (right.alpha - left.alpha) * clampProgress,
    tintAmount: left.tintAmount + (right.tintAmount - left.tintAmount) * clampProgress
  };

  if (tint !== undefined) {
    color.tint = tint;
  }

  return color;
}

function interpolateTint(
  progress: number,
  left?: { red: number; green: number; blue: number },
  right?: { red: number; green: number; blue: number },
): { red: number; green: number; blue: number } | undefined {
  if (!left && !right) {
    return undefined;
  }

  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  const clamped = Math.min(1, Math.max(0, progress));
  return {
    red: left.red + (right.red - left.red) * clamped,
    green: left.green + (right.green - left.green) * clamped,
    blue: left.blue + (right.blue - left.blue) * clamped
  };
}

function resolveTransformOptions(transform?: PixelArtTransform): ResolvedTransformOptions {
  if (transform === undefined) {
    return { rotate: 0, flipX: false, flipY: false };
  }

  const rotate = transform.rotate ?? 0;

  if (![0, 90, 180, 270].includes(rotate)) {
    throw new TypeError('transform.rotate must be 0, 90, 180, or 270.');
  }

  return {
    rotate: rotate as PixelArtRotateValue,
    flipX: Boolean(transform.flipX),
    flipY: Boolean(transform.flipY)
  };
}

function resolveColorOptions(color?: PixelArtColorTransform): ResolvedColorOptions {
  if (color === undefined) {
    return { brightness: 1, contrast: 1, alpha: 1, tintAmount: 0 };
  }

  const brightness = color.brightness ?? 1;
  const contrast = color.contrast ?? 1;
  const alpha = color.alpha ?? 1;
  const tintAmount = color.tintAmount ?? 0;

  if (!Number.isFinite(brightness) || brightness < 0) {
    throw new TypeError('color.brightness must be a non-negative number.');
  }

  if (!Number.isFinite(contrast) || contrast < 0) {
    throw new TypeError('color.contrast must be a non-negative number.');
  }

  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new TypeError('color.alpha must be between 0 and 1.');
  }

  if (!Number.isFinite(tintAmount) || tintAmount < 0 || tintAmount > 1) {
    throw new TypeError('color.tintAmount must be between 0 and 1.');
  }

  if (tintAmount > 0 && color.tint === undefined) {
    throw new TypeError('color.tint is required when color.tintAmount is set.');
  }

  const normalized: ResolvedColorOptions = {
    brightness,
    contrast,
    alpha,
    tintAmount
  };

  if (color.tint !== undefined) {
    normalized.tint = toRgbTuple(parseHexColor(color.tint));
  }

  return normalized;
}

function toRgbTuple([red, green, blue, alpha]: [number, number, number, number]): {
  red: number;
  green: number;
  blue: number;
} {
  return {
    red,
    green,
    blue
  };
}

function applyColorTransformToPaletteColor(
  color: readonly [number, number, number, number],
  colorTransform: ResolvedColorOptions
): [number, number, number, number] {
  let red = color[0];
  let green = color[1];
  let blue = color[2];

  if (colorTransform.tintAmount > 0 && colorTransform.tint !== undefined) {
    const remaining = 1 - colorTransform.tintAmount;
    red = red * remaining + colorTransform.tint.red * colorTransform.tintAmount;
    green = green * remaining + colorTransform.tint.green * colorTransform.tintAmount;
    blue = blue * remaining + colorTransform.tint.blue * colorTransform.tintAmount;
  }

  if (colorTransform.brightness !== 1) {
    red *= colorTransform.brightness;
    green *= colorTransform.brightness;
    blue *= colorTransform.brightness;
  }

  if (colorTransform.contrast !== 1) {
    red = (red - 128) * colorTransform.contrast + 128;
    green = (green - 128) * colorTransform.contrast + 128;
    blue = (blue - 128) * colorTransform.contrast + 128;
  }

  const alpha = clampByte(Math.round(color[3] * colorTransform.alpha));

  return [
    clampByte(Math.round(red)),
    clampByte(Math.round(green)),
    clampByte(Math.round(blue)),
    alpha
  ];
}

function applyGeometryTransform(
  indices: Uint8Array,
  width: number,
  height: number,
  transform: ResolvedTransformOptions
): { width: number; height: number; indices: Uint8Array } {
  if (transform.rotate === 0 && !transform.flipX && !transform.flipY) {
    return { width, height, indices: new Uint8Array(indices) };
  }

  const rotatedWidth = transform.rotate === 90 || transform.rotate === 270 ? height : width;
  const rotatedHeight = transform.rotate === 90 || transform.rotate === 270 ? width : height;
  const transformed = new Uint8Array(rotatedWidth * rotatedHeight);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = y * width + x;
      const sourceValue = indices[sourceOffset]!;
      let targetX = x;
      let targetY = y;

      switch (transform.rotate) {
        case 90: {
          targetX = height - 1 - y;
          targetY = x;
          break;
        }
        case 180: {
          targetX = width - 1 - x;
          targetY = height - 1 - y;
          break;
        }
        case 270: {
          targetX = y;
          targetY = width - 1 - x;
          break;
        }
      }

      if (transform.flipX) {
        targetX = rotatedWidth - 1 - targetX;
      }

      if (transform.flipY) {
        targetY = rotatedHeight - 1 - targetY;
      }

      transformed[targetY * rotatedWidth + targetX] = sourceValue;
    }
  }

  return {
    width: rotatedWidth,
    height: rotatedHeight,
    indices: transformed
  };
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, value));
}

export function totalAnimationDuration(document: PixelScriptDocument, options: PixelArtRenderOptions = {}): number {
  const resolved = resolveDocumentData(document, options);
  return resolved.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
}
