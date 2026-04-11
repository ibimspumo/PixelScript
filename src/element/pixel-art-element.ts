import { mountPixelArt } from '@/dom/mount';
import { parseDocument } from '@/core/document';
import type { PixelArtController, PixelArtMountOptions, PixelArtPixelMutation, PixelScriptDocument } from '@/schema/types';

const HTMLElementBase = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class PixelArtElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return [
      'src',
      'data',
      'render',
      'scale',
      'fps',
      'loop',
      'autoplay',
      'rotate',
      'flip-x',
      'flip-y',
      'brightness',
      'contrast',
      'alpha',
      'tint',
      'tint-amount',
      'interactive',
      'hold-delay'
    ];
  }

  private controller: PixelArtController | null = null;
  private propertyDocument: PixelScriptDocument | null = null;
  private currentDocument: PixelScriptDocument | null = null;
  private loadToken = 0;
  private readonly rootNode: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        line-height: 0;
      }

      .surface {
        display: inline-block;
      }
    `;
    this.rootNode = document.createElement('div');
    this.rootNode.className = 'surface';
    shadow.append(style, this.rootNode);
  }

  connectedCallback(): void {
    void this.refresh();
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
    this.controller = null;
  }

  attributeChangedCallback(): void {
    void this.refresh();
  }

  get document(): PixelScriptDocument | null {
    return this.propertyDocument ?? this.currentDocument;
  }

  getPixel(x: number, y: number, frameIndex?: number): number | null {
    if (!this.controller) {
      return null;
    }

    const index = frameIndex ?? this.controller.getCurrentFrame();
    return this.controller.getPixel(index, x, y);
  }

  setPixel(x: number, y: number, paletteIndex: number, frameIndex?: number): void {
    if (!this.controller) {
      return;
    }

    const index = frameIndex ?? this.controller.getCurrentFrame();
    this.controller.setPixel(index, x, y, paletteIndex);
  }

  setPixels(
    updates: ReadonlyArray<Pick<PixelArtPixelMutation, 'x' | 'y' | 'paletteIndex'>>,
    frameIndex?: number
  ): void {
    if (!this.controller) {
      return;
    }

    const index = frameIndex ?? this.controller.getCurrentFrame();
    this.controller.setPixels(index, updates);
  }

  set document(value: PixelScriptDocument | null) {
    this.propertyDocument = value ? parseDocument(value) : null;
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const token = ++this.loadToken;

    try {
      const document = await this.resolveDocument();

      if (token !== this.loadToken || !document) {
        return;
      }

      this.currentDocument = document;

      if (!this.controller) {
        this.controller = mountPixelArt(this.rootNode, document, this.readOptions());
        return;
      }

      this.controller.update(document, this.readOptions());
    } catch (error) {
      this.dispatchEvent(new CustomEvent('pixelscript:error', { detail: error }));
      throw error;
    }
  }

  play(iterations?: number | 'infinite'): void {
    if (iterations === undefined) {
      this.controller?.play();
      return;
    }

    this.controller?.play({ iterations });
  }

  pause(): void {
    this.controller?.pause();
  }

  stop(): void {
    this.controller?.stop();
  }

  seek(frameIndex: number): void {
    this.controller?.seek(frameIndex);
  }

  private async resolveDocument(): Promise<PixelScriptDocument | null> {
    if (this.propertyDocument) {
      return this.propertyDocument;
    }

    const src = this.getAttribute('src');

    if (src) {
      const response = await fetch(src);

      if (!response.ok) {
        throw new Error(`Failed to load PixelScript document from ${src}.`);
      }

      return parseDocument(await response.text());
    }

    const data = this.getAttribute('data');

    if (data) {
      return parseDocument(data);
    }

    return null;
  }

  private readOptions(): PixelArtMountOptions {
    const scale = this.getAttribute('scale');
    const fps = this.getAttribute('fps');
    const rotate = this.getAttribute('rotate');
    const loop = this.getAttribute('loop');
    const flipX = this.getAttribute('flip-x');
    const flipY = this.getAttribute('flip-y');
    const brightness = this.getAttribute('brightness');
    const contrast = this.getAttribute('contrast');
    const alpha = this.getAttribute('alpha');
    const tint = this.getAttribute('tint');
    const tintAmount = this.getAttribute('tint-amount');
    const options: PixelArtMountOptions = {
      render: (this.getAttribute('render') as PixelArtMountOptions['render']) ?? 'canvas',
      autoplay: this.hasAttribute('autoplay')
    };

    if (scale) {
      options.scale = Number.parseInt(scale, 10);
    }

    if (fps) {
      options.fps = Number.parseFloat(fps);
    }

    if (rotate !== null) {
      options.transform = {
        rotate: Number.parseInt(rotate, 10) as 0 | 90 | 180 | 270
      };
    }

    if (flipX !== null) {
      options.transform = {
        ...(options.transform ?? {}),
        flipX: flipX !== 'false'
      };
    }

    if (flipY !== null) {
      options.transform = {
        ...(options.transform ?? {}),
        flipY: flipY !== 'false'
      };
    }

    if (brightness !== null) {
      const value = Number.parseFloat(brightness);

      if (Number.isNaN(value)) {
        throw new TypeError('brightness must be a number.');
      }

      options.color = {
        ...(options.color ?? {}),
        brightness: value
      };
    }

    if (contrast !== null) {
      const value = Number.parseFloat(contrast);

      if (Number.isNaN(value)) {
        throw new TypeError('contrast must be a number.');
      }

      options.color = {
        ...(options.color ?? {}),
        contrast: value
      };
    }

    if (alpha !== null) {
      const value = Number.parseFloat(alpha);

      if (Number.isNaN(value)) {
        throw new TypeError('alpha must be a number.');
      }

      options.color = {
        ...(options.color ?? {}),
        alpha: value
      };
    }

    if (tint !== null) {
      options.color = {
        ...(options.color ?? {}),
        tint
      };
    }

    if (tintAmount !== null) {
      const value = Number.parseFloat(tintAmount);

      if (Number.isNaN(value)) {
        throw new TypeError('tint-amount must be a number.');
      }

      options.color = {
        ...(options.color ?? {}),
        tintAmount: value
      };
    }

    const interactive = this.getAttribute('interactive');
    if (interactive !== null) {
      options.interactive = interactive !== 'false';
    }

    const holdDelay = this.getAttribute('hold-delay');
    if (holdDelay !== null) {
      const value = Number.parseFloat(holdDelay);

      if (Number.isNaN(value)) {
        throw new TypeError('hold-delay must be a number.');
      }

      options.holdDelayMs = value;
    }

    if (loop !== null) {
      options.loop = loop !== 'false';
    }

    return options;
  }
}
