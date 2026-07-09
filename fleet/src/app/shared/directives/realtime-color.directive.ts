import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

import { RealtimeInput } from '../models/realtime-value.model';

@Directive({
  selector: '[appRealtimeColor]',
  standalone: false,
})
export class RealtimeColorDirective implements OnChanges {
  @Input('appRealtimeColor') value: RealtimeInput = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.updateColor();
    }
  }

  private updateColor(): void {
    const element = this.elementRef.nativeElement;
    const value = this.getNumber(this.value);

    this.renderer.removeClass(element, 'realtime-running');
    this.renderer.removeClass(element, 'realtime-stopped');
    this.renderer.removeClass(element, 'realtime-idle');
    this.renderer.removeClass(element, 'realtime-nodata');

    if (value === null) {
      this.renderer.addClass(element, 'realtime-nodata');
      return;
    }

    if (value > 0) {
      this.renderer.addClass(element, 'realtime-running');
      return;
    }

    this.renderer.addClass(element, 'realtime-stopped');
  }

  private getNumber(input: RealtimeInput): number | null {
    if (input === null || input === undefined || input === '') {
      return null;
    }

    const rawValue = typeof input === 'object' ? input.value : input;

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return null;
    }

    if (value === 999999 || value === -999999) {
      return 0;
    }

    return value;
  }
}
