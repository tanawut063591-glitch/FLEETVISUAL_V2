import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Highchart } from './highchart';

describe('Highchart', () => {
  let component: Highchart;
  let fixture: ComponentFixture<Highchart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Highchart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Highchart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
