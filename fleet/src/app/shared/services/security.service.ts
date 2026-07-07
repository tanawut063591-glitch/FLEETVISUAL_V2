import { Injectable } from '@angular/core';

interface Security {
  username: string;
  vesselNames: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private repo: Security[] = [];

  private test: string[] = [];

  private bbChevron: string[] = [];

  private bbPtt: string[] = [
    'BAHTERA MAKMUR',
    'BAHTERA INTAN',
    'BB TONGKAM',
    'BAHTERA ZAMRUD',
    'BAHTERA LAZURIT',
    'BB LIBERTY 233',
  ];

  private scChevron: string[] = [
    'SC GLORY 2',
    'SC GLORY 6',
    'SC GLORY 7',
    'SC EMERALD',
    'SC BONGKOT',
    'SC BRAVE',
    'SC SULTAN',
    'SC RAJA',
  ];

  private scPtt: string[] = [
    'SC PAILIN',
    'SC WINTER',
    'SC GLORY 1',
    'SC GLORY 3',
    'SC CHOLUEDEE',
    'SC CHOLRUEDEE',
    'SC BONGKOT',
  ];

  private scScena: string[] = [
    'SC SULTAN',
    'SC RAJA',
  ];

  private mv: string[] = [
    'MV GEMIA',
  ];

  private obsolete: string[] = [
    'BB BUSSARAKHAM',
  ];

  private chevron: string[] = this.getUniqueVessels([
    ...this.scChevron,
    ...this.bbChevron,
  ]);

  private ptt: string[] = this.getUniqueVessels([
    ...this.scPtt,
    ...this.bbPtt,
  ]);

  private bb: string[] = this.getUniqueVessels([
    ...this.bbChevron,
    ...this.bbPtt,
  ]);

  private sc: string[] = this.getUniqueVessels([
    ...this.scChevron,
    ...this.scPtt,
  ]);

  private all: string[] = this.getUniqueVessels([
    ...this.chevron,
    ...this.ptt,
    ...this.test,
    ...this.mv,
  ]);

  constructor() {
    this.initPermissions();
  }

  hasAccess(vesselName: string): boolean {
    const username = this.getCurrentUsername();

    if (!username || !vesselName) {
      return false;
    }

    const safeVesselName = this.normalizeVesselName(vesselName);

    return this.repo.some((item: Security) => {
      return (
        item.username === username &&
        item.vesselNames.includes(safeVesselName)
      );
    });
  }

  getAllowedVessels(): string[] {
    const username = this.getCurrentUsername();

    if (!username) {
      return [];
    }

    const permission = this.repo.find((item: Security) => {
      return item.username === username;
    });

    return permission ? permission.vesselNames : [];
  }

  filterAllowedVessels<T extends { name?: string; vesselName?: string; title?: string }>(
    vessels: T[]
  ): T[] {
    if (!Array.isArray(vessels)) {
      return [];
    }

    const allowedVessels = this.getAllowedVessels();

    if (allowedVessels.length === 0) {
      return [];
    }

    return vessels.filter((vessel: T) => {
      const vesselName =
        vessel.name ||
        vessel.vesselName ||
        vessel.title ||
        '';

      return allowedVessels.includes(this.normalizeVesselName(vesselName));
    });
  }

  private initPermissions(): void {
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

    this.addPermission('sc', this.scChevron);

    this.addPermission('bbuser', this.bb);
    this.addPermission('scuser', this.sc);
    this.addPermission('chevronuser', this.chevron);
    this.addPermission('pttuser', this.ptt);
    this.addPermission('scenauser', this.scScena);

    this.addPermission('pttsc', this.scPtt);

    this.addPermission('mvuser', this.mv);
    this.addPermission('mvgemia', ['MV GEMIA']);
  }

  private addPermission(username: string, vesselNames: string[]): void {
    const safeUsername = this.normalizeUsername(username);

    if (!safeUsername || !Array.isArray(vesselNames)) {
      return;
    }

    this.repo.push({
      username: safeUsername,
      vesselNames: this.getUniqueVessels(vesselNames),
    });
  }

  private getCurrentUsername(): string {
    return this.normalizeUsername(localStorage.getItem('username') || '');
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private normalizeVesselName(vesselName: string): string {
    return vesselName.trim().toUpperCase();
  }

  private getUniqueVessels(vesselNames: string[]): string[] {
    const result: string[] = [];

    vesselNames.forEach((name: string) => {
      const safeName = this.normalizeVesselName(name);

      if (safeName && !result.includes(safeName)) {
        result.push(safeName);
      }
    });

    return result;
  }
}