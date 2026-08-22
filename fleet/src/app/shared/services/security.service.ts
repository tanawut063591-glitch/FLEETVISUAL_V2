import { Injectable } from '@angular/core';

interface Security {
  username: string;
  vesselNames: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  repo: Security[] = [];

  private readonly excludedVesselKeys = new Set<string>(['BAHTERA MAKMUR', 'BB MAKMUR']);

  test: string[] = [];

  bb_chevron: string[] = [];

  bb_ptt: string[] = [
    'BAHTERA INTAN',
    'BB TONGKAM',
    'BAHTERA ZAMRUD',
    'BAHTERA LAZURIT',
    'BB LIBERTY 233',
  ];

  sc_chevron: string[] = [
    'SC GLORY 2',
    'SC GLORY 6',
    'SC GLORY 7',
    'SC EMERALD',
    'SC BONGKOT',
    'SC BRAVE',
    'SC SULTAN',
    'SC RAJA',
  ];

  sc_ptt: string[] = [
    'SC PAILIN',
    'SC WINTER',
    'SC GLORY 1',
    'SC GLORY 3',
    'SC CHOLUEDEE',
    'SC CHOLRUEDEE',
    'SC BONGKOT',
  ];

  sc_scena: string[] = ['SC SULTAN', 'SC RAJA'];

  mv: string[] = ['MV GEMIA'];

  obsolete: string[] = ['BB BUSSARAKHAM'];

  chevron: string[] = this.getUniqueVessels([...this.sc_chevron, ...this.bb_chevron]);

  ptt: string[] = this.getUniqueVessels([...this.sc_ptt, ...this.bb_ptt]);

  bb: string[] = this.getUniqueVessels([...this.bb_chevron, ...this.bb_ptt]);

  sc: string[] = this.getUniqueVessels([...this.sc_chevron, ...this.sc_ptt]);

  all: string[] = this.getUniqueVessels([...this.chevron, ...this.ptt, ...this.test, ...this.mv]);

  constructor() {
    this.clearExcludedStoredSelections();

    this.addPermission('scbrave', ['SC BRAVE']);
    this.addPermission('scemerald', ['SC EMERALD']);
    this.addPermission('scglory2', ['SC GLORY 2']);
    this.addPermission('scglory6', ['SC GLORY 6']);
    this.addPermission('scglory7', ['SC GLORY 7']);
    this.addPermission('scsultan', ['SC SULTAN']);
    this.addPermission('scraja', ['SC RAJA']);

    this.addPermission('bbkaimook', ['BB KAIMOOK']);

    this.addPermission('systemadmin', this.all);
    this.addPermission('sat', this.all);
    this.addPermission('chatri', this.all);

    this.addPermission('sc', this.sc_chevron);

    this.addPermission('bbuser', this.bb);
    this.addPermission('scuser', this.sc);
    this.addPermission('chevronuser', this.chevron);
    this.addPermission('pttuser', this.ptt);
    this.addPermission('scenauser', this.sc_scena);

    this.addPermission('pttsc', this.sc_ptt);

    this.addPermission('mvuser', this.mv);
    this.addPermission('mvgemia', ['MV GEMIA']);
  }

  private clearExcludedStoredSelections(): void {
    const storageKeys = ['selectedVessel', 'realtimeVessel', 'pastTrackVessel'];

    storageKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;

        const stored = JSON.parse(raw);
        const candidates = [
          stored?.name,
          stored?.prefix,
          stored?.id,
          stored?.fv?.name,
          stored?.fv?.prefix,
          stored?.fv?.id,
          stored?.fvInfo?.name,
          stored?.fvInfo?.prefix,
          stored?.fvInfo?.id,
        ];

        if (candidates.some((value) => this.isExcludedVessel(String(value || '')))) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  }

  isExcludedVessel(vesselNameOrPrefix: string): boolean {
    const normalized = String(vesselNameOrPrefix || '')
      .trim()
      .toUpperCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

    return this.excludedVesselKeys.has(normalized);
  }

  hasAccess(vesselName: string): boolean {
    const username = localStorage.getItem('username');

    if (!username || !vesselName || this.isExcludedVessel(vesselName)) {
      return false;
    }

    const safeUsername = username.trim().toLowerCase();
    const safeVesselName = this.normalizeVesselName(vesselName);

    return this.repo.some((item) => {
      if (!item.username || !Array.isArray(item.vesselNames)) {
        return false;
      }

      return (
        item.username.toLowerCase() === safeUsername && item.vesselNames.includes(safeVesselName)
      );
    });
  }

  getAccessibleVessels(username?: string | null): string[] {
    const currentUsername = username || localStorage.getItem('username') || '';

    if (!currentUsername) {
      return [];
    }

    const safeUsername = currentUsername.trim().toLowerCase();

    const permission = this.repo.find((item) => item.username.toLowerCase() === safeUsername);

    return (permission?.vesselNames ?? []).filter((name) => !this.isExcludedVessel(name));
  }

  private addPermission(username: string, vesselNames: string[]): void {
    if (!username || !Array.isArray(vesselNames)) {
      return;
    }

    this.repo.push({
      username: username.trim().toLowerCase(),
      vesselNames: this.getUniqueVessels(vesselNames),
    });
  }

  private normalizeVesselName(vesselName: string): string {
    return vesselName ? vesselName.trim().toUpperCase() : '';
  }

  private getUniqueVessels(vesselNames: string[]): string[] {
    if (!Array.isArray(vesselNames) || vesselNames.length === 0) {
      return [];
    }

    const result: string[] = [];

    vesselNames.forEach((name) => {
      const safeName = this.normalizeVesselName(name);

      if (safeName && !this.isExcludedVessel(safeName) && !result.includes(safeName)) {
        result.push(safeName);
      }
    });

    return result;
  }
}
