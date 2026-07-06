import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';

import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root',
})
export class FvOverviewService {
  // เก็บ timer สำหรับ refresh ข้อมูล Overview
  private timerSubscription: Subscription | null = null;

  // เก็บ subscription ตอนโหลดไฟล์ overview.tag.json
  private tagFileSubscription: Subscription | null = null;

  // ค่าเวลา default ถ้าไม่ได้ส่ง interval มา
  private readonly defaultInterval = 5000;

  // เก็บ tag จาก overview.tag.json
  private overviewTags: any[] = [];

  // เก็บข้อมูลที่พร้อมส่งไปโหลด Overview
  private overviewDatas: any[] = [];

  private readonly overviewPayloadSource = new Subject<any[]>();

  readonly overviewPayload$: Observable<any[]> =
    this.overviewPayloadSource.asObservable();

  constructor(private http: HttpClientService) {}

  // เริ่มทำงานของ Overview Service
  start(interval?: number): void {
    this.stop();
    this.resetData();

    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    this.loadOverviewTags(safeInterval);
  }

  // โหลดไฟล์ overview.tag.json
  private loadOverviewTags(interval: number): void {
    this.tagFileSubscription = this.http
      .getJsonFile('/assets/tags/overview.tag.json')
      .subscribe({
        next: (res: any) => {
          this.overviewTags = this.mapOverviewTags(res);
          this.startTimer(interval);
        },
        error: (error) => {
          console.error('[FvOverviewService] load tags error:', error);
          this.resetData();
        },
      });
  }

  // แปลง tag จาก json ให้เป็นรูปแบบที่ใช้งานง่าย
  private mapOverviewTags(res: any): any[] {
    if (!res) {
      return [];
    }

    return Object.keys(res)
      .map((key: string) => {
        const tag = res[key];

        return {
          name: tag?.name || '',
          tagName: tag?.tagName || '',
          cal: tag?.cal,
        };
      })
      .filter((tag) => tag.name && tag.tagName);
  }

  // เริ่ม timer เพื่อ refresh ข้อมูล Overview ซ้ำตามเวลา
  private startTimer(interval: number): void {
    this.timerSubscription = timer(interval, interval).subscribe(() => {
      this.tick();
    });
  }

  // สั่งส่งข้อมูล Overview ซ้ำ
  private tick(): void {
    if (this.overviewDatas.length > 0) {
      this.overviewPayloadSource.next(this.overviewDatas);
    }
  }

  // ใช้สำหรับ set ข้อมูลเรือจาก component ภายนอก
  setVessels(fvInfos: any[]): void {
    if (!Array.isArray(fvInfos) || fvInfos.length === 0) {
      this.overviewDatas = [];
      this.overviewPayloadSource.next([]);
      return;
    }

    this.overviewDatas = this.buildOverviewDatas(fvInfos);

    if (this.overviewDatas.length > 0) {
      this.overviewPayloadSource.next(this.overviewDatas);
    }
  }

  // สร้างข้อมูล Overview สำหรับเรือทุกลำ
  private buildOverviewDatas(fvInfos: any[]): any[] {
    return fvInfos
      .map((fv) => this.generateTags(fv))
      .filter((payload) => payload !== null);
  }

  // สร้าง tag จริงของเรือ เช่น BOAT01-VES-GPS-SPEED
  private generateTags(fv: any): any {
    if (!fv) {
      return null;
    }

    const fvInfo = fv?.fvInfo || fv;
    const prefix = fvInfo?.prefix;

    if (!prefix) {
      return null;
    }

    if (!this.overviewTags || this.overviewTags.length === 0) {
      return null;
    }

    const tags = this.overviewTags.map((tag) => ({
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

  // หยุด Service และเคลียร์ subscription ทั้งหมด
  stop(): void {
    this.timerSubscription?.unsubscribe();
    this.tagFileSubscription?.unsubscribe();

    this.timerSubscription = null;
    this.tagFileSubscription = null;
  }

  // เคลียร์ข้อมูลเก่า กัน tag ซ้ำ / data ซ้ำ
  private resetData(): void {
    this.overviewTags = [];
    this.overviewDatas = [];
  }
}