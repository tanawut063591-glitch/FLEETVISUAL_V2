import { Injectable } from '@angular/core';

import { OfficialReportArchiveEntry } from './official-report-library.service';

export type ReportPdfCacheSource = 'local-archive' | 'server';

export interface ReportPdfCacheValue {
  blob: Blob;
  source: ReportPdfCacheSource;
  archiveEntry: OfficialReportArchiveEntry | null;
  fileName: string;
}

interface ReportPdfCacheEntry extends ReportPdfCacheValue {
  cachedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ReportPdfCacheService {
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly maxEntries = 3;
  private readonly maxCacheBlobBytes = 25 * 1024 * 1024;
  private readonly maxTotalCacheBytes = 32 * 1024 * 1024;
  private readonly entries = new Map<string, ReportPdfCacheEntry>();

  get(key: string): ReportPdfCacheValue | null {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.entries.get(normalizedKey);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.entries.delete(normalizedKey);
      return null;
    }

    this.entries.delete(normalizedKey);
    this.entries.set(normalizedKey, entry);

    return {
      blob: entry.blob,
      source: entry.source,
      archiveEntry: entry.archiveEntry,
      fileName: entry.fileName,
    };
  }

  set(key: string, value: ReportPdfCacheValue): void {
    const normalizedKey = this.normalizeKey(key);
    const blob = value?.blob;

    if (!normalizedKey || !blob || blob.size <= 0 || blob.size > this.maxCacheBlobBytes) {
      return;
    }

    this.entries.delete(normalizedKey);
    this.entries.set(normalizedKey, {
      blob,
      source: value.source,
      archiveEntry: value.archiveEntry,
      fileName: String(value.fileName || '').trim(),
      cachedAt: Date.now(),
    });

    this.pruneToBudget();
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneToBudget(): void {
    let totalBytes = this.totalCachedBytes();

    while (
      this.entries.size > this.maxEntries ||
      (totalBytes > this.maxTotalCacheBytes && this.entries.size > 1)
    ) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }

      const oldest = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      totalBytes -= oldest?.blob?.size || 0;
    }
  }

  private totalCachedBytes(): number {
    let total = 0;
    for (const entry of this.entries.values()) {
      total += entry.blob.size;
    }
    return total;
  }

  private normalizeKey(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }
}
