import { decodePixelsString, encodeIndices } from '@/constants/base64';
import { getPaletteColorCount } from '@/palette';
import { paintBrowserCanvas, renderCanvas } from '@/renderers/canvas';
import { renderDataURL } from '@/renderers/data-url';
import { resolveDocumentData, totalAnimationDuration } from '@/renderers/internal';
import { renderSVG } from '@/renderers/svg';
import type {
  PixelArtController,
  PixelArtMountOptions,
  PixelArtPixelEventDetail,
  PixelArtPixelMutation,
  PixelArtPlayOptions,
  PixelScriptDocument
} from '@/schema/types';

type MountedNode = HTMLCanvasElement | SVGSVGElement | HTMLImageElement;

type PixelRotation = 0 | 90 | 180 | 270;
type PixelMotionEvent = 'hover' | 'enter' | 'leave' | 'down' | 'up' | 'click' | 'drag' | 'hold';

type InteractionTransform = {
  rotate: PixelRotation;
  flipX: boolean;
  flipY: boolean;
};

interface InteractionPixel {
  frameIndex: number;
  displayX: number;
  displayY: number;
  sourceX: number;
  sourceY: number;
  paletteIndex: number;
}

interface InteractionSurface {
  frameIndex: number;
  displayWidth: number;
  displayHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  transform: InteractionTransform;
  indices: Uint8Array;
  scale: number;
}

interface PointerState {
  pointerId: number;
  lastPixel: InteractionPixel;
  moved: boolean;
  holdFired: boolean;
  holdTimeout: number | null;
}

export class PixelArtRuntimeController implements PixelArtController {
  private documentData: PixelScriptDocument;
  private options: PixelArtMountOptions;
  private mountedNode: MountedNode | null = null;
  private framePngCache: Promise<string>[] | null = null;
  private currentFrame = 0;
  private playbackTimer: number | null = null;
  private runToken = 0;
  private frameTimings: number[] = [];
  private interactionSurface: InteractionSurface | null = null;
  private interactionCanvas: HTMLCanvasElement | null = null;
  private hoveredPixel: InteractionPixel | null = null;
  private activePointer: PointerState | null = null;
  private readonly boundPointerDown = this.handlePointerDown.bind(this);
  private readonly boundPointerMove = this.handlePointerMove.bind(this);
  private readonly boundPointerUp = this.handlePointerUp.bind(this);
  private readonly boundPointerLeave = this.handlePointerLeave.bind(this);
  private readonly boundPointerCancel = this.handlePointerCancel.bind(this);

  constructor(private readonly host: HTMLElement, document: PixelScriptDocument, options: PixelArtMountOptions = {}) {
    this.documentData = document;
    this.options = options;
    void this.renderFrame(this.currentFrame);

    if (options.autoplay && document.frames.length > 1) {
      this.play();
    }
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getPixel(frameIndex: number, x: number, y: number): number {
    this.assertValidFrameIndex(frameIndex);

    const width = this.documentData.width;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= this.documentData.height) {
      throw new RangeError(`Pixel coordinates (${x}, ${y}) are outside this document (${width}x${this.documentData.height}).`);
    }

    const indices = decodePixelsString(this.documentData.frames[frameIndex]!.pixels);
    return indices[y * width + x]!;
  }

  setPixel(frameIndex: number, x: number, y: number, paletteIndex: number): void {
    this.setPixels(frameIndex, [{ x, y, paletteIndex }]);
  }

