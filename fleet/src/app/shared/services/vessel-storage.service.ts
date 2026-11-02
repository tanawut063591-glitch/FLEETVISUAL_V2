import { Injectable } from '@angular/core';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root',
})
export class VesselStorageService {
  private readonly storageKeys = [
    // Report-specific selection comes first so a browser refresh restores the exact
    // vessel that was open on Report instead of an older selection from another page.
    'reportVessel',
    'selectedVessel',
    'realtimeVessel',
    'pastTrackVessel',
    'activeVessel',
  ];

  constructor(private securityService: SecurityService) {}

  setSelectedVessel(vessel: any, key = 'selectedVessel'): void {
    if (!vessel || this.isExcludedVessel(vessel)) {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(vessel));
    } catch {}
  }

  getStoredVessel(): any | null {
    for (const key of this.storageKeys) {
      const vessel = this.getVesselByKey(key);

      if (vessel && !this.isExcludedVessel(vessel)) {
        return vessel;
      }
    }

    return null;
  }

  getStoredVesselName(): string {
    return this.extractVesselName(this.getStoredVessel());
  }

  extractVesselName(vessel: any): string {
    if (!vessel) {
      return '';
    }

    return String(
      vessel?.fvInfo?.name ||
        vessel?.fv?.name ||
        vessel?.name ||
        vessel?.Name ||
        vessel?.vesselName ||
        vessel?.VesselName ||
        vessel?.shipName ||
        vessel?.ShipName ||
        vessel?.id ||
        vessel?.Id ||
        '',
    ).trim();
  }

  private isExcludedVessel(vessel: any): boolean {
    const sources = [vessel, vessel?.fv, vessel?.fvInfo, vessel?.vessel];
    return sources.some((source) => source &&
      [source.name, source.Name, source.prefix, source.id, source.vesselName]
        .some((value) => value && this.securityService.isExcludedVessel(String(value))));
  }

  private getVesselByKey(key: string): any | null {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
