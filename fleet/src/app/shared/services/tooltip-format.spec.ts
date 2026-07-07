import { TestBed } from '@angular/core/testing';

import { TooltipFormat } from './tooltip-format';

describe('TooltipFormat', () => {
  let service: TooltipFormat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TooltipFormat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
