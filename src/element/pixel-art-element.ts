import { mountPixelArt } from '@/dom/mount';
import { parseDocument } from '@/core/document';
import type { PixelArtController, PixelArtMountOptions, PixelScriptDocument } from '@/schema/types';

const HTMLElementBase = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class PixelArtElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ['src', 'data', 'render', 'scale', 'fps', 'loop', 'autoplay'];
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
    const loop = this.getAttribute('loop');
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

    if (loop !== null) {
      options.loop = loop !== 'false';
    }

    return options;
  }
}
