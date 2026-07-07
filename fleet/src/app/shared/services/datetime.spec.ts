import { TestBed } from '@angular/core/testing';

import { Datetime } from './datetime';

describe('Datetime', () => {
  let service: Datetime;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Datetime);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
