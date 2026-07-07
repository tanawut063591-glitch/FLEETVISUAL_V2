import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelLayout } from './panel-layout';

describe('PanelLayout', () => {
  let component: PanelLayout;
  let fixture: ComponentFixture<PanelLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PanelLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
