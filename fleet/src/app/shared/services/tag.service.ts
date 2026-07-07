import { Injectable } from "@angular/core";

@Injectable()
export class TagService {
  // เก็บ tag ที่ผู้ใช้เลือก
  public tagSelected: TagGroup[] = [];

  // เก็บ preset config
  public presetConfig: any[] = [];

  // เก็บ point / พิกัดของเรือแต่ละลำ
  public points: Point[] = [];

  constructor() {}

  // เลือก / ยกเลิก tag
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

  // เพิ่ม tag ที่เลือก และกันข้อมูลซ้ำ
  private addTagSelected(groupNames: string[], tagName: string): void {
    const exists = this.tagSelected.some((item: TagGroup) => {
      return this.isSameTag(item, groupNames, tagName);
    });

    if (!exists) {
      this.tagSelected.push(new TagGroup(groupNames, tagName));
    }
  }

  // ลบ tag ที่ถูกยกเลิก
  private removeTagSelected(groupNames: string[], tagName: string): void {
    this.tagSelected = this.tagSelected.filter((item: TagGroup) => {
      return !this.isSameTag(item, groupNames, tagName);
    });
  }

  // ล้าง tag ที่เลือกทั้งหมด
  clearTagSelected(): void {
    this.tagSelected = [];
  }

  // เก็บ preset config
  setPresetConfig(res: any[]): void {
    this.presetConfig = Array.isArray(res) ? res : [];
  }

  // เพิ่ม / อัปเดต point ของเรือ
  addPoint(prefix: string, points: any[]): void {
    const safePrefix = this.normalizePrefix(prefix);

    if (!safePrefix) {
      return;
    }

    const safePoints = Array.isArray(points) ? points : [];
    const index = this.getPointIndex(safePrefix);

    // ถ้ายังไม่มี prefix นี้ ให้เพิ่มใหม่
    if (index === -1) {
      this.points.push(new Point(safePrefix, safePoints));
      return;
    }

    // ถ้ามีอยู่แล้ว ให้อัปเดตข้อมูลใหม่แทนการเพิ่มซ้ำ
    this.points[index].points = safePoints;
  }

  // เช็กว่ามี point ของเรือลำนี้แล้วหรือยัง
  hasPoint(prefix: string): boolean {
    return this.getPointIndex(prefix) > -1;
  }

  // ดึง point ของเรือตาม prefix
  getPoint(prefix: string): any[] {
    const index = this.getPointIndex(prefix);

    if (index === -1) {
      return [];
    }

    return this.points[index].points;
  }

  // ล้าง point ทั้งหมด
  clearPoints(): void {
    this.points = [];
  }

  // ลบ point ของเรือตาม prefix
  removePoint(prefix: string): void {
    const safePrefix = this.normalizePrefix(prefix);

    if (!safePrefix) {
      return;
    }

    this.points = this.points.filter((item: Point) => {
      return item.prefix !== safePrefix;
    });
  }

  // ดึงชื่อ tag แบบปลอดภัย
  private getTagName(tag: any): string {
    if (!tag || !tag.name) {
      return "";
    }

    return String(tag.name).trim();
  }

  // ดึงชื่อ group แบบปลอดภัย
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

  // เช็กว่าเป็น tag เดียวกันไหม
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

  // เช็กว่า group เดียวกันไหม
  private isSameGroup(groupA: string[], groupB: string[]): boolean {
    const a = Array.isArray(groupA) ? groupA.join("|") : "";
    const b = Array.isArray(groupB) ? groupB.join("|") : "";

    return a === b;
  }

  // หา index ของ point ตาม prefix
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

  // จัด prefix ให้ปลอดภัย
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
