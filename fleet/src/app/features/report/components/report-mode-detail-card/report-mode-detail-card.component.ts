import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-report-mode-detail-card',
  standalone: false,
  templateUrl: './report-mode-detail-card.component.html',
  styleUrls: ['./report-mode-detail-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportModeDetailCardComponent {
  @Input() detail: any = null;
  @Input() modeRow: any = null;
  @Input() generatorLayout = false;
  @Input() numberedAuxiliaryLayout = false;
  @Input() showEngineLoad = false;

  get summary(): any {
    return this.detail?.summary || {};
  }

  get mainEngines(): any[] {
    return Array.isArray(this.summary?.mainEngines) ? this.summary.mainEngines : [];
  }

  get shafts(): any[] {
    return Array.isArray(this.summary?.shafts) ? this.summary.shafts : [];
  }

  get auxFuel(): any[] {
    return Array.isArray(this.summary?.auxFuel) ? this.summary.auxFuel : [];
  }

  get hasShafts(): boolean {
    return this.shafts.length > 0;
  }

  get hasMainEngines(): boolean {
    return this.mainEngines.length > 0;
  }

  get modeLabel(): string {
    return String(this.detail?.label || this.modeRow?.label || 'Operating Mode');
  }

  /**
   * A couple of legacy detail-page captions intentionally differ from the
   * compact Mode Summary labels on PDF page 2. Keep page-2 labels untouched
   * and mirror only the detail-page caption here.
   */
  get detailModeLabel(): string {
    if (this.modeLabel === 'Moored with another Vessel for transferring') {
      return 'Moored with another Vessel for transferring operation';
    }
    if (this.modeLabel === 'Dynamic Positioning (DP)') {
      return 'Dynamic Positioning';
    }
    return this.modeLabel;
  }

  format(value: unknown, decimals = 2): string {
    // Preserve literal legacy calculation outputs when the vessel service marks
    // them intentionally (e.g. SC RAJA shaft Average = NaN, SC EMERALD LPH = ∞).
    // Null/undefined still mean a structural blank and render as PDF-style zero.
    if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
    if (value === Number.POSITIVE_INFINITY) return '∞';
    if (value === Number.NEGATIVE_INFINITY) return '-∞';
    const parsed = value === null || value === undefined ? 0 : Number(value);
    const numeric = Number.isFinite(parsed) ? parsed : 0;
    return numeric.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  engineUtilization(row: any): number {
    const hours = Number(row?.runningHours);
    return Number.isFinite(hours) && hours > 0 ? (hours / 24) * 100 : 0;
  }

  shaftUtilization(row: any): number {
    const hours = Number(row?.runningHours);
    return Number.isFinite(hours) && hours > 0 ? (hours / 24) * 100 : 0;
  }

  shaftPerEngine(index: number): number {
    const engineHours = Number(this.mainEngines[index]?.runningHours);
    const shaftHours = Number(this.shafts[index]?.runningHours);
    if (!Number.isFinite(engineHours) || !Number.isFinite(shaftHours) || engineHours <= 0) return 0;
    return (shaftHours / engineHours) * 100;
  }

  generatorUtilization(row: any): number {
    const explicit = Number(row?.utilizationPercent);
    if (Number.isFinite(explicit)) return explicit;
    const hours = Number(row?.runningHours);
    return Number.isFinite(hours) && hours > 0 ? (hours / 24) * 100 : 0;
  }
}
