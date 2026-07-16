import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';

import { DateRangePreset, DateRangeSelection } from '../../models/date-range.model';
import { DateRangeService } from '../../services/date-range.service';

@Component({
  selector: 'app-date-range-toolbar',
  templateUrl: './date-range-toolbar.component.html',
  styleUrls: ['./date-range-toolbar.component.css'],
  standalone: false,
})
export class DateRangeToolbarComponent implements AfterViewInit {
  @Input() initialPreset: Exclude<DateRangePreset, 'custom'> = '24h';
  @Input() disabled = false;
  @Input() showThreeDays = true;
  @Input() showThirtyDays = false;
  @Input() storageKey = '';
  @Input() applyLabel = 'Apply';
  @Input() busyLabel = 'Loading';
  @Input() busy = false;
  @Input() showApplyButton = true;
  @Output() rangeChange = new EventEmitter<DateRangeSelection>();
  @Output() validationError = new EventEmitter<string>();
  @Output() applied = new EventEmitter<DateRangeSelection>();

  preset: DateRangePreset = '24h';
  startInput = '';
  endInput = '';

  constructor(private dateRanges: DateRangeService) {}

  ngAfterViewInit(): void {
    const restored = this.restore();
    if (!restored) {
      this.setPreset(this.initialPreset, false);
    }

    queueMicrotask(() => this.emitSelection(this.preset !== 'custom'));
  }

  setPreset(preset: DateRangePreset, emit = true): void {
    this.preset = preset;
    if (preset !== 'custom') {
      const selection = this.dateRanges.createPreset(preset);
      this.startInput = selection.startInput;
      this.endInput = selection.endInput;
    }

    if (emit) this.emitSelection(false);
  }

  markCustom(): void {
    this.preset = 'custom';
  }

  apply(): void {
    const selection = this.emitSelection(false);
    if (selection) this.applied.emit(selection);
  }

  getSelection(refreshPreset = true): DateRangeSelection | null {
    try {
      if (refreshPreset && this.preset !== 'custom') {
        const latest = this.dateRanges.createPreset(this.preset);
        this.startInput = latest.startInput;
        this.endInput = latest.endInput;
        return latest;
      }

      return this.dateRanges.createCustom(this.startInput, this.endInput, this.preset);
    } catch (error) {
      this.validationError.emit(error instanceof Error ? error.message : 'Invalid date range.');
      return null;
    }
  }

  private emitSelection(refreshPreset: boolean): DateRangeSelection | null {
    const selection = this.getSelection(refreshPreset);
    if (!selection) return null;
    this.persist(selection);
    this.rangeChange.emit(selection);
    return selection;
  }

  private persist(selection: DateRangeSelection): void {
    if (!this.storageKey) return;
    try {
      localStorage.setItem(`fleet-date-range:${this.storageKey}`, JSON.stringify(selection));
    } catch {}
  }

  private restore(): boolean {
    if (!this.storageKey) return false;
    try {
      const raw = localStorage.getItem(`fleet-date-range:${this.storageKey}`);
      if (!raw) return false;
      const saved = JSON.parse(raw) as Partial<DateRangeSelection>;
      if (!saved.startInput || !saved.endInput || !saved.preset) return false;
      this.preset = saved.preset;
      this.startInput = saved.startInput;
      this.endInput = saved.endInput;
      return true;
    } catch {
      return false;
    }
  }
}