  setPixels(frameIndex: number, updates: readonly PixelArtPixelMutation[]): void {
    this.assertValidFrameIndex(frameIndex);

    const width = this.documentData.width;
    const height = this.documentData.height;
    const maxPaletteIndex = getPaletteColorCount(this.documentData.palette) - 1;
    const frame = this.documentData.frames[frameIndex]!;
    const indices = decodePixelsString(frame.pixels);
    const pending = new Map<
      number,
      {
        paletteIndex: number;
        previousIndex: number;
      }
    >();

    for (const update of updates) {
      const x = update.x;
      const y = update.y;
      const palette = update.paletteIndex;

      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        throw new TypeError('Pixel mutation x and y must be integers.');
      }

      if (x < 0 || y < 0 || x >= width || y >= height) {
        throw new RangeError(`Pixel coordinates (${x}, ${y}) are outside this document (${width}x${height}).`);
      }

      if (!Number.isInteger(palette) || palette < 0 || palette > maxPaletteIndex) {
        throw new RangeError(`Pixel mutation palette index must be between 0 and ${maxPaletteIndex}.`);
      }

      const offset = y * width + x;

      if (indices[offset] === palette) {
        continue;
      }

      pending.set(offset, {
        paletteIndex: palette,
        previousIndex: indices[offset]!
      });
    }

    if (pending.size === 0) {
      return;
    }

    for (const [offset, value] of pending) {
      indices[offset] = value.paletteIndex;
    }

    frame.pixels = encodeIndices(indices);

    for (const [offset, value] of pending) {
      this.dispatchPixelMutationEvent({
        frameIndex,
        x: offset % width,
        y: Math.floor(offset / width),
        sourceX: offset % width,
        sourceY: Math.floor(offset / width),
        paletteIndex: value.paletteIndex,
        previousIndex: value.previousIndex
      });
    }

