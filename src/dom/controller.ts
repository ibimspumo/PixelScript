import { paintBrowserCanvas, renderCanvas } from '@/renderers/canvas';
import { renderDataURL } from '@/renderers/data-url';
import { resolveDocumentData, totalAnimationDuration } from '@/renderers/internal';
import { renderSVG } from '@/renderers/svg';
import type {
  PixelArtController,
  PixelArtMountOptions,
  PixelArtPlayOptions,
  PixelScriptDocument
} from '@/schema/types';

type MountedNode = HTMLCanvasElement | SVGSVGElement | HTMLImageElement;

export class PixelArtRuntimeController implements PixelArtController {
  private documentData: PixelScriptDocument;
  private options: PixelArtMountOptions;
  private mountedNode: MountedNode | null = null;
  private framePngCache: Promise<string>[] | null = null;
  private currentFrame = 0;
  private playbackTimer: number | null = null;
  private runToken = 0;

  constructor(private readonly host: HTMLElement, document: PixelScriptDocument, options: PixelArtMountOptions = {}) {
    this.documentData = document;
    this.options = options;
    void this.renderFrame(this.currentFrame);

    if (options.autoplay && document.frames.length > 1) {
      this.play();
    }
  }

  play(options: PixelArtPlayOptions = {}): void {
    const iterations = options.iterations ?? (this.effectiveLoop() ? 'infinite' : 1);
    this.clearPlayback();
    this.runToken += 1;
    const token = this.runToken;

    if (this.renderMode() === 'gif') {
      void this.playGif(iterations, token);
      return;
    }

    let cyclesRemaining = iterations === 'infinite' ? Number.POSITIVE_INFINITY : iterations;

    const step = async () => {
      if (token !== this.runToken) {
        return;
      }

      await this.renderFrame(this.currentFrame);
      const resolved = resolveDocumentData(this.documentData, this.options);
      const duration = resolved.frames[this.currentFrame]!.durationMs;

      this.playbackTimer = window.setTimeout(() => {
        if (token !== this.runToken) {
          return;
        }

        if (this.currentFrame === this.documentData.frames.length - 1) {
          cyclesRemaining = Number.isFinite(cyclesRemaining) ? cyclesRemaining - 1 : cyclesRemaining;

          if (cyclesRemaining <= 0) {
            this.dispatchCompletion();
            return;
          }

          this.currentFrame = 0;
        } else {
          this.currentFrame += 1;
        }

        void step();
      }, duration);
    };

    void step();
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
    void this.renderFrame(this.currentFrame);

    if (this.options.autoplay && nextDocument.frames.length > 1) {
      this.play();
    }
  }

  destroy(): void {
    this.clearPlayback();
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

  private async renderFrame(frameIndex: number): Promise<void> {
    this.currentFrame = frameIndex;
    const mode = this.renderMode();

    if (mode === 'canvas') {
      const canvas = renderCanvas(this.documentData, {
        ...this.options,
        frame: frameIndex
      });

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

    if (mode === 'svg') {
      const template = document.createElement('template');
      template.innerHTML = renderSVG(this.documentData, {
        ...this.options,
        frame: frameIndex
      });
      const node = template.content.firstElementChild;

      if (!(node instanceof SVGSVGElement)) {
        throw new Error('SVG renderer did not return an <svg> element.');
      }

      this.mountNode(node);
      return;
    }

    const image = this.ensureImageNode();
    image.src = await this.getPngFrame(frameIndex);
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

    this.host.replaceChildren(node);
    this.mountedNode = node;
  }

  private getPngFrame(frameIndex: number): Promise<string> {
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

    return this.framePngCache[frameIndex]!;
  }

  private renderMode(): NonNullable<PixelArtMountOptions['render']> {
    return this.options.render ?? 'canvas';
  }

  private effectiveLoop(): boolean {
    return this.options.loop ?? this.documentData.animation?.loop ?? false;
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
}
