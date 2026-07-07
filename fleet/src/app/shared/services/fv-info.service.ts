import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FvInfoService {
  // เก็บ timer ที่กำลังทำงานอยู่ เพื่อใช้หยุดภายหลัง
  private timerSubscription: Subscription | null = null;

  // ค่าเวลาเริ่มต้น ถ้าไม่ได้ส่ง interval มา
  private readonly defaultInterval = 5000;

  // ใช้ส่ง event ให้ component/service อื่นรู้ว่าถึงเวลา refresh แล้ว
  private readonly refreshSource = new Subject<void>();

  readonly refresh$: Observable<void> = this.refreshSource.asObservable();

  // เริ่มโหลดข้อมูลเรือตามเวลาที่กำหนด
  start(interval?: number): void {
    // กัน timer ซ้อน ถ้า start ถูกเรียกซ้ำ
    this.stop();

    // ถ้า interval ไม่ถูกต้อง ให้ใช้ค่า default แทน
    const safeInterval =
      interval && interval > 0 ? interval : this.defaultInterval;

    // เริ่มทำงานทันที และทำซ้ำตาม safeInterval
    this.timerSubscription = timer(0, safeInterval).subscribe(() => {
      this.tick();
    });
  }

  // หยุด timer ไม่ให้โหลดข้อมูลต่อ
  stop(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
  }

  // ส่งสัญญาณ refresh
  private tick(): void {
    this.refreshSource.next();
  }
}