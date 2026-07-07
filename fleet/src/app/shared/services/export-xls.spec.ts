import { TestBed } from '@angular/core/testing';

import { ExportXls } from './export-xls';

describe('ExportXls', () => {
  let service: ExportXls;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportXls);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
