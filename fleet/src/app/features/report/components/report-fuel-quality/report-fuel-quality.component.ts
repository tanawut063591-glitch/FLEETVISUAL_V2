import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ReportFuelQualityNotice } from '../../services/common/report-fuel-quality';

@Component({
  selector: 'app-report-fuel-quality',
  standalone: false,
  templateUrl: './report-fuel-quality.component.html',
  styleUrls: ['./report-fuel-quality.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFuelQualityComponent {
  @Input({ required: true }) notice!: ReportFuelQualityNotice;
}
