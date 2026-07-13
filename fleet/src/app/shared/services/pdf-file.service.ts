import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PdfFileService {
  isValidPdfBlob(blob: Blob | null | undefined): blob is Blob {
    return !!blob && blob.size > 50;
  }

  createObjectUrl(blob: Blob): string {
    return window.URL.createObjectURL(blob);
  }

  revokeObjectUrl(url: string | null): void {
    if (url) {
      window.URL.revokeObjectURL(url);
    }
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
    link.click();
    return true;
  }

  openNewTab(url: string | null): boolean {
    if (!url) {
      return false;
    }

    window.open(url, '_blank');
    return true;
  }

  private toSafeName(value: string): string {
    return value
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private todayText(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
