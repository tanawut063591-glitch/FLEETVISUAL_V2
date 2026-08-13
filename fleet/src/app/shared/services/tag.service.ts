import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class TagService {

  public tagSelected: TagGroup[] = [];


  public presetConfig: any[] = [];


  public points: Point[] = [];

  constructor() {}


  setActive(tag: any, group: any): void {
    const tagName = this.getTagName(tag);
    const groupNames = this.getGroupNames(group);

    if (!tagName) {
      return;
    }

    if (tag && tag.check) {
      this.addTagSelected(groupNames, tagName);
    } else {
      this.removeTagSelected(groupNames, tagName);
    }
  }


  private addTagSelected(groupNames: string[], tagName: string): void {
    const exists = this.tagSelected.some((item: TagGroup) => {
      return this.isSameTag(item, groupNames, tagName);
    });

    if (!exists) {
      this.tagSelected.push(new TagGroup(groupNames, tagName));
    }
  }


  private removeTagSelected(groupNames: string[], tagName: string): void {
    this.tagSelected = this.tagSelected.filter((item: TagGroup) => {
      return !this.isSameTag(item, groupNames, tagName);
    });
  }


  clearTagSelected(): void {
    this.tagSelected = [];
  }


  setPresetConfig(res: any[]): void {
    this.presetConfig = Array.isArray(res) ? res : [];
  }


  addPoint(prefix: string, points: any[]): void {
    const safePrefix = this.normalizePrefix(prefix);

    if (!safePrefix) {
      return;
    }

    const safePoints = Array.isArray(points) ? points : [];
    const index = this.getPointIndex(safePrefix);


    if (index === -1) {
      this.points.push(new Point(safePrefix, safePoints));
      return;
    }


    this.points[index].points = safePoints;
  }


  hasPoint(prefix: string): boolean {
    return this.getPointIndex(prefix) > -1;
  }


  getPoint(prefix: string): any[] {
    const index = this.getPointIndex(prefix);

    if (index === -1) {
      return [];
    }

    return this.points[index].points;
  }


  clearPoints(): void {
    this.points = [];
  }


  removePoint(prefix: string): void {
    const safePrefix = this.normalizePrefix(prefix);

    if (!safePrefix) {
      return;
    }

    this.points = this.points.filter((item: Point) => {
      return item.prefix !== safePrefix;
    });
  }


  private getTagName(tag: any): string {
    if (!tag || !tag.name) {
      return "";
    }

    return String(tag.name).trim();
  }


  private getGroupNames(group: any): string[] {
    if (!group) {
      return [];
    }

    if (Array.isArray(group)) {
      return group;
    }

    if (Array.isArray(group.group)) {
      return group.group;
    }

    if (group.group) {
      return [String(group.group)];
    }

    return [];
  }


  private isSameTag(
    item: TagGroup,
    groupNames: string[],
    tagName: string,
  ): boolean {
    if (!item || item.tags !== tagName) {
      return false;
    }

    return this.isSameGroup(item.group, groupNames);
  }


  private isSameGroup(groupA: string[], groupB: string[]): boolean {
    const a = Array.isArray(groupA) ? groupA.join("|") : "";
    const b = Array.isArray(groupB) ? groupB.join("|") : "";

    return a === b;
  }


  private getPointIndex(prefix: string): number {
    const safePrefix = this.normalizePrefix(prefix);

    if (!safePrefix) {
      return -1;
    }

    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].prefix === safePrefix) {
        return i;
      }
    }

    return -1;
  }


  private normalizePrefix(prefix: string): string {
    if (!prefix) {
      return "";
    }

    return String(prefix).trim();
  }
}

export class TagGroup {
  constructor(
    public group: string[],
    public tags: string,
  ) {}
}

export class Point {
  constructor(
    public prefix: string,
    public points: any[],
  ) {}
}
