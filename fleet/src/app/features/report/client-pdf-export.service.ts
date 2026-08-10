import { Injectable } from '@angular/core';

interface CapturedPdfImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ClientPdfExportOptions {
  fileName: string;
  backgroundColor?: string;
  scale?: number;
  imageQuality?: number;
  maxPages?: number;
}

export interface ClientPdfExportResult {
  pageCount: number;
  sizeBytes: number;
}

/**
 * Creates a multi-page A4 PDF entirely in the browser.
 *
 * The Report page deliberately uses client-side rendering for the live export:
 * - no report-generation request is sent to SCReportingService;
 * - pages are captured sequentially to keep peak memory predictable;
 * - a hard page limit prevents an accidental oversized browser job;
 * - the temporary canvases are released immediately after each page.
 */
@Injectable({ providedIn: 'root' })
export class ClientPdfExportService {
  private exportInProgress = false;

  async exportElements(
    elements: readonly HTMLElement[],
    options: ClientPdfExportOptions
  ): Promise<ClientPdfExportResult> {
    if (this.exportInProgress) {
      throw new Error('EXPORT_ALREADY_RUNNING');
    }

    const maxPages = this.clampInteger(options.maxPages ?? 40, 1, 60);
    const pages = elements.filter(Boolean).slice(0, maxPages);
    if (!pages.length) {
      throw new Error('NO_EXPORT_PAGES');
    }

    this.exportInProgress = true;

    try {
      // Dynamic loading keeps html2canvas out of the initial Report route chunk.
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const scale = this.clampNumber(options.scale ?? 1.5, 1, 2);
      const quality = this.clampNumber(options.imageQuality ?? 0.9, 0.72, 0.95);
      const images: CapturedPdfImage[] = [];

      for (const element of pages) {
        const canvas = await html2canvas(element, {
          backgroundColor: options.backgroundColor ?? '#ffffff',
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          foreignObjectRendering: false,
          removeContainer: true,
          scrollX: 0,
          scrollY: -window.scrollY,
          windowWidth: Math.max(document.documentElement.clientWidth, element.scrollWidth),
          windowHeight: Math.max(document.documentElement.clientHeight, element.scrollHeight),
        });

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        images.push({
          bytes: this.decodeDataUrl(dataUrl),
          width: canvas.width,
          height: canvas.height,
        });

        // Release backing-store memory before capturing the next page.
        canvas.width = 1;
        canvas.height = 1;
      }

      const pdfBytes = this.buildImagePdf(images);
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      this.downloadBlob(blob, options.fileName);

      return {
        pageCount: images.length,
        sizeBytes: blob.size,
      };
    } finally {
      this.exportInProgress = false;
    }
  }

  private buildImagePdf(images: CapturedPdfImage[]): Uint8Array {
    const pageWidth = 595.276; // A4 width in PDF points
    const pageHeight = 841.89; // A4 height in PDF points
    const objectCount = 2 + images.length * 3;
    const offsets = new Array<number>(objectCount + 1).fill(0);
    const chunks: Uint8Array[] = [];
    let byteLength = 0;

    const appendBytes = (value: Uint8Array): void => {
      chunks.push(value);
      byteLength += value.byteLength;
    };

    const appendText = (value: string): void => {
      appendBytes(this.ascii(value));
    };

    const appendObject = (id: number, body: Array<string | Uint8Array>): void => {
      offsets[id] = byteLength;
      appendText(`${id} 0 obj\n`);
      body.forEach((part) => (typeof part === 'string' ? appendText(part) : appendBytes(part)));
      appendText('\nendobj\n');
    };

    appendBytes(
      new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // %PDF-1.4
        0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, // binary marker
      ])
    );

    appendObject(1, ['<< /Type /Catalog /Pages 2 0 R >>']);

    const pageIds = images.map((_image, index) => 3 + index * 3);
    appendObject(2, [
      `<< /Type /Pages /Count ${images.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(' ')}] >>`,
    ]);

    images.forEach((image, index) => {
      const pageId = 3 + index * 3;
      const imageId = pageId + 1;
      const contentId = pageId + 2;
      const imageName = `Im${index + 1}`;
      const placement = this.fitInsidePage(image.width, image.height, pageWidth, pageHeight);
      const content = [
        'q',
        `${this.pdfNumber(placement.width)} 0 0 ${this.pdfNumber(placement.height)} ${this.pdfNumber(
          placement.x
        )} ${this.pdfNumber(placement.y)} cm`,
        `/${imageName} Do`,
        'Q',
        '',
      ].join('\n');
      const contentBytes = this.ascii(content);

      appendObject(pageId, [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pdfNumber(
          pageWidth
        )} ${this.pdfNumber(pageHeight)}] `,
        `/Resources << /ProcSet [/PDF /ImageC] /XObject << /${imageName} ${imageId} 0 R >> >> `,
        `/Contents ${contentId} 0 R >>`,
      ]);

      appendObject(imageId, [
        `<< /Type /XObject /Subtype /Image /Width ${Math.max(1, Math.round(image.width))} `,
        `/Height ${Math.max(1, Math.round(image.height))} /ColorSpace /DeviceRGB `,
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.byteLength} >>\nstream\n`,
        image.bytes,
        '\nendstream',
      ]);

      appendObject(contentId, [
        `<< /Length ${contentBytes.byteLength} >>\nstream\n`,
        contentBytes,
        'endstream',
      ]);
    });

    const xrefOffset = byteLength;
    appendText(`xref\n0 ${objectCount + 1}\n`);
    appendText('0000000000 65535 f \n');
    for (let id = 1; id <= objectCount; id += 1) {
      appendText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    }
    appendText(
      `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    );

    const output = new Uint8Array(byteLength);
    let cursor = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, cursor);
      cursor += chunk.byteLength;
    });
    return output;
  }

  private fitInsidePage(
    imageWidth: number,
    imageHeight: number,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number; width: number; height: number } {
    const safeWidth = Math.max(1, imageWidth);
    const safeHeight = Math.max(1, imageHeight);
    const imageRatio = safeWidth / safeHeight;
    const pageRatio = pageWidth / pageHeight;

    if (imageRatio >= pageRatio) {
      const height = pageWidth / imageRatio;
      return { x: 0, y: (pageHeight - height) / 2, width: pageWidth, height };
    }

    const width = pageHeight * imageRatio;
    return { x: (pageWidth - width) / 2, y: 0, width, height: pageHeight };
  }

  private decodeDataUrl(dataUrl: string): Uint8Array {
    const marker = 'base64,';
    const markerIndex = dataUrl.indexOf(marker);
    if (markerIndex < 0) {
      throw new Error('INVALID_CANVAS_IMAGE');
    }

    const binary = atob(dataUrl.slice(markerIndex + marker.length));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  private downloadBlob(blob: Blob, requestedFileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.safeFileName(requestedFileName);
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }

  private safeFileName(value: string): string {
    const cleaned = String(value || 'fleet-live-daily-report')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140);
    return `${cleaned || 'fleet-live-daily-report'}.pdf`.replace(/\.pdf\.pdf$/i, '.pdf');
  }

  private ascii(value: string): Uint8Array {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  private pdfNumber(value: number): string {
    return Number(value.toFixed(3)).toString();
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  private clampInteger(value: number, min: number, max: number): number {
    return Math.round(this.clampNumber(value, min, max));
  }
}
