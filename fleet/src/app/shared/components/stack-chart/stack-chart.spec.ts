import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StackChart } from './stack-chart';

describe('StackChart', () => {
  let component: StackChart;
  let fixture: ComponentFixture<StackChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StackChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StackChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
