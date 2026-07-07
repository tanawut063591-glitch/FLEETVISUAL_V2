import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircleProgress } from './circle-progress';

describe('CircleProgress', () => {
  let component: CircleProgress;
  let fixture: ComponentFixture<CircleProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CircleProgress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircleProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
