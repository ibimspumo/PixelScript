export type PixelScriptPaletteColor = string | null;

export interface PixelScriptPalette {
  kind: 'default64' | 'custom';
  name?: string;
  colors?: PixelScriptPaletteColor[];
}

export interface PixelScriptFrame {
  pixels: string;
  durationMs?: number;
}

export interface PixelScriptAnimationSettings {
  fps?: number;
  loop?: boolean;
}

export interface PixelScriptMeta {
  name?: string;
  author?: string;
  description?: string;
  tags?: string[];
}

export type PixelArtRotate = 0 | 90 | 180 | 270;

export interface PixelArtTransform {
  rotate?: PixelArtRotate;
  flipX?: boolean;
  flipY?: boolean;
}

export interface PixelArtColorTransform {
  brightness?: number;
  contrast?: number;
  alpha?: number;
  tint?: string;
  tintAmount?: number;
}

export interface PixelArtTransformKeyframe {
  at: number;
  value: PixelArtTransform;
}

export interface PixelArtColorKeyframe {
  at: number;
  value: PixelArtColorTransform;
}

export interface PixelArtMotion {
  durationMs?: number;
  transform?: PixelArtTransformKeyframe[];
  color?: PixelArtColorKeyframe[];
}

export interface PixelScriptDocument {
  version: 1;
  width: number;
  height: number;
  palette: PixelScriptPalette;
  frames: PixelScriptFrame[];
  animation?: PixelScriptAnimationSettings;
  meta?: PixelScriptMeta;
}

export type PixelScriptPixelInput = string | number[] | Uint8Array;

export interface PixelScriptFrameInput {
  pixels: PixelScriptPixelInput;
  durationMs?: number;
}

export interface PixelScriptArtInput {
  width: number;
  height: number;
  pixels: PixelScriptPixelInput;
  palette?: PixelScriptPalette | 'default64';
  animation?: PixelScriptAnimationSettings;
  meta?: PixelScriptMeta;
}

export interface PixelScriptAnimationInput {
  width: number;
  height: number;
  frames: PixelScriptFrameInput[];
  palette?: PixelScriptPalette | 'default64';
  animation?: PixelScriptAnimationSettings;
  meta?: PixelScriptMeta;
}

export interface PixelScriptCompactInput {
  width: number;
  height: number;
  pixels: string;
  palette?: PixelScriptPalette | 'default64';
  animation?: PixelScriptAnimationSettings;
  meta?: PixelScriptMeta;
}

export interface PixelScriptArrayInput {
  width: number;
  height: number;
  pixels: number[] | Uint8Array;
  palette?: PixelScriptPalette | 'default64';
  animation?: PixelScriptAnimationSettings;
  meta?: PixelScriptMeta;
}

export type PixelArtRenderMode = 'canvas' | 'svg' | 'png' | 'gif';

export interface PixelArtRenderOptions {
  scale?: number;
  frame?: number;
  fps?: number;
  loop?: boolean;
  transform?: PixelArtTransform;
  color?: PixelArtColorTransform;
  motion?: PixelArtMotion;
  motionTimeMs?: number;
}

export interface PixelArtGIFRenderOptions extends PixelArtRenderOptions {
  iterations?: number | 'infinite';
}

export interface PixelArtDataUrlOptions extends PixelArtGIFRenderOptions {
  format: PixelArtRenderMode;
}

export interface PixelArtMountOptions extends PixelArtRenderOptions {
  autoplay?: boolean;
  render?: PixelArtRenderMode;
  interactive?: boolean;
  holdDelayMs?: number;
}

export interface PixelArtPlayOptions {
  iterations?: number | 'infinite';
}

export interface PixelArtPixelPosition {
  x: number;
  y: number;
}

export interface PixelArtPixel {
  frameIndex: number;
  x: number;
  y: number;
}

export interface PixelArtPixelMutation {
  x: number;
  y: number;
  paletteIndex: number;
}

export interface PixelArtPixelChange extends PixelArtPixel {
  previousIndex: number;
  paletteIndex: number;
}

export interface PixelArtPixelEventDetail extends PixelArtPixel {
  previousIndex?: number;
  paletteIndex: number;
  sourceX: number;
  sourceY: number;
  pointerId: number;
  button: number;
  hasPixel: boolean;
}

export interface PixelArtController {
  getCurrentFrame(): number;
  getPixel(frameIndex: number, x: number, y: number): number;
  setPixel(frameIndex: number, x: number, y: number, paletteIndex: number): void;
  setPixels(frameIndex: number, updates: readonly PixelArtPixelMutation[]): void;
  play(options?: PixelArtPlayOptions): void;
  pause(): void;
  stop(): void;
  seek(frameIndex: number): void;
  update(nextDocument: PixelScriptDocument, nextOptions?: PixelArtMountOptions): void;
  destroy(): void;
}

export interface PixelScriptSchemaDocument {
  $schema: string;
  $id: string;
  title: string;
  type: 'object';
  additionalProperties: boolean;
  required: string[];
  properties: Record<string, unknown>;
}

export interface PixelScriptValidationResult {
  valid: boolean;
  errors: string[];
}
