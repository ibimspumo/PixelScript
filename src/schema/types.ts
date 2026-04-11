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
}

export interface PixelArtPlayOptions {
  iterations?: number | 'infinite';
}

export interface PixelArtController {
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
