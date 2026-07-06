import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InverterDialog } from './inverter-dialog';

describe('InverterDialog', () => {
  let component: InverterDialog;
  let fixture: ComponentFixture<InverterDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InverterDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InverterDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
