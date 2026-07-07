import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';

import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root',
})
export class FvRealtimeService {
  // timer สำหรับ refresh ข้อมูล realtime
  private timerSubscription: Subscription | null = null;

  // subscription โหลดไฟล์ dashboard.tag.json
  private tagFileSubscription: Subscription | null = null;

  // ค่าเวลา default ถ้าไม่มี interval ส่งเข้ามา
  private readonly defaultInterval = 5000;

  // เก็บ tag จาก dashboard.tag.json
  private realtimeTags: any[] = [];

  // เก็บ prefix เรือที่โหลดแล้ว กันโหลดซ้ำ
  private loadedVessels: string[] = [];

  // เก็บ payload ของเรือ active ล่าสุด
  private activePayload: any = null;

  private readonly realtimePayloadSource = new Subject<any>();

  readonly realtimePayload$: Observable<any> =
    this.realtimePayloadSource.asObservable();

  constructor(private http: HttpClientService) {}

  // เริ่มทำงาน Realtime Service
  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    this.loadRealtimeTags(safeInterval);
  }

  // โหลดไฟล์ dashboard.tag.json
  private loadRealtimeTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/dashboard.tag.json')
      .subscribe({
        next: (res: any) => {
          this.realtimeTags = this.mapRealtimeTags(res);
          this.startTimer(interval);
        },
        error: (error) => {
          console.error('[FvRealtimeService] load tags error:', error);
          this.resetData();
        },
      });
  }

  // แปลง tag จาก json ให้เป็น array ใช้งานง่าย
  private mapRealtimeTags(res: any): any[] {
    const tags: any[] = [];

    if (!res) {
      return tags;
    }

    Object.keys(res).forEach((groupKey: string) => {
      const group = res[groupKey];

      if (!group) {
        return;
      }

      Object.keys(group).forEach((tagKey: string) => {
        const tag = group[tagKey];

        if (tag?.name && tag?.tagName) {
          tags.push({
            name: tag.name,
            tagName: tag.tagName,
            cal: tag.cal,
          });
        }
      });
    });

    return tags;
  }

  // เริ่ม timer สำหรับ refresh ข้อมูล realtime
  private startTimer(interval: number): void {
    this.timerSubscription = timer(interval, interval).subscribe(() => {
      this.tick();
    });
  }

  // refresh ข้อมูล realtime ซ้ำตามเวลา
  private tick(): void {
    if (this.activePayload) {
      this.realtimePayloadSource.next(this.activePayload);
    }
  }

  // ใช้สำหรับ set เรือ active จาก component ภายนอก
  setActiveVessel(vessel: any): void {
    const payload = this.generateTags(vessel);

    if (!payload) {
      return;
    }

    this.activePayload = payload;
    this.realtimePayloadSource.next(payload);
  }

  // โหลดข้อมูลเรือแบบหน่วงเวลา กันยิงพร้อมกันเยอะเกินไป
  setDelay(offset: number, vessel: any): void {
    const delay = Math.max(offset, 1) * 100;

    setTimeout(() => {
      if (!vessel?.fvInfo?.prefix && !vessel?.prefix) {
        return;
      }

      const prefix = vessel?.fvInfo?.prefix || vessel?.prefix;
      const isLoaded = this.loadedVessels.includes(prefix);

      if (isLoaded) {
        return;
      }

      this.loadedVessels.push(prefix);

      const payload = this.generateTags(vessel);

      if (payload) {
        this.activePayload = payload;
        this.realtimePayloadSource.next(payload);
      }
    }, delay);
  }

  // สร้าง tag จริงของเรือ เช่น BOAT01-VES-GPS-SPEED
  private generateTags(vessel: any): any {
    if (!vessel) {
      return null;
    }

    const fvInfo = vessel?.fvInfo || vessel;
    const prefix = fvInfo?.prefix;

    if (!prefix) {
      return null;
    }

    if (!this.realtimeTags || this.realtimeTags.length === 0) {
      return null;
    }

    const tags = this.realtimeTags.map((tag) => ({
      name: tag.name,
      tagName: `${prefix}-${tag.tagName}`,
      cal: tag.cal,
    }));

    if (tags.length === 0) {
      return null;
    }

    return {
      tags,
      fv: fvInfo,
    };
  }

  // หยุด service และยกเลิก subscription ทั้งหมด
  stop(): void {
    this.timerSubscription?.unsubscribe();
    this.tagFileSubscription?.unsubscribe();

    this.timerSubscription = null;
    this.tagFileSubscription = null;
  }

  // เคลียร์ข้อมูลเก่า กัน tag ซ้ำ / เรือโหลดค้าง
  private resetData(): void {
    this.realtimeTags = [];
    this.loadedVessels = [];
    this.activePayload = null;
  }
}