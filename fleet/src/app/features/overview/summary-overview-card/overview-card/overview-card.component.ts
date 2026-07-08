import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FvTimeService } from '../../../../shared/services/fv-time.service';

@Component({
  selector: 'app-overview-card',
    standalone: false,
  templateUrl: './overview-card.component.html',
  styleUrls: ['./overview-card.component.css'],
  // ใช้ OnPush ดีมากครับ! ช่วยให้การ์ดไม่ถูก Re-render พร่ำเพรื่อ
  changeDetection: ChangeDetectionStrategy.OnPush 
})
export class OverviewCardComponent {

  // แก้ไขโค้ดแดง: เติมชนิดข้อมูล (Type) ให้กับตัวแปรที่ใส่ ? (Optional)
  // หากรู้ชัดเจนว่าเป็นข้อความให้ใช้ string, เป็นตัวเลขใช้ number 
  // แต่ถ้ายังไม่แน่ใจสามารถใส่ any ไว้ก่อนได้ครับ
  @Input() lastSeen?: any;
  @Input() speed?: number;
  @Input() vesselName?: string;
  @Input() vesselDesc?: string;
  @Input() distance?: number;
  @Input() lat?: number;
  @Input() long?: number;
  @Input() fuelCons?: number;
  @Input() id?: string | number;
  @Input() image?: string;
  @Input() prefix?: string;

  constructor(public fvTimeService: FvTimeService) { }

  // ลบ ngOnChanges และ ngOnInit ที่ว่างเปล่าออกไป เพื่อความสะอาดของโค้ด
}