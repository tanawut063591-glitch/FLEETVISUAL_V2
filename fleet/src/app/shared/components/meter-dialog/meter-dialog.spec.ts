import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDialog } from './meter-dialog';

describe('MeterDialog', () => {
  let component: MeterDialog;
  let fixture: ComponentFixture<MeterDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
