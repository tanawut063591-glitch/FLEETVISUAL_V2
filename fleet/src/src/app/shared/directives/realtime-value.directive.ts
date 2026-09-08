import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';

import { RealtimeInput } from '../models/realtime-value.model';

@Directive({
  selector: '[appRealtimeValue]',
  standalone: false,
})
export class RealtimeValueDirective implements OnChanges {
  @Input('appRealtimeValue') value: RealtimeInput = null;
  @Input() digits = 2;
  @Input() fallback = '0.00';

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['digits'] || changes['fallback']) {
      this.updateText();
    }
  }

  private updateText(): void {
    const text = this.displayNumber(this.value, this.digits, this.fallback);
    this.renderer.setProperty(this.elementRef.nativeElement, 'textContent', text);
  }

  private displayNumber(input: RealtimeInput, digits = 2, fallback = '0.00'): string {
    const value = this.getNumber(input);

    if (value === null) {
      return fallback;
    }

    return value.toFixed(digits);
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
