import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonBox } from './skeleton-box';

describe('SkeletonBox', () => {
  let component: SkeletonBox;
  let fixture: ComponentFixture<SkeletonBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkeletonBox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
