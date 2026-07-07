import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterTable } from './filter-table';

describe('FilterTable', () => {
  let component: FilterTable;
  let fixture: ComponentFixture<FilterTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilterTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