    this.framePngCache = null;
    if (frameIndex === this.currentFrame) {
      void this.renderFrame(this.currentFrame);
    }
  }

  play(options: PixelArtPlayOptions = {}): void {
    const iterations = options.iterations ?? (this.effectiveLoop() ? 'infinite' : 1);
    this.clearPlayback();
    this.runToken += 1;
    const token = this.runToken;
    const frameTimings = this.resolveFrameTimings();
    const totalDuration = frameTimings.reduce((sum, duration) => sum + duration, 0);

    if (this.renderMode() === 'gif') {
      if (this.options.motion) {
        this.playWithTimeline(iterations, token, frameTimings, totalDuration);
        return;
      }

      void this.playGif(iterations, token);
      return;
    }

    this.playWithTimeline(iterations, token, frameTimings, totalDuration);
  }

  private playWithTimeline(
    iterations: number | 'infinite',
    token: number,
    frameTimings: number[],
    totalDuration: number
  ): void {
    if (totalDuration <= 0) {
      return;
    }

    let cyclesRemaining = iterations === 'infinite' ? Number.POSITIVE_INFINITY : iterations;
    const startTime = performance.now();

    const tick = () => {
      if (token !== this.runToken) {
        return;
      }

      const elapsed = performance.now() - startTime;
      const completedCycles = Math.floor(elapsed / totalDuration);

      if (Number.isFinite(cyclesRemaining) && completedCycles >= cyclesRemaining) {
        this.currentFrame = this.documentData.frames.length - 1;
        void this.renderFrame(this.currentFrame, totalDuration - 1);
        this.clearPlayback();
        this.dispatchCompletion();
        return;
      }

      const cycleTime = elapsed % totalDuration;
      const frameInfo = this.resolveFrameByTimeline(frameTimings, cycleTime);
      this.currentFrame = frameInfo.frameIndex;
      const options = this.options.motion ? cycleTime : undefined;
      void this.renderFrame(this.currentFrame, options);

      this.playbackTimer = window.requestAnimationFrame(tick);
    };

    tick();
  }

  private resolveFrameByTimeline(frameTimings: number[], cycleTime: number): { frameIndex: number } {
    let cursor = 0;

    for (let index = 0; index < frameTimings.length; index += 1) {
      const duration = frameTimings[index]!;
      if (cycleTime < cursor + duration) {
        return { frameIndex: index };
      }

      cursor += duration;
    }

    return { frameIndex: frameTimings.length - 1 };
  }

  private resolveFrameTimings(): number[] {
    const resolved = resolveDocumentData(this.documentData, this.options);
    this.frameTimings = resolved.frames.map((frame) => frame.durationMs);
    return this.frameTimings;
  }

  pause(): void {
    this.clearPlayback();

    if (this.renderMode() === 'gif') {
      void this.renderFrame(this.currentFrame);
    }
  }

  stop(): void {
    this.clearPlayback();
    this.currentFrame = 0;
    this.framePngCache = null;
    void this.renderFrame(0);
  }

  seek(frameIndex: number): void {
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= this.documentData.frames.length) {
      throw new RangeError(`Frame index must be between 0 and ${this.documentData.frames.length - 1}.`);
    }

    this.clearPlayback();
    this.currentFrame = frameIndex;
    void this.renderFrame(frameIndex);
  }

  update(nextDocument: PixelScriptDocument, nextOptions: PixelArtMountOptions = {}): void {
    this.clearPlayback();
    this.documentData = nextDocument;
    this.options = {
      ...this.options,
      ...nextOptions
    };
    this.currentFrame = Math.min(this.currentFrame, nextDocument.frames.length - 1);
    this.framePngCache = null;
    this.interactionSurface = null;
    this.hoveredPixel = null;
    this.clearActivePointer(false);
    void this.renderFrame(this.currentFrame);

    if (this.options.autoplay && nextDocument.frames.length > 1) {
      this.play();
    }
  }

  destroy(): void {
    this.clearPlayback();
    this.clearActivePointer(false);
    this.detachInteraction();
    this.host.replaceChildren();
    this.mountedNode = null;
  }

  private async playGif(iterations: number | 'infinite', token: number): Promise<void> {
    const node = this.ensureImageNode();
    const url = await renderDataURL(this.documentData, {
      ...this.options,
      format: 'gif',
      iterations
    });

    if (token !== this.runToken) {
      return;
    }

    node.src = url;
    node.width = this.documentData.width * (this.options.scale ?? 1);
    node.height = this.documentData.height * (this.options.scale ?? 1);

    if (iterations !== 'infinite') {
      this.playbackTimer = window.setTimeout(() => {
        this.currentFrame = this.documentData.frames.length - 1;
        this.clearPlayback();
        void this.renderFrame(this.currentFrame);
        this.dispatchCompletion();
      }, totalAnimationDuration(this.documentData, this.options) * iterations);
    }
  }

  private async renderFrame(frameIndex: number, motionTimeMs?: number): Promise<void> {
    this.currentFrame = frameIndex;
    const options = {
      ...this.options,
      frame: frameIndex,
      ...(motionTimeMs === undefined ? {} : { motionTimeMs })
    };
    const mode = this.renderMode();

    if (mode === 'canvas') {
      const resolved = resolveDocumentData(this.documentData, options);
      const frame = resolved.frames[frameIndex]!;
      this.interactionSurface = this.makeInteractionSurface(frameIndex, resolved, frame, this.options.scale ?? 1);
      const canvas = renderCanvas(this.documentData, options);

      if (canvas instanceof HTMLCanvasElement) {
        this.mountNode(canvas);
        return;
      }

      const fallbackCanvas = document.createElement('canvas');

      if ('data' in canvas) {
        paintBrowserCanvas(fallbackCanvas, canvas.width, canvas.height, new Uint8Array(canvas.data));
      } else {
        const dataUrl = 'toDataURL' in canvas ? (canvas as { toDataURL: () => string }).toDataURL() : '';
        const image = this.ensureImageNode();
        image.src = dataUrl;
        return;
      }

      this.mountNode(fallbackCanvas);
      return;
    }

    this.interactionSurface = null;
    this.clearActivePointer(false);
    this.detachInteraction();

    if (mode === 'svg') {
      const template = document.createElement('template');
      template.innerHTML = renderSVG(this.documentData, options);
      const node = template.content.firstElementChild;

      if (!(node instanceof SVGSVGElement)) {
        throw new Error('SVG renderer did not return an <svg> element.');
      }

      this.mountNode(node);
      return;
    }

    const image = this.ensureImageNode();
    image.src = await this.getPngFrame(frameIndex, motionTimeMs);
  }

  private makeInteractionSurface(
    frameIndex: number,
    resolved: ReturnType<typeof resolveDocumentData>,
    frame: { width: number; height: number; indices: Uint8Array },
    scale: number
  ): InteractionSurface {
    return {
      frameIndex,
      displayWidth: resolved.width * scale,
      displayHeight: resolved.height * scale,
      sourceWidth: this.documentData.width,
      sourceHeight: this.documentData.height,
      scale,
      transform: {
        rotate: resolved.options.transform.rotate,
        flipX: resolved.options.transform.flipX,
        flipY: resolved.options.transform.flipY
      },
      indices: frame.indices
    };
  }

  private ensureImageNode(): HTMLImageElement {
    if (this.mountedNode instanceof HTMLImageElement) {
      return this.mountedNode;
    }

    const image = document.createElement('img');
    image.decoding = 'async';
    image.alt = this.documentData.meta?.name ?? 'PixelScript art';
    image.style.display = 'block';
    image.style.imageRendering = 'pixelated';
    this.mountNode(image);
    return image;
  }

  private mountNode(node: MountedNode): void {
    if (this.mountedNode === node) {
      return;
    }

    this.detachInteraction();
    this.host.replaceChildren(node);
    this.mountedNode = node;
    this.attachInteraction();
  }

  private getPngFrame(frameIndex: number, motionTimeMs?: number): Promise<string> {
    if (!this.options.motion) {
      if (!this.framePngCache) {
        this.framePngCache = this.documentData.frames.map((_, index) =>
          Promise.resolve(
            renderDataURL(this.documentData, {
              ...this.options,
              format: 'png',
              frame: index
            })
          )
        );
      }

      return Promise.resolve(this.framePngCache[frameIndex]!);
    }

    if (!this.framePngCache) {
      this.framePngCache = this.documentData.frames.map((_, index) =>
        Promise.resolve(
          renderDataURL(this.documentData, {
            ...this.options,
            format: 'png',
            frame: index,
            ...(motionTimeMs === undefined ? {} : { motionTimeMs })
          })
        )
      );
    }

    if (motionTimeMs === undefined) {
      return Promise.resolve(this.framePngCache[frameIndex]!);
    }

    const frame = this.resolveFrameByTimeline(this.frameTimings, motionTimeMs);
    return Promise.resolve(
      renderDataURL(this.documentData, {
        ...this.options,
        format: 'png',
        frame: frame.frameIndex,
        motionTimeMs
      })
    );
  }

  private renderMode(): NonNullable<PixelArtMountOptions['render']> {
    return this.options.render ?? 'canvas';
  }

  private effectiveLoop(): boolean {
    return this.options.loop ?? this.documentData.animation?.loop ?? false;
  }

  private shouldHandleInteraction(): boolean {
    return this.options.interactive ?? true;
  }

  private clearPlayback(): void {
    this.runToken += 1;

    if (this.playbackTimer !== null) {
      window.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private dispatchCompletion(): void {
    this.host.dispatchEvent(new CustomEvent('pixelscript:complete', { bubbles: true, composed: true }));
  }

  private attachInteraction(): void {
    if (
      !this.interactionSurface ||
      this.renderMode() !== 'canvas' ||
      !this.shouldHandleInteraction() ||
      !(this.mountedNode instanceof HTMLCanvasElement)
    ) {
      return;
    }

    this.interactionCanvas = this.mountedNode;
    this.interactionCanvas.addEventListener('pointerdown', this.boundPointerDown);
    this.interactionCanvas.addEventListener('pointermove', this.boundPointerMove);
    this.interactionCanvas.addEventListener('pointerleave', this.boundPointerLeave);
    this.interactionCanvas.addEventListener('pointerenter', this.boundPointerMove);
    this.interactionCanvas.style.touchAction = 'none';
  }

  private detachInteraction(): void {
    if (!this.interactionCanvas) {
      return;
    }

    this.interactionCanvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.interactionCanvas.removeEventListener('pointermove', this.boundPointerMove);
    this.interactionCanvas.removeEventListener('pointerleave', this.boundPointerLeave);
    this.interactionCanvas.removeEventListener('pointerenter', this.boundPointerMove);
    this.interactionCanvas = null;

    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerCancel);
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.shouldHandleInteraction() || !this.interactionSurface || event.button !== 0) {
      return;
    }

    const hit = this.resolvePixelFromPointer(event);
    const pointerId = event.pointerId;

    this.interactionCanvas?.setPointerCapture?.(pointerId);
    this.clearActivePointer(true);

    this.activePointer = {
      pointerId,
      lastPixel: hit ?? this.createMissingPixel(),
      moved: false,
      holdFired: false,
      holdTimeout: null
    };

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerCancel);

    if (hit) {
      this.dispatchPixelEvent('down', hit, event);
      this.hoveredPixel = hit;
      this.activePointer.lastPixel = hit;
    } else {
      this.hoveredPixel = null;
    }

    const delayMs = this.options.holdDelayMs ?? 500;
    if (delayMs > 0 && hit !== null) {
      this.activePointer.holdTimeout = window.setTimeout(() => {
        if (this.activePointer && this.activePointer.pointerId === pointerId && !this.activePointer.moved && !this.activePointer.holdFired) {
          this.activePointer.holdFired = true;
          this.dispatchPixelEvent('hold', hit, event);
        }
      }, delayMs);
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.interactionSurface) {
      return;
    }

    const hit = this.resolvePixelFromPointer(event);

    if (this.activePointer !== null && event.pointerId === this.activePointer.pointerId) {
      if (!this.activePointer.moved && hit !== null && hit.displayX !== this.activePointer.lastPixel.displayX) {
        this.activePointer.moved = true;
        this.clearHoldTimer();
      }

      if (hit && (hit.displayX !== this.activePointer.lastPixel.displayX || hit.displayY !== this.activePointer.lastPixel.displayY)) {
        this.activePointer.lastPixel = hit;
        this.dispatchPixelEvent('drag', hit, event);
      }

      return;
    }

    if (!hit) {
      if (this.hoveredPixel !== null) {
        this.dispatchPixelEvent('leave', this.hoveredPixel, event);
        this.hoveredPixel = null;
      }

      return;
    }

    if (this.hoveredPixel === null || this.hoveredPixel.displayX !== hit.displayX || this.hoveredPixel.displayY !== hit.displayY) {
      if (this.hoveredPixel !== null) {
        this.dispatchPixelEvent('leave', this.hoveredPixel, event);
      }

      this.hoveredPixel = hit;
      this.dispatchPixelEvent('enter', hit, event);
    }

    this.dispatchPixelEvent('hover', hit, event);
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.activePointer || event.pointerId !== this.activePointer.pointerId) {
      return;
    }

    const hit = this.resolvePixelFromPointer(event);
    const activePixel = this.activePointer.lastPixel;

    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointercancel', this.boundPointerCancel);
    this.interactionCanvas?.releasePointerCapture?.(event.pointerId);

    if (hit && hit.displayX === activePixel.displayX && hit.displayY === activePixel.displayY && !this.activePointer.moved) {
      this.dispatchPixelEvent('click', hit, event);
    }

    if (activePixel) {
      const upPixel = hit ?? activePixel;
      this.dispatchPixelEvent('up', upPixel, event);
    }

    this.clearHoldTimer();
    this.activePointer = null;
    this.hoveredPixel = hit;
  }

  private handlePointerLeave(event: PointerEvent): void {
    if (this.hoveredPixel !== null) {
      this.dispatchPixelEvent('leave', this.hoveredPixel, event);
      this.hoveredPixel = null;
    }
  }

  private handlePointerCancel(event: PointerEvent): void {
    if (!this.activePointer || event.pointerId !== this.activePointer.pointerId) {
      return;
    }

    this.clearActivePointer(false);
  }

  private clearActivePointer(keepHoveredPixel: boolean): void {
    if (!this.activePointer) {
      return;
    }

    const pointerId = this.activePointer.pointerId;
    this.clearHoldTimer();
    this.activePointer = null;

    if (!keepHoveredPixel) {
      this.hoveredPixel = null;
    }

    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerCancel);
    this.interactionCanvas?.releasePointerCapture?.(pointerId);
  }

  private clearHoldTimer(): void {
    if (!this.activePointer || this.activePointer.holdTimeout === null) {
      return;
    }

    window.clearTimeout(this.activePointer.holdTimeout);
    this.activePointer.holdTimeout = null;
  }

  private resolvePixelFromPointer(event: PointerEvent): InteractionPixel | null {
    if (!this.interactionSurface || !this.interactionCanvas) {
      return null;
    }

    const rect = this.interactionCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const displayX = Math.floor(((event.clientX - rect.left) / rect.width) * this.interactionSurface.displayWidth);
    const displayY = Math.floor(((event.clientY - rect.top) / rect.height) * this.interactionSurface.displayHeight);

    if (displayX < 0 || displayY < 0 || displayX >= this.interactionSurface.displayWidth || displayY >= this.interactionSurface.displayHeight) {
      return null;
    }

    const displayIndex = displayY * this.interactionSurface.displayWidth + displayX;
    const paletteIndex = this.interactionSurface.indices[displayIndex] ?? 0;
    const { x: sourceX, y: sourceY } = this.resolveSourceCoordinates(
      displayX,
      displayY,
      this.interactionSurface.sourceWidth,
      this.interactionSurface.sourceHeight,
      this.interactionSurface.transform
    );

    return {
      frameIndex: this.interactionSurface.frameIndex,
      displayX,
      displayY,
      sourceX,
      sourceY,
      paletteIndex
    };
  }

  private resolveSourceCoordinates(
    displayX: number,
    displayY: number,
    sourceWidth: number,
    sourceHeight: number,
    transform: InteractionTransform
  ): { x: number; y: number } {
    const rotatedWidth = transform.rotate === 90 || transform.rotate === 270 ? sourceHeight : sourceWidth;
    const rotatedHeight = transform.rotate === 90 || transform.rotate === 270 ? sourceWidth : sourceHeight;

    let x = displayX;
    let y = displayY;

    if (transform.flipX) {
      x = rotatedWidth - 1 - x;
    }

    if (transform.flipY) {
      y = rotatedHeight - 1 - y;
    }

    switch (transform.rotate) {
      case 90:
        return {
          x: y,
          y: sourceHeight - 1 - x
        };
      case 180:
        return {
          x: sourceWidth - 1 - x,
          y: sourceHeight - 1 - y
        };
      case 270:
        return {
          x: sourceWidth - 1 - y,
          y: x
        };
      default:
        return { x, y };
    }
  }

  private dispatchPixelEvent(type: PixelMotionEvent, pixel: InteractionPixel, event: PointerEvent): void {
    const hasPixel = pixel.sourceX >= 0 && pixel.sourceY >= 0;

    this.host.dispatchEvent(
      new CustomEvent(`pixelscript:pixel-${type}`, {
        bubbles: true,
        composed: true,
        detail: {
          frameIndex: pixel.frameIndex,
          x: pixel.sourceX,
          y: pixel.sourceY,
          sourceX: pixel.sourceX,
          sourceY: pixel.sourceY,
          paletteIndex: hasPixel ? pixel.paletteIndex : 0,
          pointerId: event.pointerId,
          button: event.button,
          hasPixel
        } as PixelArtPixelEventDetail
      })
    );
  }

  private dispatchPixelMutationEvent(detail: Omit<PixelArtPixelEventDetail, 'pointerId' | 'button' | 'hasPixel'>): void {
    this.host.dispatchEvent(
      new CustomEvent('pixelscript:pixel-change', {
        bubbles: true,
        composed: true,
        detail: {
          sourceX: detail.x,
          sourceY: detail.y,
          pointerId: -1,
          button: -1,
          hasPixel: true,
          ...detail
        }
      })
    );
  }

  private createMissingPixel(): InteractionPixel {
    return {
      frameIndex: this.currentFrame,
      displayX: -1,
      displayY: -1,
      sourceX: -1,
      sourceY: -1,
      paletteIndex: 0
    };
  }

  private assertValidFrameIndex(frameIndex: number): void {
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= this.documentData.frames.length) {
      throw new RangeError(`Frame index must be between 0 and ${this.documentData.frames.length - 1}.`);
    }
  }
}
