import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePickers } from './date-picker';

describe('DatePicker', () => {
  let component: DatePickers;
  let fixture: ComponentFixture<DatePickers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatePickers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatePickers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
