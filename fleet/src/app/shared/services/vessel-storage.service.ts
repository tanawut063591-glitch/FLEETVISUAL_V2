import { Injectable } from '@angular/core';

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

  setSelectedVessel(vessel: any, key = 'selectedVessel'): void {
    if (!vessel) {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(vessel));
    } catch {}
  }

  getStoredVessel(): any | null {
    for (const key of this.storageKeys) {
      const vessel = this.getVesselByKey(key);

      if (vessel) {
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
