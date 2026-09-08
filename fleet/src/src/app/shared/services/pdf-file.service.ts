import { Injectable } from '@angular/core';

export interface PdfValidationResult {
  valid: boolean;
  reason: 'ok' | 'empty' | 'too-small' | 'too-large' | 'invalid-signature' | 'read-failed';
}

@Injectable({
  providedIn: 'root',
})
export class PdfFileService {
  private readonly minimumPdfBytes = 100;
  private readonly maximumPdfBytes = 80 * 1024 * 1024;

  isValidPdfBlob(blob: Blob | null | undefined): blob is Blob {
    return !!blob && blob.size >= this.minimumPdfBytes && blob.size <= this.maximumPdfBytes;
  }

  async validatePdfBlob(blob: Blob | null | undefined): Promise<PdfValidationResult> {
    if (!blob) {
      return { valid: false, reason: 'empty' };
    }

    if (blob.size < this.minimumPdfBytes) {
      return { valid: false, reason: 'too-small' };
    }

    if (blob.size > this.maximumPdfBytes) {
      return { valid: false, reason: 'too-large' };
    }

    try {
      const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      const signature = String.fromCharCode(...header);
      return signature === '%PDF-'
        ? { valid: true, reason: 'ok' }
        : { valid: false, reason: 'invalid-signature' };
    } catch {
      return { valid: false, reason: 'read-failed' };
    }
  }

  createObjectUrl(blob: Blob): string {
    return window.URL.createObjectURL(blob);
  }

  revokeObjectUrl(url: string | null): void {
    if (url) {
      window.URL.revokeObjectURL(url);
    }
  }

  formatBytes(bytes: number): string {
    const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    const mb = safeBytes / 1024 / 1024;
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(safeBytes / 1024))} KB`;
  }

  formatBlobSize(blob: Blob | null | undefined): string {
    if (!blob) {
      return '-';
    }

    const mb = blob.size / 1024 / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${Math.max(1, Math.round(blob.size / 1024))} KB`;
  }

  buildFileName(vesselName: string, reportLabel: string, dateText: string): string {
    const safeVessel = this.toSafeName(vesselName || 'Fleet-Vessel');
    const safeReport = this.toSafeName(reportLabel || 'Report');
    const safeDate = this.toSafeName(dateText || this.todayText());

    return `${safeVessel}-${safeReport}-${safeDate}.pdf`;
  }

  download(url: string | null, fileName: string): boolean {
    if (!url) {
      return false;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'fleet-report.pdf';
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }

  openNewTab(url: string | null): boolean {
    if (!url) {
      return false;
    }

    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    return !!opened;
  }

  private toSafeName(value: string): string {
    return value
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120);
  }

  private todayText(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
