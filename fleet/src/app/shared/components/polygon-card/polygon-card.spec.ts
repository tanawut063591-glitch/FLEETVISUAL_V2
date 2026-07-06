import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolygonCard } from './polygon-card';

describe('PolygonCard', () => {
  let component: PolygonCard;
  let fixture: ComponentFixture<PolygonCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PolygonCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolygonCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
